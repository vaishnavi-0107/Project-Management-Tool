const express = require('express');
const router = express.Router();
const {
  getProjects, createProject, getProject, updateProject,
  deleteProject, addMember, removeMember, updateMemberRole,
} = require('../controllers/projectController');
const { protect } = require('../middlewares/auth');

router.use(protect);
router.route('/').get(getProjects).post(createProject);
router.route('/:id').get(getProject).put(updateProject).delete(deleteProject);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);
router.put('/:id/members/:userId/role', updateMemberRole);

module.exports = router;
