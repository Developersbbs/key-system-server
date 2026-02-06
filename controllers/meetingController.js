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
    const { title, description, meetingDate, meetingLink, host, participants, zoomMeetingId, recordingLink } = req.body;
    const adminUserId = req.user._id;

    // Validation
    if (!title || !meetingDate || !meetingLink) {
      return res.status(400).json({ message: "Title, Date, and Link are required." });
    }

    const newMeeting = new Meeting({
      title,
      description: description || '',
      meetingDate,
      meetingLink,
      host,
      participants,
      createdBy: adminUserId,
      createdBy: adminUserId,
      zoomMeetingId, // Save Zoom ID
      recordingLink: recordingLink || '' // Save recording link
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
      .populate('participants', 'name');

    res.status(200).json(meetings);
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

    await MeetingLog.create({
      meetingId: id,
      userId: userId,
      userName: userName,
      joinedAt: new Date()
    });

    return res.status(200).json({ message: "Attendance logged", link: meeting.meetingLink });
  } catch (err) {
    console.error("Error joining meeting:", err);
    return res.status(500).json({ message: "Server error logging attendance" });
  }
};

// --- GET MEETING LOGS ---
exports.getMeetingLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await MeetingLog.find({ meetingId: id }).sort({ joinedAt: -1 });
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
    const { id } = req.params; // Meeting ID (DB ID)
    const meeting = await Meeting.findById(id);

    if (!meeting || !meeting.zoomMeetingId) {
      return res.status(404).json({ message: "Meeting not found or not a Zoom meeting" });
    }

    // 1. Fetch Report from Zoom
    const report = await zoomService.getMeetingParticipantsReport(meeting.zoomMeetingId);

    // Zoom API might return { message: "Report could not be retrieved" } or similar if not ready
    if (!report || !report.participants) {
      return res.status(400).json({ message: "Attendance report not available yet. (Wait for meeting to end)" });
    }

    console.log(`Syncing Attendance for Meeting ${id}. Found ${report.participants.length} participants.`);

    let updatedCount = 0;

    // 2. Process each participant
    for (const p of report.participants) {
      // p has { user_email, duration (seconds), name, join_time, leave_time }
      if (p.user_email) {
        // Find User by Email
        const user = await User.findOne({ email: p.user_email });
        if (user) {
          // Upsert MeetingLog
          // Note: duration from Zoom is in seconds, we store minutes.
          const durationMinutes = Math.round(p.duration / 60);

          await MeetingLog.findOneAndUpdate(
            { meetingId: id, userId: user._id },
            {
              userName: user.name, // Ensure name is up to date
              joinedAt: new Date(p.join_time),
              leftAt: p.leave_time ? new Date(p.leave_time) : undefined,
              duration: durationMinutes
            },
            { upsert: true, new: true }
          );
          updatedCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Synced attendance for ${updatedCount} members`,
      data: report.participants
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