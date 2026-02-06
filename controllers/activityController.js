const Activity = require('../models/Activity');

// Create a new activity
exports.createActivity = async (req, res) => {
    try {
        const { title, description, date, type, status, photo } = req.body;

        // Validation
        if (!title || !description) {
            return res.status(400).json({ message: 'Title and Description are required' });
        }

        const activity = new Activity({
            user: req.user._id,
            title,
            description,
            date: date || new Date(),
            type,
            status,
            photo
        });

        const savedActivity = await activity.save();
        res.status(201).json(savedActivity);
    } catch (err) {
        console.error('Error creating activity:', err);
        res.status(500).json({ message: 'Server error creating activity' });
    }
};

// Get activities for the logged-in user
exports.getUserActivities = async (req, res) => {
    try {
        const activities = await Activity.find({ user: req.user._id })
            .sort({ date: -1 }); // Newest first
        res.status(200).json(activities);
    } catch (err) {
        console.error('Error fetching activities:', err);
        res.status(500).json({ message: 'Server error fetching activities' });
    }
};

// Get activities for a specific user (public)
exports.getUserActivitiesById = async (req, res) => {
    try {
        const { userId } = req.params;
        const activities = await Activity.find({ user: userId })
            .sort({ date: -1 }); // Newest first
        res.status(200).json(activities);
    } catch (err) {
        console.error('Error fetching activities:', err);
        res.status(500).json({ message: 'Server error fetching activities' });
    }
};

// Delete an activity
exports.deleteActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const activity = await Activity.findOneAndDelete({ _id: id, user: req.user._id });

        if (!activity) {
            return res.status(404).json({ message: 'Activity not found or unauthorized' });
        }

        res.status(200).json({ message: 'Activity deleted successfully' });
    } catch (err) {
        console.error('Error deleting activity:', err);
        res.status(500).json({ message: 'Server error deleting activity' });
    }
};
