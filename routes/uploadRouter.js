const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const uploadController = require('../controllers/uploadController');

// Meeting upload route - for attendance photos and other meeting-related uploads
router.post('/meeting-upload', auth, uploadController.generateMeetingUploadUrl);

module.exports = router;