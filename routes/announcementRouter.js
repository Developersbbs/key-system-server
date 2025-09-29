const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');
const { getAllAnnouncements, createAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');

// GET /api/announcements - Protected route for members and admins
router.get('/', auth, allowRoles(['member', 'admin']), getAllAnnouncements);

// POST /api/announcements - Protected route for admins only
router.post('/', auth, allowRoles(['admin']), createAnnouncement);
router.delete('/:id', auth, allowRoles(['admin']), deleteAnnouncement);

module.exports = router;