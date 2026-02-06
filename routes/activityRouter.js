const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { createActivity, getUserActivities, deleteActivity, getUserActivitiesById } = require('../controllers/activityController');

// All routes require auth
router.use(auth);

router.route('/')
    .post(createActivity)
    .get(getUserActivities);

router.route('/user/:userId')
    .get(getUserActivitiesById);

router.route('/:id')
    .delete(deleteActivity);

module.exports = router;
