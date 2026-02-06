const router = require('express').Router();
const Tool = require('../models/Tool');
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');

// Get all tools (public/member access)
// Optionally filter by type: /api/tools?type=document
router.get('/', auth, async (req, res) => {
    try {
        const { type } = req.query;
        const query = {};
        if (type) {
            query.type = type;
        }
        const tools = await Tool.find(query).sort({ createdAt: -1 });
        res.json(tools);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Admin only: Create a new tool
router.post('/', auth, allowRoles('admin'), async (req, res) => {
    try {
        const { title, description, type, url, thumbnail } = req.body;

        if (!title || !type || !url) {
            return res.status(400).json({ msg: "Please fill in all required fields." });
        }

        const newTool = new Tool({
            title,
            description,
            type,
            url,
            thumbnail
        });

        await newTool.save();
        res.json({ msg: "Tool created successfully", tool: newTool });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Admin only: Update a tool
router.put('/:id', auth, allowRoles('admin'), async (req, res) => {
    try {
        const { title, description, type, url, thumbnail } = req.body;

        await Tool.findByIdAndUpdate(req.params.id, {
            title,
            description,
            type,
            url,
            thumbnail
        });

        res.json({ msg: "Tool updated successfully" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Admin only: Delete a tool
router.delete('/:id', auth, allowRoles('admin'), async (req, res) => {
    try {
        await Tool.findByIdAndDelete(req.params.id);
        res.json({ msg: "Tool deleted successfully" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

module.exports = router;
