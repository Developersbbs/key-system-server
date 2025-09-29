const Level = require('../models/Level');

exports.createLevel = async (req, res) => {
  try {
    const { name, levelNumber, courses } = req.body;
    const levelExists = await Level.findOne({ levelNumber });
    if (levelExists) {
        return res.status(400).json({ message: `Level ${levelNumber} already exists.` });
    }
    const level = await Level.create({ name, levelNumber, courses });
    res.status(201).json(level);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

exports.getAllLevels = async (req, res) => {
  try {
    const levels = await Level.find({}).sort({ levelNumber: 1 }).populate('courses', 'title');
    res.status(200).json(levels);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.updateLevel = async (req, res) => {
    try {
        const level = await Level.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!level) return res.status(404).json({ message: 'Level not found' });
        res.status(200).json(level);
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

exports.deleteLevel = async (req, res) => {
    try {
        const level = await Level.findByIdAndDelete(req.params.id);
        if (!level) return res.status(404).json({ message: 'Level not found' });
        res.status(200).json({ message: 'Level deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};