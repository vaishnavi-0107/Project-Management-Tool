// ── routes/tasks.js ──────────────────────────────────────────
const express = require('express');
const taskRouter = express.Router();
const {
  getTasks, createTask, getTask, updateTask,
  deleteTask, reorderTasks, toggleWatch,
} = require('../controllers/taskController');
const { protect } = require('../middlewares/auth');

taskRouter.use(protect);
taskRouter.route('/').get(getTasks).post(createTask);
taskRouter.put('/reorder', reorderTasks);
taskRouter.route('/:id').get(getTask).put(updateTask).delete(deleteTask);
taskRouter.post('/:id/watch', toggleWatch);

module.exports = taskRouter;
