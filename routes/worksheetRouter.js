const express = require('express');
const router = express.Router();
const worksheetController = require('../controllers/worksheetController');
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');

// Members can submit and view their own entries
router.post('/submit', auth, allowRoles('member', 'admin', 'developer'), worksheetController.submitWorksheet);
router.get('/my', auth, allowRoles('member', 'admin', 'developer'), worksheetController.getMyWorksheets);

// Admins can view all entries
router.get('/all', auth, allowRoles('admin', 'developer'), worksheetController.getAllWorksheets);

// Members and Admins can update/delete their own daily entries (controller enforces "today" rule)
router.put('/:id', auth, allowRoles('member', 'admin', 'developer'), worksheetController.updateWorksheet);
router.delete('/:id', auth, allowRoles('member', 'admin', 'developer'), worksheetController.deleteWorksheet);

module.exports = router;
