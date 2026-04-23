const express = require('express');
const router = express.Router();
const {
  getBoards, createBoard, updateBoard, deleteBoard,
  addColumn, updateColumn, deleteColumn, reorderColumns,
} = require('../controllers/boardController');
const { protect } = require('../middlewares/auth');

router.use(protect);
router.route('/').get(getBoards).post(createBoard);
router.route('/:id').put(updateBoard).delete(deleteBoard);
router.post('/:id/columns', addColumn);
router.put('/:id/columns/reorder', reorderColumns);
router.route('/:id/columns/:columnId').put(updateColumn).delete(deleteColumn);

module.exports = router;
