const express = require('express');
const router = express.Router();

const {
  getAllBatches,
  createBatch,
  updateBatch,
  addMembersToBatch,
  removeMemberFromBatch,
  deleteBatch
} = require('../controllers/batchController');

const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');

// All batch routes require admin authentication
router.use(auth, allowRoles(['admin']));

// CRUD routes
router.get('/', getAllBatches);
router.post('/', createBatch);
router.put('/:id', updateBatch);
router.delete('/:id', deleteBatch);

// Member management routes
router.put('/:id/members', addMembersToBatch);
router.delete('/:batchId/members/:memberId', removeMemberFromBatch);

module.exports = router;