const express = require('express');
const router = express.Router();
const { getComments, createComment, updateComment, deleteComment, toggleReaction } = require('../controllers/commentController');
const { protect } = require('../middlewares/auth');

router.use(protect);
router.route('/').get(getComments).post(createComment);
router.route('/:id').put(updateComment).delete(deleteComment);
router.post('/:id/react', toggleReaction);

module.exports = router;
