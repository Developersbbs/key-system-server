const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const Mcq = require('../models/Mcq');

// AWS SDK for S3 signed URLs
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

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

      console.log(`📥 Request for video URL for chapter: ${chapterId}`);

      // Fetch chapter
      const chapter = await Chapter.findById(chapterId);
      if (!chapter || !chapter.videoUrl) {
        console.log(`❌ Chapter ${chapterId} not found or has no video URL`);
        return res.status(404).json({ message: 'Video not found for this chapter.' });
      }

      // Extract S3 key from videoUrl
      const urlParts = chapter.videoUrl.split('.amazonaws.com/');
      if (urlParts.length < 2) {
        console.log(`❌ Invalid video URL format: ${chapter.videoUrl}`);
        return res.status(400).json({ message: 'Invalid video URL stored for this chapter.' });
      }

      let key = urlParts[1]; // e.g., videos/filename.mp4
      if (key.startsWith('/')) {
        key = key.substring(1); // Remove leading slash
      }

      const bucketName = process.env.AWS_S3_BUCKET_NAME;
      if (!bucketName) {
        console.log("❌ S3 bucket name not configured");
        return res.status(500).json({ message: 'AWS S3 bucket name not configured' });
      }

      // Initialize S3 client
      const s3Client = new S3Client({
        region: process.env.AWS_S3_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

      console.log("✅ Presigned GET URL generated successfully");
      res.status(200).json({ videoUrl: signedUrl });

    } catch (err) {
      console.error("❌ Error generating presigned GET URL:", err);
      if (err.name === 'NoSuchKey') {
        return res.status(404).json({ message: 'The requested video file was not found in storage.' });
      }
      res.status(500).json({ 
        message: 'Failed to generate video access link.', 
        error: err.message 
      });
    }
  }
};

module.exports = chapterController;