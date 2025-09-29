const { google } = require('googleapis');
const Meeting = require('../models/Meeting');
const User = require('../models/User');

// Configure the Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * @desc    Get all meetings
 * @route   GET /api/meetings
 * @access  Admin
 */
exports.getAllMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({})
      .sort({ meetingDate: -1 })
      .populate('createdBy', 'name')
      .populate('host', 'name')
      .populate('participants', 'name');
    res.status(200).json(meetings);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @desc    Get meetings for a specific member
 * @route   GET /api/meetings/member/:userId
 * @access  Private
 */
exports.getMemberMeetings = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const meetings = await Meeting.find({
      participants: userId
    })
      .sort({ meetingDate: -1 })
      .populate('createdBy', 'name')
      .populate('host', 'name')
      .populate('participants', 'name');
    
    res.status(200).json(meetings);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @desc    Create a new meeting and generate a Google Meet link
 * @route   POST /api/meetings
 * @access  Admin
 */
exports.createMeeting = async (req, res) => {
  try {
    const { title, description, meetingDate, host, participants } = req.body;
    const adminUserId = req.user._id;

    const adminUser = await User.findById(adminUserId);
    if (!adminUser || !adminUser.googleTokens) {
      return res.status(400).json({ message: 'Admin has not connected their Google Account.' });
    }

    // Set the credentials for the API call
    oauth2Client.setCredentials(adminUser.googleTokens);
    
    // Refresh the access token if needed
    if (adminUser.googleTokens.expiry_date < Date.now()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        adminUser.googleTokens = credentials;
        await adminUser.save();
        oauth2Client.setCredentials(credentials);
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError);
        return res.status(400).json({ 
          message: 'Google authentication expired. Please reconnect your Google account.',
          requiresReauth: true
        });
      }
    }

    const calendar = google.calendar({ 
      version: 'v3', 
      auth: oauth2Client 
    });
    
    // Create the event on Google Calendar and request a conference link
    const event = {
      summary: title,
      description,
      start: { 
        dateTime: new Date(meetingDate).toISOString(),
        timeZone: 'Asia/Kolkata'
      },
      end: { 
        dateTime: new Date(new Date(meetingDate).getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: 'Asia/Kolkata'
      },
      conferenceData: {
        createRequest: { 
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        },
      },
    };

    // Insert the event with conference data
    const createdEvent = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      resource: event,
      sendNotifications: true,
    });

    // Get the generated Google Meet link from the API response
    const meetLink = createdEvent.data.hangoutLink;
    const googleEventId = createdEvent.data.id;

    // Save the meeting to your own database
    const newMeeting = new Meeting({
      title, 
      description, 
      meetingDate, 
      host, 
      participants,
      meetingLink: meetLink,
      googleEventId: googleEventId,
      createdBy: adminUserId,
    });

    const savedMeeting = await newMeeting.save();
    await savedMeeting.populate(['createdBy', 'host', 'participants'], 'name');
    res.status(201).json(savedMeeting);

  } catch (err) {
    console.error("Error creating Google Meet:", err);
    
    // Handle specific Google API errors
    if (err.code === 403) {
      return res.status(403).json({ 
        message: 'Insufficient permissions to create Google Meet. Please ensure your Google account has calendar permissions.',
        requiresReauth: true
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to create meeting', 
      error: err.message 
    });
  }
};

/**
 * @desc    Delete a meeting
 * @route   DELETE /api/meetings/:id
 * @access  Admin
 */
exports.deleteMeeting = async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
        
        await meeting.deleteOne();
        res.status(200).json({ message: 'Meeting deleted' });
    } catch(err) {
        res.status(500).json({ message: 'Server Error' });
    }
};