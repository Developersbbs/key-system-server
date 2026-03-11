const Announcement = require('../models/Announcement');

// Default types (cannot be deleted)
const defaultTypes = ['info', 'warning', 'success', 'urgent'];

// In-memory store for custom types (can also move to DB later)
let customTypes = [];


/* 
   Get all announcement types (default + custom)
 */
exports.getAnnouncementTypes = async (req, res) => {
  try {

    const types = [...defaultTypes, ...customTypes];

    res.status(200).json(types);

  } catch (err) {

    res.status(500).json({ message: 'Server Error' });

  }
};


/* 
   Add new custom announcement type
 */
exports.addAnnouncementType = async (req, res) => {
  try {

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Type name required" });
    }

    const lowerName = name.toLowerCase();

    if (defaultTypes.includes(lowerName) || customTypes.includes(lowerName)) {
      return res.status(400).json({ message: "Type already exists" });
    }

    customTypes.push(lowerName);

    res.status(201).json({
      message: "Type added successfully",
      types: [...defaultTypes, ...customTypes]
    });

  } catch (err) {

    res.status(500).json({ message: 'Server Error', error: err.message });

  }
};


/* 
   Delete custom type
 */
exports.deleteAnnouncementType = async (req, res) => {
  try {

    const { name } = req.params;

    if (defaultTypes.includes(name)) {
      return res.status(400).json({
        message: "Default types cannot be deleted"
      });
    }

    customTypes = customTypes.filter(type => type !== name);

    res.status(200).json({
      message: "Type deleted successfully",
      types: [...defaultTypes, ...customTypes]
    });

  } catch (err) {

    res.status(500).json({ message: 'Server Error', error: err.message });

  }
};


/* 
   Get all announcements
 */
exports.getAllAnnouncements = async (req, res) => {
  try {

    const announcements = await Announcement.find({})
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name');

    res.status(200).json(announcements);

  } catch (err) {

    res.status(500).json({ message: 'Server Error' });

  }
};


/* 
   Create announcement
 */
exports.createAnnouncement = async (req, res) => {
  try {

    let { title, content, type } = req.body;

    const allowedTypes = [...defaultTypes, ...customTypes];

    if (!allowedTypes.includes(type)) {
      type = 'info';
    }

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

    res.status(500).json({
      message: 'Server Error',
      error: err.message
    });

  }
};


/* 
   Delete announcement
 */
exports.deleteAnnouncement = async (req, res) => {
  try {

    const { id } = req.params;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        message: 'Announcement not found'
      });
    }

    await Announcement.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Announcement deleted successfully'
    });

  } catch (err) {

    res.status(500).json({
      message: 'Server Error',
      error: err.message
    });

  }
};