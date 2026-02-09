const express = require('express');
const router = express.Router({ mergeParams: true });

// Import Controller
const chapterController = require('../controllers/chapterController');

// Import Middleware
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');

// Routes for /api/courses/:courseId/chapters
router
  .route('/')
  .get(chapterController.getAllChapters)
  .post(auth, allowRoles(['admin']), chapterController.addChapterToCourse);

// Routes for /api/courses/:courseId/chapters/:chapterId
router
  .route('/:chapterId')
  .get(chapterController.getChapterById)
  .put(auth, allowRoles(['admin']), chapterController.updateChapter)
  .delete(auth, allowRoles(['admin']), chapterController.deleteChapter);

// Route: GET /api/courses/:courseId/chapters/:chapterId/video-url
// Get a presigned URL to play the video
router.get('/:chapterId/video-url', auth, chapterController.getVideoUrl);

// ✅ Routes for Video Progress
router.route('/:chapterId/progress')
  .post(auth, chapterController.updateVideoProgress)
  .get(auth, chapterController.getVideoProgress);

module.exports = router;