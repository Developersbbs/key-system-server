const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const allowRoles = require("../middlewares/allowRoles");
const { submitMcqResult, completeCourse } = require('../controllers/memberController');
const {getUserQuizResults, getUserQuizStats}= require('../controllers/resultController');

// ✅ Route 1: Get member profile
router.get(
  "/profile", 
  auth, 
  allowRoles(["member", "admin"]), 
  (req, res) => {
    res.json({ message: `Welcome ${req.user.name}` });
  }
);

// ✅ Route 2: Submit MCQ results (now correctly separated)
router.post(
  '/chapters/:chapterId/submit-mcqs',
  auth,
  allowRoles(['member']),
  submitMcqResult
);
router.get('/quiz-results', auth, getUserQuizResults);
router.get('/quiz-stats', auth, getUserQuizStats);
router.post('/courses/:courseId/complete', auth, allowRoles(['member']), completeCourse);

module.exports = router;