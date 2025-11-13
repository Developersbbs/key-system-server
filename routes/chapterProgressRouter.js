const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');
const { getCourseProgress } = require('../controllers/mcqController');

// GET /api/chapters/progress/:courseId
router.get('/progress/:courseId', auth, allowRoles(['member', 'admin']), getCourseProgress);

module.exports = router;
