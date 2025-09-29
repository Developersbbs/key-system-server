const User = require('../models/User');
const Course = require('../models/Course');
const Level = require('../models/Level');
const Chapter = require('../models/Chapter');
const Mcq = require('../models/Mcq');

exports.submitMcqResult = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { answers } = req.body;
    const userId = req.user._id;

    // Find chapter and populate its MCQs properly
    const chapter = await Chapter.findById(chapterId).populate('mcqs');
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found.' });
    }
    
    if (!chapter.mcqs || chapter.mcqs.length === 0) {
      return res.status(400).json({ message: 'No MCQs found for this chapter.' });
    }

    // Calculate score
    let correctAnswers = 0;
    chapter.mcqs.forEach(mcq => {
      if (answers[mcq._id] !== undefined && Number(answers[mcq._id]) === mcq.correctAnswerIndex) {
        correctAnswers++;
      }
    });
    
    const scorePercentage = (correctAnswers / chapter.mcqs.length) * 100;

    // Save result to user
    const user = await User.findById(userId);
    const newResult = { 
      chapterId, 
      score: Math.round(scorePercentage), 
      userAnswers: answers 
    };
    
    // Remove any existing result for this chapter
    user.mcqResults = user.mcqResults.filter(r => r.chapterId.toString() !== chapterId);
    user.mcqResults.push(newResult);
    user.markModified('mcqResults');

    // Check for course and level completion
    const course = await Course.findById(chapter.courseId);
    const allChapterIdsInCourse = course.chapters.map(ch => ch.toString());
    const completedChapterIds = user.mcqResults.map(r => r.chapterId.toString());

    const isCourseComplete = allChapterIdsInCourse.every(id => completedChapterIds.includes(id));

    if (isCourseComplete) {
      if (!user.completedCourses.map(id => id.toString()).includes(course._id.toString())) {
        user.completedCourses.push(course._id);
      }

      // Check if this completes the whole LEVEL
      const currentLevel = await Level.findOne({ levelNumber: user.currentLevel });
      if (currentLevel) {
        const completedCourseIds = user.completedCourses.map(id => id.toString());
        const allCoursesInLevelCompleted = currentLevel.courses.every(courseId => 
          completedCourseIds.includes(courseId.toString())
        );

        if (allCoursesInLevelCompleted) {
          // Check if a next level exists
          const nextLevel = await Level.findOne({ levelNumber: user.currentLevel + 1 });
          if (nextLevel) {
            user.currentLevel += 1; // UNLOCK NEXT LEVEL!
          }
        }
      }
    }
    
    await user.save();
    
    res.status(200).json({ 
      user,
      result: newResult, 
      correctAnswers: chapter.mcqs.map(mcq => ({ 
        mcqId: mcq._id, 
        answer: mcq.correctAnswerIndex,
        explanation: mcq.explanation 
      }))
    });

  } catch (err) {
    console.error("Error submitting MCQ result:", err);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.completeCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = await User.findById(req.user._id);

    // Add course to completed list if not already there
    if (!user.completedCourses.includes(courseId)) {
      user.completedCourses.push(courseId);
    }

    // Check for level progression
    const currentLevel = await Level.findOne({ levelNumber: user.currentLevel });
    if (currentLevel) {
      // Check if all courses in the current level are now completed
      const allCoursesInLevelCompleted = currentLevel.courses.every(course => 
        user.completedCourses.map(id => id.toString()).includes(course._id.toString())
      );

      if (allCoursesInLevelCompleted) {
        // Check if a next level exists
        const nextLevel = await Level.findOne({ levelNumber: user.currentLevel + 1 });
        if (nextLevel) {
          user.currentLevel += 1; // Advance to the next level
        }
      }
    }
    
    await user.save();
    res.status(200).json(user); // Return updated user object
  } catch(err) {
    res.status(500).json({ message: "Server Error" });
  }
};