const express = require('express');
const router = express.Router();
const worksheetFieldController = require('../controllers/worksheetFieldController');
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');

// Public/Member routes
router.get('/active', auth, allowRoles('member', 'admin', 'developer'), worksheetFieldController.getActiveFields);

// Admin routes
router.get('/admin/all', auth, allowRoles('admin', 'developer'), worksheetFieldController.getAdminFields);
router.post('/', auth, allowRoles('admin', 'developer'), worksheetFieldController.createField);
router.put('/:id', auth, allowRoles('admin', 'developer'), worksheetFieldController.updateField);
router.delete('/:id', auth, allowRoles('admin', 'developer'), worksheetFieldController.deleteField);

module.exports = router;
