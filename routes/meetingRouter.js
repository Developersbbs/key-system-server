const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');
const {
  getAllMeetings,
  createMeeting,
  deleteMeeting,
  getMemberMeetings,
  joinMeeting,
  leaveMeeting,
  getMeetingLogs,
  getMeetingAttendanceDetails,
  generateZoomMeeting,
  saveMom,
  getMom,
  syncMeetingAttendance,
  getLeaderboard,
  updateMeeting,
  uploadAttendancePhoto,
  checkMeetingStatus
} = require('../controllers/meetingController');

// Admin routes
router.get('/leaderboard', auth, getLeaderboard);

router.route('/')
  .get(auth, allowRoles(['admin', 'member']), getAllMeetings)
  .post(auth, allowRoles(['admin', 'member']), createMeeting);

router.route('/:id')
  .delete(auth, allowRoles(['admin']), deleteMeeting)
  .put(auth, allowRoles(['admin']), updateMeeting); // Add PUT route

router.post('/:id/join', auth, joinMeeting);
router.post('/:id/leave', auth, leaveMeeting);
router.get('/:id/logs', auth, allowRoles(['admin']), getMeetingLogs);
router.get('/:id/attendance/:userId', auth, allowRoles(['admin']), getMeetingAttendanceDetails);

// Sync Attendance
router.post('/:id/sync', auth, allowRoles(['admin']), syncMeetingAttendance);

// MOM Routes (New) - Available to Members (and Admins if they participate)
router.route('/:id/mom')
  .get(auth, getMom)
  .post(auth, saveMom);

// Member route
router.route('/member/:userId')
  .get(auth, getMemberMeetings);

// @route   POST /api/meetings/generate-zoom
// @desc    Generate a Zoom meeting link
// @access  Admin
router.post('/generate-zoom', auth, allowRoles(['admin']), generateZoomMeeting);

// @route   POST /api/meetings/:id/attendance-photo
// @desc    Upload attendance photo for in-person meetings
// @access  Member (participant)
router.post('/:id/attendance-photo', auth, uploadAttendancePhoto);

// Check Status
router.get('/:id/status', auth, checkMeetingStatus);

module.exports = router;