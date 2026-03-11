const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const Mcq = require('../models/Mcq');
const User = require('../models/User');

const chapterController = {

  // ================================
  // Add Chapter
  // ================================
  addChapterToCourse: async (req, res) => {
    try {
      const { courseId } = req.params;

      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      const { mcqs, tasks, ...chapterData } = req.body;

      const newChapter = new Chapter({
        ...chapterData,
        courseId,
        mcqs: [],
        tasks: tasks || []
      });

      const savedChapter = await newChapter.save();

      if (mcqs && mcqs.length > 0) {

        const savedMcqs = await Promise.all(
          mcqs.map(mcqData => {

            const mcq = new Mcq({
              ...mcqData,
              chapterId: savedChapter._id,
              courseId
            });

            return mcq.save();

          })
        );

        savedChapter.mcqs = savedMcqs.map(m => m._id);
        await savedChapter.save();

      }

      course.chapters.push(savedChapter._id);
      await course.save();

      const populated = await Chapter.findById(savedChapter._id).populate('mcqs');

      res.status(201).json(populated);

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },



  // ================================
  // Get All Chapters
  // ================================
  getAllChapters: async (req, res) => {

    try {

      const { courseId } = req.params;

      const chapters = await Chapter.find({ courseId }).populate('mcqs');

      res.status(200).json(chapters);

    } catch (err) {

      console.error(err);
      res.status(500).json({ message: "Server error" });

    }

  },



  // ================================
  // Get Single Chapter
  // ================================
  getChapterById: async (req, res) => {

    try {

      const { chapterId } = req.params;

      const chapter = await Chapter.findById(chapterId).populate('mcqs');

      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      res.status(200).json(chapter);

    } catch (err) {

      console.error(err);
      res.status(500).json({ message: "Server error" });

    }

  },



  // ================================
  // Update Chapter
  // ================================
  updateChapter: async (req, res) => {

    try {

      const { chapterId } = req.params;
      const { mcqs, tasks, ...chapterData } = req.body;

      const chapter = await Chapter.findByIdAndUpdate(
        chapterId,
        { ...chapterData, tasks: tasks || [] },
        { new: true }
      );

      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      if (mcqs) {

        await Mcq.deleteMany({ chapterId });

        const savedMcqs = await Promise.all(
          mcqs.map(data => {

            const mcq = new Mcq({
              ...data,
              chapterId,
              courseId: chapter.courseId
            });

            return mcq.save();

          })
        );

        chapter.mcqs = savedMcqs.map(m => m._id);

        await chapter.save();

      }

      const populated = await Chapter.findById(chapterId).populate('mcqs');

      res.status(200).json(populated);

    } catch (err) {

      console.error(err);
      res.status(500).json({ message: "Server error" });

    }

  },



  // ================================
  // Delete Chapter
  // ================================
  deleteChapter: async (req, res) => {

    try {

      const { chapterId } = req.params;

      const chapter = await Chapter.findById(chapterId);

      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      await Course.findByIdAndUpdate(
        chapter.courseId,
        { $pull: { chapters: chapterId } }
      );

      await Mcq.deleteMany({ chapterId });

      await Chapter.findByIdAndDelete(chapterId);

      res.status(200).json({ message: "Chapter deleted successfully" });

    } catch (err) {

      console.error(err);
      res.status(500).json({ message: "Server error" });

    }

  },



  // ================================
  // Get Video URL
  // ================================
  getVideoUrl: async (req, res) => {

    try {

      const { chapterId } = req.params;

      const chapter = await Chapter.findById(chapterId);

      if (!chapter || !chapter.videoUrl) {
        return res.status(404).json({ message: "Video not found" });
      }

      res.status(200).json({ videoUrl: chapter.videoUrl });

    } catch (err) {

      console.error(err);
      res.status(500).json({ message: "Server error" });

    }

  },



  // ================================
  // Update Video Progress
  // ================================
  updateVideoProgress: async (req, res) => {

    try {

      const { chapterId } = req.params;
      const { watchedDuration, totalDuration } = req.body;
      const userId = req.user._id;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.videoProgress) user.videoProgress = [];

      const index = user.videoProgress.findIndex(
        p => p.chapterId?.toString() === chapterId
      );

      if (index > -1) {

        const progress = user.videoProgress[index];

        if (watchedDuration > progress.watchedDuration) {
          progress.watchedDuration = watchedDuration;
        }

        progress.totalDuration = totalDuration;
        progress.lastWatchedAt = new Date();

        if (totalDuration > 0 &&
          (progress.watchedDuration / totalDuration) >= 0.9
        ) {
          progress.completed = true;
        }

        user.videoProgress[index] = progress;

      } else {

        user.videoProgress.push({
          chapterId,
          watchedDuration,
          totalDuration,
          completed: false,
          lastWatchedAt: new Date()
        });

      }

      await user.save();

      res.status(200).json({ success: true });

    } catch (err) {

      console.error(err);
      res.status(500).json({ message: "Error updating video progress" });

    }

  },



  // ================================
  // Get Video Progress
  // ================================
  getVideoProgress: async (req, res) => {

    try {

      const { chapterId } = req.params;
      const userId = req.user._id;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const progress = user.videoProgress?.find(
        p => p.chapterId?.toString() === chapterId
      );

      res.status(200).json(
        progress || { watchedDuration: 0, completed: false }
      );

    } catch (err) {

      console.error(err);
      res.status(500).json({ message: "Error fetching progress" });

    }

  }

};

module.exports = chapterController;