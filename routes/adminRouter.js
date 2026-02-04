const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');

const {
  getAllMembers,
  getAllAdmins,
  updateUserRole,
  updateCourseAccess,
  updateUserLevels,
  updateUserStatus,
  getAllUsers
} = require('../controllers/adminController');

router.get('/users', auth, allowRoles('admin', 'superadmin'), getAllUsers);

router.get('/members', auth, allowRoles('admin', 'superadmin'), getAllMembers);
router.get('/admins', auth, allowRoles('admin', 'superadmin'), getAllAdmins);

router.put('/users/:userId/role', auth, allowRoles('admin', 'superadmin'), updateUserRole);
router.put('/users/:userId/access', auth, allowRoles('admin', 'superadmin'), updateCourseAccess);
router.put('/users/:userId/levels', auth, allowRoles('admin', 'superadmin'), updateUserLevels);
router.put('/users/:userId/status', auth, allowRoles('admin', 'superadmin'), updateUserStatus);

module.exports = router;
