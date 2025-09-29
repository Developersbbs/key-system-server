// Add this to your existing user/member controller file

const User = require('../models/User');
const Chapter = require('../models/Chapter');
const Course = require('../models/Course');

// ✅ NEW: Get user's quiz results with chapter and course names
exports.getUserQuizResults = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user with populated mcqResults
    const user = await User.findById(userId);
    if (!user || !user.mcqResults || user.mcqResults.length === 0) {
      return res.status(200).json([]);
    }

    // Get all unique chapter IDs from mcqResults
    const chapterIds = user.mcqResults.map(result => result.chapterId).filter(Boolean);
    
    if (chapterIds.length === 0) {
      return res.status(200).json([]);
    }

    // Fetch chapters with course info
    const chapters = await Chapter.find({ 
      _id: { $in: chapterIds } 
    }).populate({
      path: 'courseId',
      select: 'title _id'
    });

    // Create a map for quick lookup
    const chapterMap = new Map();
    chapters.forEach(chapter => {
      chapterMap.set(chapter._id.toString(), {
        chapterTitle: chapter.title,
        courseTitle: chapter.courseId?.title || 'Unknown Course',
        courseId: chapter.courseId?._id
      });
    });

    // Map quiz results with chapter and course info
    const quizResultsWithNames = user.mcqResults
      .filter(result => {
        // Only include results for chapters that still exist
        return result.chapterId && chapterMap.has(result.chapterId.toString());
      })
      .map(result => {
        const chapterInfo = chapterMap.get(result.chapterId.toString());
        return {
          chapterId: result.chapterId,
          score: result.score,
          completedAt: result.completedAt,
          chapterTitle: chapterInfo.chapterTitle,
          courseTitle: chapterInfo.courseTitle,
          courseId: chapterInfo.courseId,
          userAnswers: result.userAnswers
        };
      })
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)); // Most recent first

    res.status(200).json(quizResultsWithNames);

  } catch (err) {
    console.error('Error fetching user quiz results:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ✅ NEW: Get detailed quiz statistics for user
exports.getUserQuizStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user || !user.mcqResults || user.mcqResults.length === 0) {
      return res.status(200).json({
        totalQuizzes: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passedQuizzes: 0,
        failedQuizzes: 0
      });
    }

    const scores = user.mcqResults.map(result => result.score).filter(score => score !== undefined);
    
    if (scores.length === 0) {
      return res.status(200).json({
        totalQuizzes: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passedQuizzes: 0,
        failedQuizzes: 0
      });
    }

    const totalQuizzes = scores.length;
    const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / totalQuizzes);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const passedQuizzes = scores.filter(score => score >= 50).length; // Assuming 50% is passing
    const failedQuizzes = totalQuizzes - passedQuizzes;

    res.status(200).json({
      totalQuizzes,
      averageScore,
      highestScore,
      lowestScore,
      passedQuizzes,
      failedQuizzes,
      passRate: Math.round((passedQuizzes / totalQuizzes) * 100)
    });

  } catch (err) {
    console.error('Error fetching user quiz stats:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};