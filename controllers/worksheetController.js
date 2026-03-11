const DailyWorksheet = require('../models/DailyWorksheet');
const SystemConfig = require('../models/SystemConfig');

// Member: Create a new daily worksheet entry
exports.submitWorksheet = async (req, res) => {
    try {
        const { date, name, data } = req.body;

        const config = await SystemConfig.getConfig();
        const settings = config.worksheetSettings || { startHour: 6, endHour: 24 };

        const parsedDate = new Date(date || Date.now());

        // Restrict submission based on config hours
        const currentHour = new Date().getHours();
        if (currentHour < settings.startHour || currentHour >= settings.endHour) {
            const startStr = settings.startHour > 12 ? `${settings.startHour - 12}:00 PM` : `${settings.startHour}:00 AM`;
            const endStr = settings.endHour > 12 ? `${settings.endHour - 12}:00 PM` : (settings.endHour === 24 ? '12:00 AM' : `${settings.endHour}:00 AM`);
            return res.status(403).json({
                message: `Worksheets can only be submitted between ${startStr} and ${endStr}.`
            });
        }

        parsedDate.setHours(0, 0, 0, 0); // Normalize to midnight

        // Check if the user already submitted a worksheet for this date
        const existingEntry = await DailyWorksheet.findOne({
            user: req.user.id,
            date: {
                $gte: parsedDate,
                $lt: new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (existingEntry) {
            return res.status(400).json({ message: 'You have already submitted a worksheet for this date.' });
        }

        const worksheet = new DailyWorksheet({
            user: req.user.id,
            date: parsedDate,
            name,
            data
        });

        await worksheet.save();

        // Populate user info before sending
        await worksheet.populate('user', 'name email phoneNumber role');

        res.status(201).json({ message: 'Worksheet submitted successfully', worksheet });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A worksheet for this date already exists.' });
        }
        console.error('Submit worksheet error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Member: Get all their own submitted worksheets
exports.getMyWorksheets = async (req, res) => {
    try {
        const worksheets = await DailyWorksheet.find({ user: req.user.id })
            .sort({ date: -1 })
            .populate('user', 'name email phoneNumber role');

        res.status(200).json(worksheets);
    } catch (error) {
        console.error('Get my worksheets error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Admin: Get all worksheets from everyone
exports.getAllWorksheets = async (req, res) => {
    try {
        const worksheets = await DailyWorksheet.find({})
            .sort({ date: -1 })
            .populate('user', 'name email phoneNumber role');

        res.status(200).json(worksheets);
    } catch (error) {
        console.error('Get all worksheets error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update an existing worksheet (only if it's from today)
exports.updateWorksheet = async (req, res) => {
    try {
        const worksheet = await DailyWorksheet.findById(req.params.id);

        if (!worksheet) {
            return res.status(404).json({ message: 'Worksheet not found' });
        }

        // Check ownership (Even admins can only edit their own worksheets)
        if (worksheet.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to edit other members worksheets' });
        }

        const config = await SystemConfig.getConfig();
        const settings = config.worksheetSettings || { editWindowDays: 0 };

        // Check if it's within the allowed edit window
        const worksheetDate = new Date(worksheet.date);
        worksheetDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(today - worksheetDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > settings.editWindowDays) {
            return res.status(403).json({
                message: settings.editWindowDays === 0
                    ? 'Can only edit worksheets submitted today'
                    : `Can only edit worksheets within ${settings.editWindowDays} day(s) of submission`
            });
        }

        // Restrict time if needed? The user said 12am to 12pm, maybe we skip time check for edits, or keep it open.
        // I will let them edit anytime on the same day, or wait, they said "only next day hide that option".
        // Let's enforce that if it is "today", they can edit.

        const updatedWorksheet = await DailyWorksheet.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        ).populate('user', 'name email phoneNumber role');

        res.status(200).json({ message: 'Worksheet updated successfully', worksheet: updatedWorksheet });
    } catch (error) {
        console.error('Update worksheet error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete a worksheet (only if it's from today)
exports.deleteWorksheet = async (req, res) => {
    try {
        const worksheet = await DailyWorksheet.findById(req.params.id);

        if (!worksheet) {
            return res.status(404).json({ message: 'Worksheet not found' });
        }

        // Check ownership (Even admins can only delete their own worksheets)
        if (worksheet.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete other members worksheets' });
        }

        const config = await SystemConfig.getConfig();
        const settings = config.worksheetSettings || { editWindowDays: 0 };

        // Check if it's within the allowed window
        const worksheetDate = new Date(worksheet.date);
        worksheetDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(today - worksheetDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > settings.editWindowDays) {
            return res.status(403).json({
                message: settings.editWindowDays === 0
                    ? 'Can only delete worksheets submitted today'
                    : `Can only delete worksheets within ${settings.editWindowDays} day(s) of submission`
            });
        }

        await worksheet.deleteOne();

        res.status(200).json({ message: 'Worksheet deleted successfully', id: req.params.id });
    } catch (error) {
        console.error('Delete worksheet error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
