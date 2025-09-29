const Announcement = require('../models/Announcement');

// @desc    Get all announcements (for members and admins)
exports.getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({}).sort({ createdAt: -1 }).populate('createdBy', 'name');
    res.status(200).json(announcements);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new announcement (Admins only)
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, type } = req.body;
    const newAnnouncement = new Announcement({
      title,
      content,
      type,
      createdBy: req.user._id,
    });
    const savedAnnouncement = await newAnnouncement.save();
    await savedAnnouncement.populate('createdBy', 'name');
    res.status(201).json(savedAnnouncement);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the announcement exists
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    await Announcement.findByIdAndDelete(id);
    res.status(200).json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};