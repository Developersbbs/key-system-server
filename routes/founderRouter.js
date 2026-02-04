const express = require('express');
const router = express.Router();
const founderController = require('../controllers/founderController');
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');

// Public/Member routes
router.get('/', founderController.getAllFounders);

// Admin routes
router.get('/admin/all', auth, allowRoles('admin', 'superadmin'), founderController.getAllFoundersAdmin);
router.post('/', auth, allowRoles('admin', 'superadmin'), founderController.createFounder);
router.put('/:id', auth, allowRoles('admin', 'superadmin'), founderController.updateFounder);
router.delete('/:id', auth, allowRoles('admin', 'superadmin'), founderController.deleteFounder);

module.exports = router;
