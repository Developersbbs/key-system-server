const express = require('express');
const router = express.Router({ mergeParams: true });

// Import Controller
const mcqController = require('../controllers/mcqController');

// Import Middleware
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');

// ✅ DEBUG: Log available methods (remove this after fixing)
console.log('MCQ Controller methods:', Object.keys(mcqController));

// Routes for /api/chapters/:chapterId/mcqs
router
  .route('/')
  .get(auth, mcqController.getMcqsByChapter)
  .post(auth, allowRoles(['admin']), mcqController.createMcq);

// Routes for /api/chapters/:chapterId/mcqs/:mcqId
router
  .route('/:mcqId')
  .put(auth, allowRoles(['admin']), mcqController.updateMcq)
  .delete(auth, allowRoles(['admin']), mcqController.deleteMcq);

// Route: POST /api/chapters/:chapterId/mcqs/submit
// Submit MCQ answers
router.post('/submit', auth, mcqController.submitMcqResult);

module.exports = router;