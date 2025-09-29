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
  updateUserStatus  // ✅ ADD THIS - the missing function
} = require('../controllers/adminController');

router.get('/members', auth, allowRoles(['admin']), getAllMembers);
router.get('/admins', auth, allowRoles(['admin']), getAllAdmins);

router.put('/users/:userId/role', auth, allowRoles(['admin']), updateUserRole);
router.put('/users/:userId/access', auth, allowRoles(['admin']), updateCourseAccess);
router.put('/users/:userId/levels', auth, allowRoles(['admin']), updateUserLevels);

// ✅ ADD THIS ROUTE - the missing status update route
router.put('/users/:userId/status', auth, allowRoles(['admin']), updateUserStatus);

module.exports = router;