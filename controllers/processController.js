const Process = require("../models/Process");

exports.getUserProcess = async (req, res) => {
  try {

    const processes = await Process.find({
      userId: req.user._id
    }).populate("courseId chapterId");

    res.json(processes);

  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};