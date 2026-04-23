const express = require('express');
const router = express.Router();
const { searchUsers, getUserProfile } = require('../controllers/userController');
const { protect } = require('../middlewares/auth');

router.use(protect);
router.get('/search', searchUsers);
router.get('/:id', getUserProfile);

module.exports = router;
