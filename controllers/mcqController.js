const Mcq = require("../models/Mcq");
const Chapter = require("../models/Chapter");
const Course = require("../models/Course");
const User = require("../models/User");
const Level = require("../models/Level");
const Process = require('../models/Process');

// ✅ Create a new MCQ
exports.createMcq = async (req, res) => {
  try {
    const { question, options, correctAnswerIndex, explanation } = req.body;
    const { chapterId } = req.params; // Get from URL params since you're using mergeParams

    // Validate chapter exists
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    const mcq = new Mcq({
      question,
      options,
      correctAnswerIndex: Number(correctAnswerIndex), // Ensure it's a number
      explanation,
      chapterId,
      courseId: chapter.courseId,
    });

    const savedMcq = await mcq.save();

    // Add MCQ reference to chapter (not the full object)
    await Chapter.findByIdAndUpdate(
      chapterId,
      { $push: { mcqs: savedMcq._id } }, // Push ObjectId, not the full object
      { new: true },
    );

    res.status(201).json(savedMcq);
  } catch (err) {
    console.error("Error creating MCQ:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// ✅ Get all MCQs for a chapter
exports.getMcqsByChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;

    const mcqs = await Mcq.find({ chapterId });
    res.status(200).json(mcqs);
  } catch (err) {
    console.error("Error getting MCQs:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// ✅ Update an MCQ
exports.updateMcq = async (req, res) => {
  try {
    const { mcqId } = req.params; // Changed from 'id' to 'mcqId' to match your route
    const updateData = { ...req.body };

    // Ensure correctAnswerIndex is a number
    if (updateData.correctAnswerIndex !== undefined) {
      updateData.correctAnswerIndex = Number(updateData.correctAnswerIndex);
    }

    const updatedMcq = await Mcq.findByIdAndUpdate(mcqId, updateData, {
      new: true,
    });

    if (!updatedMcq) {
      return res.status(404).json({ message: "MCQ not found" });
    }

    res.status(200).json(updatedMcq);
  } catch (err) {
    console.error("Error updating MCQ:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// ✅ Delete an MCQ
exports.deleteMcq = async (req, res) => {
  try {
    const { mcqId } = req.params; // Changed from 'id' to 'mcqId' to match your route

    const mcq = await Mcq.findById(mcqId);
    if (!mcq) {
      return res.status(404).json({ message: "MCQ not found" });
    }

    // Remove MCQ reference from chapter
    await Chapter.findByIdAndUpdate(mcq.chapterId, { $pull: { mcqs: mcqId } });

    await Mcq.findByIdAndDelete(mcqId);
    res.status(200).json({ message: "MCQ deleted successfully" });
  } catch (err) {
    console.error("Error deleting MCQ:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// ✅ Submit MCQ results with sequential course completion logic + attempt tracking
exports.submitMcqResult = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { answers } = req.body;
    const userId = req.user._id;

    console.log("Submitting MCQ for chapter:", chapterId, "User:", userId);

    // Find chapter and populate its MCQs
    const chapter = await Chapter.findById(chapterId).populate("mcqs");
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found." });
    }

    if (!chapter.mcqs || chapter.mcqs.length === 0) {
      return res
        .status(400)
        .json({ message: "No MCQs found for this chapter." });
    }

    console.log("Found MCQs:", chapter.mcqs.length);

    // Calculate score
    let correctAnswers = 0;

    chapter.mcqs.forEach((mcq) => {
      const userAnswer = answers[mcq._id];
      const correctAnswer = mcq.correctAnswerIndex;

      if (userAnswer !== undefined && Number(userAnswer) === correctAnswer) {
        correctAnswers++;
      }
    });

    const scorePercentage = (correctAnswers / chapter.mcqs.length) * 100;
    const roundedScore = Math.round(scorePercentage);

    console.log(
      `Score: ${correctAnswers}/${chapter.mcqs.length} = ${roundedScore}%`,
    );
    let process = await Process.findOne({
      userId,
      chapterId,
    });

    if (!process) {
      process = new Process({
        userId,
        chapterId,
        courseId: chapter.courseId,
      });
    }

    // increase attempts
    process.attempts += 1;

    // update best score
    if (roundedScore > process.bestScore) {
      process.bestScore = roundedScore;
    }

    // mark completed
    if (roundedScore === 100) {
      process.completed = true;
    }

    await process.save();

    // Get user
    const user = await User.findById(userId);

    // 🔹 Find existing result to track attempts
    const existingResult = user.mcqResults.find(
      (r) => r.chapterId.toString() === chapterId,
    );

    let attempts = 1;

    if (existingResult) {
      attempts = existingResult.attempts + 1;
    }

    // 🔹 Create new result
    const newResult = {
      chapterId,
      score: roundedScore,
      attempts,
      userAnswers: answers,
      completedAt: new Date(),
    };

    // Remove old result
    user.mcqResults = user.mcqResults.filter(
      (r) => r.chapterId.toString() !== chapterId,
    );

    // Add updated result
    user.mcqResults.push(newResult);
    user.markModified("mcqResults");

    // ✅ Only chapters with 100% score count as completed
    const course = await Course.findById(chapter.courseId).populate("chapters");

    const allChapterIdsInCourse = course.chapters.map((ch) =>
      ch._id.toString(),
    );

    const completedChapterIds = user.mcqResults
      .filter((r) => r.score === 100)
      .map((r) => r.chapterId.toString());

    const isCourseComplete = allChapterIdsInCourse.every((id) =>
      completedChapterIds.includes(id),
    );

    let courseJustCompleted = false;
    let levelJustCompleted = false;
    let nextLevelUnlocked = false;

    if (isCourseComplete) {
      const wasAlreadyCompleted = user.completedCourses
        .map((id) => id.toString())
        .includes(course._id.toString());

      if (!wasAlreadyCompleted) {
        user.completedCourses.push(course._id);
        courseJustCompleted = true;

        console.log("Course just completed!", course.title);

        // Check level completion
        const currentLevel = await Level.findOne({
          levelNumber: user.currentLevel,
        }).populate("courses");

        if (currentLevel) {
          const completedCourseIds = user.completedCourses.map((id) =>
            id.toString(),
          );

          const coursesInLevel = currentLevel.courses;

          const allCoursesInLevelCompleted = coursesInLevel.every(
            (levelCourse) =>
              completedCourseIds.includes(levelCourse._id.toString()),
          );

          if (allCoursesInLevelCompleted) {
            levelJustCompleted = true;

            const nextLevel = await Level.findOne({
              levelNumber: user.currentLevel + 1,
            });

            if (nextLevel) {
              user.currentLevel += 1;

              if (!user.accessibleLevels.includes(user.currentLevel)) {
                user.accessibleLevels.push(user.currentLevel);
              }

              nextLevelUnlocked = true;

              console.log("Next level unlocked!", user.currentLevel);
            }
          }
        }
      }
    }

    await user.save();

    const response = {
      user,
      result: newResult,
      attempts,
      correctAnswers: chapter.mcqs.map((mcq) => ({
        mcqId: mcq._id,
        answer: mcq.correctAnswerIndex,
        explanation: mcq.explanation,
      })),
      completionStatus: {
        chapterCompleted: roundedScore === 100,
        courseCompleted: isCourseComplete,
        courseJustCompleted,
        levelJustCompleted,
        nextLevelUnlocked,
        currentLevel: user.currentLevel,
        accessibleLevels: user.accessibleLevels,
      },
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error submitting MCQ result:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// ✅ Get user's course progress for a specific course
exports.getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const course = await Course.findById(courseId).populate("chapters");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const totalChapters = course.chapters.length;
    const completedChapterIds = user.mcqResults.map((r) =>
      r.chapterId.toString(),
    );

    const chaptersProgress = course.chapters.map((chapter) => {
      const chapterResult = user.mcqResults.find(
        (r) => r.chapterId.toString() === chapter._id.toString(),
      );
      return {
        chapterId: chapter._id,
        title: chapter.title,
        isCompleted: !!chapterResult,
        score: chapterResult ? chapterResult.score : null,
        completedAt: chapterResult ? chapterResult.completedAt : null,
      };
    });

    const completedChapters = chaptersProgress.filter(
      (ch) => ch.isCompleted,
    ).length;
    const progressPercentage =
      totalChapters > 0
        ? Math.round((completedChapters / totalChapters) * 100)
        : 0;

    const isCourseCompleted = user.completedCourses
      .map((id) => id.toString())
      .includes(courseId);

    res.status(200).json({
      courseId,
      courseTitle: course.title,
      totalChapters,
      completedChapters,
      progressPercentage,
      isCourseCompleted,
      chaptersProgress,
    });
  } catch (err) {
    console.error("Error getting course progress:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
