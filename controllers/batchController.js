const Batch = require('../models/Batch');
const User = require('../models/User');

// @desc    Get all batches
exports.getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find({})
      .populate('members', 'name phoneNumber role')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new batch
exports.createBatch = async (req, res) => {
  try {
    const { name, description, accessibleLevels, startDate, endDate } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Batch name is required' });
    }

    const batch = new Batch({
      name,
      description,
      accessibleLevels: accessibleLevels || [1],
      startDate,
      endDate,
      createdBy: req.user._id
    });

    const createdBatch = await batch.save();
    await createdBatch.populate('createdBy', 'name');
    
    res.status(201).json(createdBatch);
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update batch
exports.updateBatch = async (req, res) => {
  try {
    const { name, description, accessibleLevels, isActive, startDate, endDate } = req.body;
    
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Update fields
    if (name !== undefined) batch.name = name;
    if (description !== undefined) batch.description = description;
    if (accessibleLevels !== undefined) batch.accessibleLevels = accessibleLevels;
    if (isActive !== undefined) batch.isActive = isActive;
    if (startDate !== undefined) batch.startDate = startDate;
    if (endDate !== undefined) batch.endDate = endDate;

    const updatedBatch = await batch.save();
    await updatedBatch.populate('members', 'name phoneNumber role');
    
    res.status(200).json(updatedBatch);
  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add members to batch
exports.addMembersToBatch = async (req, res) => {
  try {
    const { memberIds } = req.body;
    const batchId = req.params.id;

    if (!memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ message: 'Member IDs array is required' });
    }

    // Update the batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Add new members (avoid duplicates)
    const newMembers = memberIds.filter(id => !batch.members.includes(id));
    batch.members.push(...newMembers);
    await batch.save();

    // Update users to reference this batch
    await User.updateMany(
      { _id: { $in: memberIds } },
      { batch: batchId }
    );

    const updatedBatch = await batch.populate('members', 'name phoneNumber role');
    res.status(200).json(updatedBatch);
  } catch (error) {
    console.error('Error adding members to batch:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Remove member from batch
exports.removeMemberFromBatch = async (req, res) => {
  try {
    const { batchId, memberId } = req.params;

    // Remove from batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    batch.members = batch.members.filter(id => id.toString() !== memberId);
    await batch.save();

    // Remove batch reference from user
    await User.findByIdAndUpdate(memberId, { batch: null });

    const updatedBatch = await batch.populate('members', 'name phoneNumber role');
    res.status(200).json(updatedBatch);
  } catch (error) {
    console.error('Error removing member from batch:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete batch
exports.deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Remove batch reference from all members
    await User.updateMany(
      { batch: req.params.id },
      { batch: null }
    );

    await batch.deleteOne();
    res.status(200).json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};