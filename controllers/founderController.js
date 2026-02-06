const Founder = require('../models/Founder');
const User = require('../models/User');

// Get all founders (Public/Member)
exports.getAllFounders = async (req, res) => {
    try {
        const founders = await Founder.find({ isActive: true })
            .populate('user', 'name email phoneNumber')
            .sort({ order: 1, createdAt: 1 });
        res.status(200).json(founders);
    } catch (error) {
        console.error('Error fetching founders:', error);
        res.status(500).json({ message: 'Server error fetching founders' });
    }
};

// Get all founders for Admin (includes inactive)
exports.getAllFoundersAdmin = async (req, res) => {
    try {
        const founders = await Founder.find()
            .populate('user', 'name email phoneNumber')
            .sort({ order: 1, createdAt: -1 });
        res.status(200).json(founders);
    } catch (error) {
        console.error('Error fetching admin founders:', error);
        res.status(500).json({ message: 'Server error fetching founders' });
    }
};

// Create a new founder (Admin)
exports.createFounder = async (req, res) => {
    try {
        const { name, designation, imageUrl, description, videoUrl, socialLinks, order, isActive, user, mobile, address, state, district } = req.body;

        let founderData = {
            name,
            designation,
            imageUrl,
            description,
            videoUrl,
            socialLinks,
            order,
            isActive,
            mobile,
            address,
            state,
            district
        };

        if (user) {
            founderData.user = user;
            // If specific fields are not provided, try to populate from user record
            if (!name || !imageUrl) {
                const userRecord = await User.findById(user);
                if (userRecord) {
                    if (!name) founderData.name = userRecord.name;
                    // You might want to map user profile image if available in User model
                }
            }
        }

        const newFounder = new Founder(founderData);

        const savedFounder = await newFounder.save();
        res.status(201).json(savedFounder);
    } catch (error) {
        console.error('Error creating founder:', error);
        res.status(500).json({ message: 'Server error creating founder', error: error.message });
    }
};

// Update a founder (Admin)
exports.updateFounder = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedFounder = await Founder.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedFounder) {
            return res.status(404).json({ message: 'Founder not found' });
        }

        res.status(200).json(updatedFounder);
    } catch (error) {
        console.error('Error updating founder:', error);
        res.status(500).json({ message: 'Server error updating founder', error: error.message });
    }
};

// Delete a founder (Admin)
exports.deleteFounder = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedFounder = await Founder.findByIdAndDelete(id);

        if (!deletedFounder) {
            return res.status(404).json({ message: 'Founder not found' });
        }

        res.status(200).json({ message: 'Founder deleted successfully' });
    } catch (error) {
        console.error('Error deleting founder:', error);
        res.status(500).json({ message: 'Server error deleting founder', error: error.message });
    }
};
