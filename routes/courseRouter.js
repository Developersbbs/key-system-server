const express = require('express');
const router = express.Router();

const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getMemberCourses,
  getApprovedCourses  // ✅ ADD this new controller function
} = require('../controllers/courseController');

const chapterRouter = require('./chapterRouter');

const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');

// ✅ RULE: Specific routes (like '/my-courses', '/approved') MUST come before dynamic routes (like '/:id').

// --- PROTECTED ROUTES ---
// Route for logged-in members to get their specific courses
router.get('/my-courses', auth, allowRoles(['member', 'admin']), getMemberCourses);
router.post('/', auth, allowRoles(['admin']), createCourse);
router.put('/:id', auth, allowRoles(['admin']), updateCourse);
router.delete('/:id', auth, allowRoles(['admin']), deleteCourse);

// --- PUBLIC ROUTES (now require authentication) ---
// : Get only admin-approved courses for public viewing
router.get('/approved', auth, getApprovedCourses);

// The general "get all" route (for admin use)
router.get('/', auth, getAllCourses);

// The dynamic "get by id" route MUST be last among the GET routes
router.get('/:id', auth, getCourseById);

router.use('/:courseId/chapters', chapterRouter);
module.exports = router;