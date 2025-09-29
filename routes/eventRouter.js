const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');
const { 
  getAllEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent 
} = require('../controllers/eventController');

// GET /api/events - Public route to see all events
router.get('/', getAllEvents);

// POST /api/events - Protected route for members to create an event
router.post('/', auth, allowRoles(['member', 'admin']), createEvent);

// PUT /api/events/:id - Protected route for admin to update an event
router.put('/:id', auth, allowRoles(['admin']), updateEvent);

// DELETE /api/events/:id - Protected route for admin to delete an event
router.delete('/:id', auth, allowRoles(['admin']), deleteEvent);

module.exports = router;