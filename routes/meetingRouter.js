const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');
const { 
  getAllMeetings, 
  createMeeting, 
  deleteMeeting, 
  getMemberMeetings 
} = require('../controllers/meetingController');

// Admin routes
router.route('/')
  .get(auth, allowRoles(['admin','member']), getAllMeetings)
  .post(auth, allowRoles(['admin']), createMeeting);

router.route('/:id')
  .delete(auth, allowRoles(['admin']), deleteMeeting);

// Member route
router.route('/member/:userId')
  .get(auth, getMemberMeetings);

module.exports = router;