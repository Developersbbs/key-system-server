const Course = require('../models/Course');
const Level = require('../models/Level');

// @desc    Create a new course
exports.createCourse = async (req, res) => {
  try {
    const { title, description, category, image } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    const course = new Course({
      title,
      description,
      category,
      image,
      createdBy: req.user._id
    });
    
    const createdCourse = await course.save();
    res.status(201).json(createdCourse);

  } catch (err) {
    console.error('Error creating course:', err); 
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// ✅ MODIFIED: Sequential course unlock logic
exports.getMemberCourses = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.accessibleLevels) {
      return res.status(401).json({ message: 'Not authorized.' });
    }
    
    // Find all Level documents where the levelNumber is in the user's access list
    const unlockedLevels = await Level.find({ 
      levelNumber: { $in: user.accessibleLevels } 
    }).populate('courses');
    
    // Get all courses from unlocked levels
    const allAccessibleCourses = unlockedLevels.flatMap(level => level.courses);
    
    // ✅ NEW LOGIC: Only show courses that user can access sequentially
    const accessibleCourses = [];
    const completedCourseIds = user.completedCourses.map(id => id.toString());
    
    // Group courses by level for sequential unlocking
    for (const level of unlockedLevels) {
      const coursesInLevel = level.courses;
      
      // Find how many courses in this level the user has completed
      const completedCoursesInLevel = coursesInLevel.filter(course => 
        completedCourseIds.includes(course._id.toString())
      ).length;
      
      // Add completed courses
      coursesInLevel.forEach(course => {
        if (completedCourseIds.includes(course._id.toString())) {
          accessibleCourses.push({
            ...course.toObject(),
            isCompleted: true,
            isUnlocked: true
          });
        }
      });
      
      // Add the next unlocked course (if any)
      if (completedCoursesInLevel < coursesInLevel.length) {
        const nextCourse = coursesInLevel[completedCoursesInLevel];
        if (nextCourse && !completedCourseIds.includes(nextCourse._id.toString())) {
          accessibleCourses.push({
            ...nextCourse.toObject(),
            isCompleted: false,
            isUnlocked: true
          });
        }
      }
      
      // Add remaining locked courses for UI display
      if (completedCoursesInLevel + 1 < coursesInLevel.length) {
        const lockedCourses = coursesInLevel.slice(completedCoursesInLevel + 1);
        lockedCourses.forEach(course => {
          accessibleCourses.push({
            ...course.toObject(),
            isCompleted: false,
            isUnlocked: false
          });
        });
      }
    }

    res.status(200).json(accessibleCourses);
  } catch (err) {
    console.error('Error in getMemberCourses:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ✅ NEW CONTROLLER: Check if user can access a specific course
exports.canAccessCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authorized.' });
    }
    
    // Check if course is already completed
    const isCompleted = user.completedCourses.map(id => id.toString()).includes(courseId);
    if (isCompleted) {
      return res.status(200).json({ canAccess: true, reason: 'Course already completed' });
    }
    
    // Find which level this course belongs to
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const level = await Level.findOne({ courses: courseId });
    if (!level) {
      return res.status(404).json({ message: 'Level not found for this course' });
    }
    
    // Check if user has access to this level
    if (!user.accessibleLevels.includes(level.levelNumber)) {
      return res.status(403).json({ 
        canAccess: false, 
        reason: 'Level not unlocked yet' 
      });
    }
    
    // Check sequential order within the level
    const coursesInLevel = level.courses;
    const courseIndex = coursesInLevel.findIndex(c => c.toString() === courseId);
    
    if (courseIndex === -1) {
      return res.status(404).json({ message: 'Course not found in level' });
    }
    
    // Check if all previous courses in the level are completed
    const completedCourseIds = user.completedCourses.map(id => id.toString());
    const previousCourses = coursesInLevel.slice(0, courseIndex);
    
    const allPreviousCompleted = previousCourses.every(prevCourseId => 
      completedCourseIds.includes(prevCourseId.toString())
    );
    
    if (!allPreviousCompleted) {
      return res.status(403).json({ 
        canAccess: false, 
        reason: 'Previous courses must be completed first' 
      });
    }
    
    res.status(200).json({ canAccess: true, reason: 'Course is unlocked' });
    
  } catch (err) {
    console.error('Error in canAccessCourse:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ✅ NEW CONTROLLER: Get user's progress summary
exports.getUserProgress = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Not authorized.' });
    }
    
    const unlockedLevels = await Level.find({ 
      levelNumber: { $in: user.accessibleLevels } 
    }).populate('courses');
    
    const completedCourseIds = user.completedCourses.map(id => id.toString());
    
    const progressSummary = unlockedLevels.map(level => {
      const totalCourses = level.courses.length;
      const completedCourses = level.courses.filter(course => 
        completedCourseIds.includes(course._id.toString())
      ).length;
      
      // Find next unlocked course
      const nextCourseIndex = completedCourses;
      const nextCourse = nextCourseIndex < totalCourses ? level.courses[nextCourseIndex] : null;
      
      return {
        levelNumber: level.levelNumber,
        levelTitle: level.title,
        totalCourses,
        completedCourses,
        progressPercentage: Math.round((completedCourses / totalCourses) * 100),
        nextCourse: nextCourse ? {
          id: nextCourse._id,
          title: nextCourse.title,
          isUnlocked: true
        } : null,
        isLevelComplete: completedCourses === totalCourses
      };
    });
    
    res.status(200).json(progressSummary);
    
  } catch (err) {
    console.error('Error in getUserProgress:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ✅ NEW CONTROLLER: Get only admin-approved courses for public viewing
exports.getApprovedCourses = async (req, res) => {
  try {
    const approvedCourses = await Course.find({ 
      isApproved: true,    // Only approved courses
      isPublished: true    // Only published courses
    })
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json(approvedCourses);
  } catch (err) {
    console.error('Error fetching approved courses:', err);
    res.status(500).json({ 
      message: 'Failed to fetch approved courses',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

// @desc    Get all courses (Admin only)
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({}).populate('createdBy', 'name');
    res.status(200).json(courses);
  } catch (err) {
    console.error('Error getting all courses:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get a single course by ID
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (course) {
      res.status(200).json(course);
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  } catch (err) {
    console.error('Error getting course by ID:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a course
exports.updateCourse = async (req, res) => {
  try {
    const { title, description, category, image, isPublished, isApproved } = req.body;
    const course = await Course.findById(req.params.id);

    if (course) {
      course.title = title !== undefined ? title : course.title;
      course.description = description !== undefined ? description : course.description;
      course.category = category !== undefined ? category : course.category;
      course.image = image !== undefined ? image : course.image;
      course.isPublished = isPublished !== undefined ? isPublished : course.isPublished;
      course.isApproved = isApproved !== undefined ? isApproved : course.isApproved;

      const updatedCourse = await course.save();
      res.status(200).json(updatedCourse);
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a course
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (course) {
      await course.deleteOne();
      res.status(200).json({ message: 'Course removed' });
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};