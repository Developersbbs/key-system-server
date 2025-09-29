const Event = require('../models/Event');

/**
 * @desc    Get all events
 * @route   GET /api/events
 * @access  Public
 */
exports.getAllEvents = async (req, res) => {
  try {
    // Sort by eventDate to show upcoming events first
    const events = await Event.find({}).sort({ eventDate: 1 }).populate('postedBy', 'name');
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @desc    Create a new event
 * @route   POST /api/events
 * @access  Member
 */
exports.createEvent = async (req, res) => {
  try {
    const { description, eventDate, rate } = req.body;

    const newEvent = new Event({
      description,
      eventDate,
      rate,
      postedBy: req.user._id, // req.user is from the auth middleware
    });

    const savedEvent = await newEvent.save();
    // Populate the 'postedBy' field before sending it back
    await savedEvent.populate('postedBy', 'name');

    res.status(201).json(savedEvent);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Add these functions to your existing controller

/**
 * @desc    Update an event
 * @route   PUT /api/events/:id
 * @access  Admin
 */
exports.updateEvent = async (req, res) => {
  try {
    const { description, eventDate, rate, location, attendees } = req.body;
    
    // Check if event exists
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Update event
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { description, eventDate, rate, location, attendees },
      { new: true, runValidators: true }
    ).populate('postedBy', 'name');
    
    res.status(200).json(updatedEvent);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * @desc    Delete an event
 * @route   DELETE /api/events/:id
 * @access  Admin
 */
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    await Event.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};