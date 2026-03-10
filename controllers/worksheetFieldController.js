const WorksheetField = require('../models/WorksheetField');

// Fetch all fields for admin
exports.getAdminFields = async (req, res) => {
    try {
        const fields = await WorksheetField.find().sort({ order: 1 });
        res.status(200).json(fields);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Fetch active fields for members
exports.getActiveFields = async (req, res) => {
    try {
        const fields = await WorksheetField.find({ isActive: true }).sort({ order: 1 });
        res.status(200).json(fields);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new field
exports.createField = async (req, res) => {
    try {
        const { label, key, order, isActive } = req.body;

        // Check if key already exists
        const existingField = await WorksheetField.findOne({ key });
        if (existingField) {
            return res.status(400).json({ message: 'Field key already exists' });
        }

        const field = new WorksheetField({ label, key, order, isActive });
        await field.save();
        res.status(201).json(field);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update a field
exports.updateField = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedField = await WorksheetField.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedField) {
            return res.status(404).json({ message: 'Field not found' });
        }
        res.status(200).json(updatedField);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a field
exports.deleteField = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedField = await WorksheetField.findByIdAndDelete(id);
        if (!deletedField) {
            return res.status(404).json({ message: 'Field not found' });
        }
        res.status(200).json({ message: 'Field deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
