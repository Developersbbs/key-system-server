const Meeting = require("../models/Meeting");
const Activity = require("../models/Activity");
const MeetingLog = require("../models/MeetingLog");
const MeetingMom = require("../models/MeetingMom");
const Admin = require("../models/Admin");
const User = require("../models/User");
const zoomService = require('../services/zoomService');

// --- CREATE MEETING ---
exports.createMeeting = async (req, res) => {
  try {
    const { title, description, meetingDate, meetingLink, host, participants, zoomMeetingId, recordingLink, meetingType } = req.body;
    const adminUserId = req.user._id;

    // Validation
    if (!title || !meetingDate || !meetingLink) {
      return res.status(400).json({ message: "Title, Date, and Link are required." });
    }

    // Auto-detect meeting type if not provided
    let finalMeetingType = meetingType || 'manual';
    if (!meetingType && zoomMeetingId) {
      finalMeetingType = 'zoom';
    }

    const newMeeting = new Meeting({
      title,
      description: description || '',
      meetingDate,
      meetingLink,
      meetingType: finalMeetingType,
      host,
      participants,
      createdBy: adminUserId,
      zoomMeetingId, // Save Zoom ID
      recordingLink: recordingLink || '', // Save recording link
      momLink: req.body.momLink || '',
      engagementProof: req.body.engagementProof || ''
    });

    const savedMeeting = await newMeeting.save();
    await savedMeeting.populate(['createdBy', 'host', 'participants'], 'name');

    res.status(201).json(savedMeeting);
  } catch (err) {
    console.error("Error creating meeting:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// --- GET ALL MEETINGS ---
// --- GET ALL MEETINGS ---
exports.getAllMeetings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalDocs = await Meeting.countDocuments();
    const meetings = await Meeting.find({})
      .sort({ meetingDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name')
      .populate('host', 'name')
      .populate('participants', 'name');

    res.status(200).json({
      meetings,
      currentPage: page,
      totalPages: Math.ceil(totalDocs / limit),
      totalDocs
    });
  } catch (err) {
    console.error("Error fetching meetings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- GET MEMBER MEETINGS ---
exports.getMemberMeetings = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find meetings where the user is a participant
    const meetings = await Meeting.find({
      participants: userId
    })
      .sort({ meetingDate: -1 })
      .populate('createdBy', 'name')
      .populate('host', 'name')
      .populate('participants', 'name')
      .lean(); // Use lean() to get plain JS objects

    // Fetch attendance logs for this user for these meetings
    const meetingIds = meetings.map(m => m._id);
    const logs = await MeetingLog.find({
      userId: userId,
      meetingId: { $in: meetingIds }
    }).lean();

    // Map logs to meetings
    const meetingsWithLogs = meetings.map(meeting => {
      const log = logs.find(l => l.meetingId.toString() === meeting._id.toString());
      return {
        ...meeting,
        attendance: log ? {
          totalDuration: log.duration,
          firstJoinedAt: log.joinedAt,
          lastLeftAt: log.leftAt,
          sessions: log.joinSessions || []
        } : null
      };
    });

    res.status(200).json(meetingsWithLogs);
  } catch (err) {
    console.error("Error fetching member meetings:", err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- UPDATE MEETING ---
exports.updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const meeting = await Meeting.findByIdAndUpdate(id, updateData, { new: true })
      .populate('createdBy', 'name')
      .populate('host', 'name')
      .populate('participants', 'name');

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    res.json(meeting);
  } catch (err) {
    console.error("Error updating meeting:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// --- DELETE MEETING ---
exports.deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    await Meeting.findByIdAndDelete(id);
    res.json({ message: "Meeting deleted successfully" });
  } catch (err) {
    console.error("Error deleting meeting:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- JOIN MEETING ---
exports.joinMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userName = req.user.name;

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    // Check if user is a participant
    const isParticipant = meeting.participants.some(p => p.toString() === userId.toString());
    if (!isParticipant) {
      return res.status(403).json({ message: "You are not a participant of this meeting" });
    }

    // Check if user already has an attendance log for this meeting
    let meetingLog = await MeetingLog.findOne({
      meetingId: id,
      userId: userId
    });

    const currentJoinTime = new Date();

    if (meetingLog) {
      // User is rejoining - add new session to existing log
      meetingLog.joinSessions.push({
        joinedAt: currentJoinTime,
        leftAt: null,
        duration: 0
      });

      // Update the main leftAt to null (user is currently in meeting)
      meetingLog.leftAt = null;

      await meetingLog.save();
    } else {
      // First join - create new attendance log
      meetingLog = await MeetingLog.create({
        meetingId: id,
        userId: userId,
        userName: userName,
        joinedAt: currentJoinTime,
        leftAt: null,
        duration: 0,
        joinSessions: [{
          joinedAt: currentJoinTime,
          leftAt: null,
          duration: 0
        }]
      });
    }

    // Determine which link to return based on meeting status
    const meetingDate = new Date(meeting.meetingDate);
    const now = new Date();
    const isPastMeeting = meetingDate < now;

    // For past meetings, prefer recording link if available
    const linkToReturn = isPastMeeting && meeting.recordingLink
      ? meeting.recordingLink
      : meeting.meetingLink;

    return res.status(200).json({
      message: meetingLog.joinSessions.length > 1 ? "Rejoined meeting - attendance logged" : "Attendance logged",
      link: linkToReturn,
      isPastMeeting,
      hasRecording: !!meeting.recordingLink,
      sessionCount: meetingLog.joinSessions.length
    });
  } catch (err) {
    console.error("Error joining meeting:", err);
    return res.status(500).json({ message: "Server error logging attendance" });
  }
};

// --- LEAVE MEETING ---
exports.leaveMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find the meeting log for this user and meeting
    const meetingLog = await MeetingLog.findOne({
      meetingId: id,
      userId: userId
    });

    if (!meetingLog) {
      return res.status(404).json({ message: "Meeting log not found" });
    }

    // Find the most recent session without a leftAt time (active session)
    const activeSession = meetingLog.joinSessions
      .reverse()
      .find(session => !session.leftAt);

    if (!activeSession) {
      return res.status(400).json({ message: "No active session found" });
    }

    // Set leave time for the active session
    const leftAt = new Date();
    activeSession.leftAt = leftAt;

    // Calculate duration for this session in minutes
    const joinedAt = new Date(activeSession.joinedAt);
    const durationMs = leftAt - joinedAt;
    const sessionDuration = Math.round(durationMs / (1000 * 60));
    activeSession.duration = sessionDuration;

    // Update total cumulative duration
    meetingLog.duration = (meetingLog.duration || 0) + sessionDuration;

    // Update the main leftAt to the latest leave time
    meetingLog.leftAt = leftAt;

    // Reverse back the array to maintain original order
    meetingLog.joinSessions.reverse();

    await meetingLog.save();

    return res.status(200).json({
      message: "Leave time recorded",
      sessionDuration: sessionDuration,
      totalDuration: meetingLog.duration,
      sessionCount: meetingLog.joinSessions.length
    });
  } catch (err) {
    console.error("Error recording leave time:", err);
    return res.status(500).json({ message: "Server error recording leave time" });
  }
};

// --- GET MEETING ATTENDANCE DETAILS ---
exports.getMeetingAttendanceDetails = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const meetingLog = await MeetingLog.findOne({
      meetingId: id,
      userId: userId
    });

    if (!meetingLog) {
      return res.status(404).json({ message: "No attendance record found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        userName: meetingLog.userName,
        firstJoined: meetingLog.joinedAt,
        lastLeft: meetingLog.leftAt,
        totalDuration: meetingLog.duration,
        sessionCount: meetingLog.joinSessions.length,
        sessions: meetingLog.joinSessions.map((session, index) => ({
          sessionNumber: index + 1,
          joinedAt: session.joinedAt,
          leftAt: session.leftAt,
          duration: session.duration,
          status: session.leftAt ? 'Completed' : 'Active'
        }))
      }
    });
  } catch (err) {
    console.error("Error fetching attendance details:", err);
    return res.status(500).json({ message: "Server error fetching attendance details" });
  }
};

// --- GET MEETING LOGS ---
exports.getMeetingLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await MeetingLog.find({ meetingId: id })
      .populate('userId', 'name email')
      .sort({ joinedAt: -1 });
    return res.status(200).json({ logs });
  } catch (err) {
    console.error("Error fetching logs:", err);
    return res.status(500).json({ message: "Server error fetching logs" });
  }
};

// --- GENERATE ZOOM MEETING ---
exports.generateZoomMeeting = async (req, res) => {
  try {
    const { topic, startTime, duration, host } = req.body;

    console.log("Generate Zoom Request - Host ID:", host);
    console.log("Generate Zoom Request - Current User ID:", req.user?._id);

    let hostEmail = null;

    // 0. Check for System Default Host Email
    const SystemConfig = require('../models/SystemConfig');
    const config = await SystemConfig.getConfig();
    console.log("DEBUG: Fetched SystemConfig:", config);
    if (config.zoomHostEmail) {
      console.log("Using System Default Zoom Email:", config.zoomHostEmail);
      hostEmail = config.zoomHostEmail;
    }

    // 1. Try to find selected Host (only if no global override)
    if (!hostEmail && host) {
      // Try Admin collection first
      let adminHost = await Admin.findById(host);
      if (adminHost) {
        console.log("Found Host in Admin collection:", adminHost.email);
        hostEmail = adminHost.email;
      } else {
        // Try User collection
        let userHost = await User.findById(host);
        if (userHost) {
          console.log("Found Host in User collection:", userHost.email);
          hostEmail = userHost.email;
        }
      }
    }

    // 2. Fallback to current user if no host email found yet
    if (!hostEmail) {
      if (req.user && req.user.email) {
        console.log("Using Current User Email:", req.user.email);
        hostEmail = req.user.email;
      }
    }

    if (!hostEmail) {
      console.error("FAILED to find host email. Host ID:", host, "User ID:", req.user?._id);
      return res.status(400).json({ success: false, message: "Could not determine host email for Zoom meeting. Any selected host must be a valid user with an email address." });
    }

    const zoomMeeting = await zoomService.createZoomMeeting(topic, startTime, duration, hostEmail);
    console.log("DEBUG: Created Zoom Meeting Response:", JSON.stringify(zoomMeeting, null, 2));

    return res.status(200).json({
      success: true,
      data: {
        join_url: zoomMeeting.join_url,
        meeting_id: zoomMeeting.id,
        password: zoomMeeting.password
      }
    });
  } catch (error) {
    console.error("Error generating zoom meeting:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// --- SAVE MOM (NEW) ---
exports.saveMom = async (req, res) => {
  try {
    const { id } = req.params; // Meeting ID
    const userId = req.user._id;
    const { content } = req.body;

    const mom = await MeetingMom.findOneAndUpdate(
      { meetingId: id, userId: userId },
      { content: content },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Notes saved successfully',
      data: mom
    });
  } catch (error) {
    console.error("Error saving notes:", error);
    return res.status(500).json({ message: "Server error saving notes" });
  }
};

// --- GET MOM (NEW) ---
exports.getMom = async (req, res) => {
  try {
    const { id } = req.params; // Meeting ID
    const userId = req.user._id;

    const mom = await MeetingMom.findOne({ meetingId: id, userId: userId });

    return res.status(200).json({
      success: true,
      data: mom
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return res.status(500).json({ message: "Server error fetching notes" });
  }
};

// --- SYNC MEETING ATTENDANCE ---
exports.syncMeetingAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);

    if (!meeting || !meeting.zoomMeetingId) {
      return res.status(404).json({ message: "Meeting not found or not a Zoom meeting" });
    }

    const report = await zoomService.getMeetingParticipantsReport(meeting.zoomMeetingId);

    if (!report || !report.participants) {
      return res.status(400).json({ message: "Attendance report not available yet. (Wait for meeting to end)" });
    }

    console.log(`Syncing Attendance for Meeting ${id}. Found ${report.participants.length} raw participant entries.`);

    // 1. Group participants by User Identity (Email or Name)
    // We need to group because a single user might join multiple times (multiple rows in Zoom report)
    const participantsMap = new Map();

    for (const p of report.participants) {
      // Identity Key: Email (preferred) or Name
      const email = p.user_email ? p.user_email.toLowerCase().trim() : null;
      const name = p.name ? p.name.trim() : 'Unknown';
      const key = email || name; // Unique key for grouping

      if (!participantsMap.has(key)) {
        participantsMap.set(key, {
          email: email,
          name: name,
          sessions: []
        });
      }

      const entry = participantsMap.get(key);

      // Calculate session details
      const durationMinutes = Math.round((p.duration || 0) / 60);
      const joinedAt = p.join_time ? new Date(p.join_time) : new Date();
      const leftAt = p.leave_time ? new Date(p.leave_time) : undefined; // Zoom might not have leave_time for active?

      entry.sessions.push({
        joinedAt,
        leftAt,
        duration: durationMinutes
      });
    }

    let matchedCount = 0;
    let totalSynced = 0;

    // 2. Process each unique participant
    for (const [key, data] of participantsMap.entries()) {
      totalSynced++;

      // Sort sessions by joinedAt to find first join and last leave
      data.sessions.sort((a, b) => a.joinedAt - b.joinedAt);

      // Aggregate Data
      const firstJoinedAt = data.sessions[0].joinedAt;
      const lastLeftAt = data.sessions[data.sessions.length - 1].leftAt;

      // Total duration is sum of all session durations
      const totalDuration = data.sessions.reduce((acc, s) => acc + s.duration, 0);

      // Try to find matching DB User
      let user = null;
      if (data.email) {
        user = await User.findOne({
          $or: [
            { email: data.email },
            { zoomEmail: data.email }
          ]
        });
      }

      // Fallback: If name looks like an email, try matching against DB email
      if (!user && data.name.includes('@')) {
        const nameAsEmail = data.name.toLowerCase().trim();
        user = await User.findOne({
          $or: [
            { email: nameAsEmail },
            { zoomEmail: nameAsEmail }
          ]
        });
      }

      // Fallback: Match by Name if no email link found
      if (!user && data.name !== 'Unknown') {
        user = await User.findOne({ name: { $regex: new RegExp(`^${data.name}$`, 'i') } });
      }

      const updateData = {
        userName: user ? user.name : data.name,
        // We use Zoom data as authority for specific Zoom fields
        zoomDuration: totalDuration,
        zoomJoinedAt: firstJoinedAt,
        zoomLeftAt: lastLeftAt,
        // Also update main fields to reflect reality if this is a Zoom meeting
        duration: totalDuration,
        joinedAt: firstJoinedAt,
        leftAt: lastLeftAt,
        // The joinSessions array should reflect the Zoom sessions
        joinSessions: data.sessions
      };

      if (user) {
        console.log(`  ✅ Matched "${data.name}" (${data.email || 'no-email'}) → DB User: ${user.name}`);
        await MeetingLog.findOneAndUpdate(
          { meetingId: id, userId: user._id },
          { $set: updateData },
          { upsert: true, new: true }
        );
        matchedCount++;
      } else {
        console.log(`  ⚠️  No DB match for "${data.name}" (${data.email || 'no-email'}) — saving as guest`);
        // Update or Create by Name (if userId is null)
        await MeetingLog.findOneAndUpdate(
          { meetingId: id, userName: data.name, userId: null },
          { $set: updateData },
          { upsert: true, new: true }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: `Synced ${totalSynced} unique participants (${matchedCount} matched to DB users) from ${report.participants.length} session records.`,
      data: Array.from(participantsMap.values())
    });

  } catch (error) {
    console.error("Error syncing attendance:", error);
    return res.status(500).json({ message: "Server error syncing attendance" });
  }
};

// --- GET LEADERBOARD ---
exports.getLeaderboard = async (req, res) => {
  try {
    // Parallel Execution: Run both aggregations at once
    const [meetingCounts, activityCounts] = await Promise.all([
      // 1. Get Meeting Counts (Weight: 20)
      Meeting.aggregate([
        { $match: { meetingDate: { $lte: new Date() } } },
        { $group: { _id: "$host", count: { $sum: 1 } } }
      ]),
      // 2. Get Activity Counts (Weight: 5)
      Activity.aggregate([
        { $group: { _id: "$user", count: { $sum: 1 } } }
      ])
    ]);

    // 3. Create a Map to merge scores
    const userScores = {};

    // Process Meetings
    meetingCounts.forEach(item => {
      const userId = item._id ? item._id.toString() : null;
      if (userId) {
        if (!userScores[userId]) userScores[userId] = { meetingCount: 0, activityCount: 0, totalScore: 0 };
        userScores[userId].meetingCount = item.count;
        userScores[userId].totalScore += (item.count * 20);
      }
    });

    // Process Activities
    activityCounts.forEach(item => {
      const userId = item._id ? item._id.toString() : null;
      if (userId) {
        if (!userScores[userId]) userScores[userId] = { meetingCount: 0, activityCount: 0, totalScore: 0 };
        userScores[userId].activityCount = item.count;
        userScores[userId].totalScore += (item.count * 5);
      }
    });

    // 4. Sort User IDs by Total Score (Descending)
    // We do this BEFORE fetching user details to avoid fetching 1000s of unused user docs.
    const allUserIds = Object.keys(userScores);
    allUserIds.sort((a, b) => userScores[b].totalScore - userScores[a].totalScore);

    // 5. Pagination / Limit: Only take top 50 for the leaderboard view
    const topUserIds = allUserIds.slice(0, 50);

    // 6. Fetch User Details ONLY for Top 50
    const users = await User.find({ _id: { $in: topUserIds } })
      .select('name email')
      .lean(); // Use lean() for faster read-only performance

    const userMap = {};
    users.forEach(u => userMap[u._id.toString()] = u);

    // 7. Construct Final Response
    const leaderboard = topUserIds.map(userId => {
      const scores = userScores[userId];
      const user = userMap[userId];

      if (!user) return null; // Skip if user deleted

      return {
        _id: userId,
        name: user.name,
        email: user.email,
        meetingCount: scores.meetingCount,
        activityCount: scores.activityCount,
        totalScore: scores.totalScore
      };
    }).filter(item => item !== null);

    res.status(200).json(leaderboard);
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ message: "Server error fetching leaderboard" });
  }
};

// --- UPLOAD ATTENDANCE PHOTO ---
exports.uploadAttendancePhoto = async (req, res) => {
  try {
    const { id } = req.params; // Meeting ID
    const userId = req.user._id;
    const userName = req.user.name;
    const { photoUrl } = req.body;

    if (!photoUrl) {
      return res.status(400).json({ message: "Photo URL is required" });
    }

    // Verify meeting exists
    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    // Verify user is a participant
    const isParticipant = meeting.participants.some(p => p.toString() === userId.toString());
    if (!isParticipant) {
      return res.status(403).json({ message: "You are not a participant of this meeting" });
    }

    // Create or update MeetingLog with photo
    const log = await MeetingLog.findOneAndUpdate(
      { meetingId: id, userId: userId },
      {
        userName: userName,
        attendanceProof: photoUrl,
        // Ensure joinedAt is set if not present
        $setOnInsert: { joinedAt: new Date(), duration: 0 }
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: "Photo uploaded", data: log });
  } catch (error) {
    console.error("Error uploading attendance photo:", error);
    res.status(500).json({ message: "Server error uploading photo" });
  }
};

// --- CHECK MEETING STATUS ---
exports.checkMeetingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    // Check Zoom Status
    if (meeting.meetingType === 'zoom' && meeting.zoomMeetingId) {
      try {
        const details = await zoomService.getMeetingDetails(meeting.zoomMeetingId);
        // details.status can be 'waiting', 'started', 'finished'
        if (details.status === 'finished') {
          return res.json({ status: 'ended' });
        }
      } catch (err) {
        console.error("Zoom status check failed:", err.message);
        // Fallback to active if Zoom check fails (don't kick out users due to API error)
      }
    }

    return res.json({ status: 'active' });
  } catch (err) {
    console.error("Error checking status:", err);
    res.status(500).json({ message: "Server error" });
  }
};