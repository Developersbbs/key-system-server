const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');
const { createLevel, getAllLevels, updateLevel, deleteLevel } = require('../controllers/levelController');

router.route('/')
  .post(auth, allowRoles(['admin']), createLevel)
  .get(auth, allowRoles(['admin', 'member']), getAllLevels);

router.route('/:id')
  .put(auth, allowRoles(['admin']), updateLevel)
  .delete(auth, allowRoles(['admin']), deleteLevel);

module.exports = router;