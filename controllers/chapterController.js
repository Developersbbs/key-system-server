const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const Mcq = require('../models/Mcq');
const User = require('../models/User');



const chapterController = {
  /**
   * @desc    Add a new chapter to a course
   * @route   POST /api/courses/:courseId/chapters
   * @access  Admin
   */
  addChapterToCourse: async (req, res) => {
    try {
      const { courseId } = req.params;
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Extract MCQs and tasks from request body
      const { mcqs, tasks, ...chapterData } = req.body;

      // Create the chapter first without MCQs
      const newChapter = new Chapter({
        ...chapterData,
        courseId,
        mcqs: [], // Initialize as empty array
        tasks: tasks || []
      });

      const savedChapter = await newChapter.save();

      // Create MCQs separately and get their IDs
      if (mcqs && mcqs.length > 0) {
        const mcqPromises = mcqs.map(mcqData => {
          const mcq = new Mcq({
            ...mcqData,
            chapterId: savedChapter._id,
            courseId: courseId
          });
          return mcq.save();
        });

        const savedMcqs = await Promise.all(mcqPromises);

        // Update chapter with MCQ references
        savedChapter.mcqs = savedMcqs.map(mcq => mcq._id);
        await savedChapter.save();
      }

      // Add chapter reference to course
      course.chapters.push(savedChapter._id);
      await course.save();

      // Return populated chapter
      const populatedChapter = await Chapter.findById(savedChapter._id).populate('mcqs');
      res.status(201).json(populatedChapter);
    } catch (err) {
      console.error('Error adding chapter:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * @desc    Get all chapters for a specific course
   * @route   GET /api/courses/:courseId/chapters
   * @access  Public
   */
  getAllChapters: async (req, res) => {
    try {
      const { courseId } = req.params;
      const chapters = await Chapter.find({ courseId }).populate('mcqs');

      res.status(200).json(chapters);
    } catch (err) {
      console.error('Error getting all chapters:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * @desc    Get a single chapter by its ID
   * @route   GET /api/courses/:courseId/chapters/:chapterId
   * @access  Public
   */
  getChapterById: async (req, res) => {
    try {
      const { chapterId } = req.params;
      const chapter = await Chapter.findById(chapterId).populate('mcqs');

      if (!chapter) {
        return res.status(404).json({ message: 'Chapter not found' });
      }

      res.status(200).json(chapter);
    } catch (err) {
      console.error('Error getting chapter by ID:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * @desc    Update a chapter
   * @route   PUT /api/courses/:courseId/chapters/:chapterId
   * @access  Admin
   */
  updateChapter: async (req, res) => {
    try {
      const { chapterId } = req.params;
      const { mcqs, tasks, ...chapterData } = req.body;

      // Update chapter basic data first
      const updatedChapter = await Chapter.findByIdAndUpdate(
        chapterId,
        { ...chapterData, tasks: tasks || [] },
        { new: true }
      );

      if (!updatedChapter) {
        return res.status(404).json({ message: 'Chapter not found' });
      }

      // Handle MCQs separately if provided
      if (mcqs && Array.isArray(mcqs)) {
        // Delete existing MCQs for this chapter
        await Mcq.deleteMany({ chapterId });

        // Create new MCQs if any
        if (mcqs.length > 0) {
          const mcqPromises = mcqs.map(mcqData => {
            const mcq = new Mcq({
              ...mcqData,
              chapterId: chapterId,
              courseId: updatedChapter.courseId
            });
            return mcq.save();
          });

          const savedMcqs = await Promise.all(mcqPromises);

          // Update chapter with new MCQ references
          updatedChapter.mcqs = savedMcqs.map(mcq => mcq._id);
          await updatedChapter.save();
        } else {
          // No MCQs provided, clear the array
          updatedChapter.mcqs = [];
          await updatedChapter.save();
        }
      }

      // Return populated chapter
      const populatedChapter = await Chapter.findById(chapterId).populate('mcqs');
      res.status(200).json(populatedChapter);
    } catch (err) {
      console.error('Error updating chapter:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * @desc    Delete a chapter from a course
   * @route   DELETE /api/courses/:courseId/chapters/:chapterId
   * @access  Admin
   */
  deleteChapter: async (req, res) => {
    try {
      const { chapterId } = req.params;

      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: 'Chapter not found' });
      }

      // Remove chapter reference from course
      await Course.findByIdAndUpdate(
        chapter.courseId,
        { $pull: { chapters: chapterId } }
      );

      // Delete all MCQs associated with this chapter
      await Mcq.deleteMany({ chapterId });

      await Chapter.findByIdAndDelete(chapterId);

      res.status(200).json({ message: 'Chapter deleted successfully' });
    } catch (err) {
      console.error('Error deleting chapter:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * @desc    Generate a presigned URL to stream the chapter video
   * @route   GET /api/courses/:courseId/chapters/:chapterId/video-url
   * @access  Private (Auth required)
   */
  getVideoUrl: async (req, res) => {
    try {
      const { chapterId } = req.params;

      // Fetch chapter
      const chapter = await Chapter.findById(chapterId);
      if (!chapter || !chapter.videoUrl) {
        return res.status(404).json({ message: 'Video not found for this chapter.' });
      }

      // Directly return the stored URL (Firebase or other)
      // Since the user is moving away from S3 signing
      res.status(200).json({ videoUrl: chapter.videoUrl });

    } catch (err) {
      console.error("❌ Error retrieving video URL:", err);
      res.status(500).json({
        message: 'Failed to retrieve video access link.',
        error: err.message
      });
    }
  },

  /**
   * @desc    Update video watch progress
   * @route   POST /api/courses/:courseId/chapters/:chapterId/progress
   * @access  Private
   */
  updateVideoProgress: async (req, res) => {
    try {
      const { chapterId } = req.params;
      const { watchedDuration, totalDuration } = req.body;
      const userId = req.user._id;

      let user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Ensure videoProgress array exists
      if (!user.videoProgress) {
        user.videoProgress = [];
      }

      // Find if progress exists for this chapter
      const progressIndex = user.videoProgress.findIndex(p => p.chapterId && p.chapterId.toString() === chapterId);

      if (progressIndex > -1) {
        // Update existing progress only if new duration is greater (max watched)
        const currentProgress = user.videoProgress[progressIndex];

        // Only update if watched more (prevent rewinding progress)
        if (watchedDuration > currentProgress.watchedDuration) {
          currentProgress.watchedDuration = watchedDuration;
        }

        // Always update these
        currentProgress.totalDuration = totalDuration || currentProgress.totalDuration;
        currentProgress.lastWatchedAt = new Date();

        // Mark as completed if > 90%
        if (totalDuration > 0 && (currentProgress.watchedDuration / totalDuration) > 0.9) {
          currentProgress.completed = true;
        }

        user.videoProgress[progressIndex] = currentProgress;
      } else {
        // Add new progress
        user.videoProgress.push({
          chapterId,
          watchedDuration: watchedDuration || 0,
          totalDuration: totalDuration || 0,
          lastWatchedAt: new Date(),
          completed: false
        });
      }

      await user.save();

      const savedProgress = user.videoProgress.find(p => p.chapterId && p.chapterId.toString() === chapterId);
      res.status(200).json({ success: true, progress: savedProgress });

    } catch (err) {
      console.error("Error updating video progress:", err);
      res.status(500).json({ message: 'Server error updating progress' });
    }
  },

  /**
   * @desc    Get video watch progress
   * @route   GET /api/courses/:courseId/chapters/:chapterId/progress
   * @access  Private
   */
  getVideoProgress: async (req, res) => {
    try {
      const { chapterId } = req.params;
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Initialize if undefined
      if (!user.videoProgress) {
        return res.status(200).json({ watchedDuration: 0, completed: false });
      }

      const progress = user.videoProgress.find(p => {
        try {
          return p.chapterId && p.chapterId.toString() === chapterId;
        } catch (e) {
          return false;
        }
      });

      if (!progress) {
        return res.status(200).json({ watchedDuration: 0, completed: false });
      }

      res.status(200).json(progress);

    } catch (err) {
      console.error("Error fetching video progress:", err);
      res.status(500).json({ message: 'Server error fetching progress', error: err.message });
    }
  }
};

module.exports = chapterController;