const express = require('express');
const router = express.Router();
const { getSteps, createStep, updateStep, deleteStep, reorderSteps } = require('../controllers/stepController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/workflows/:workflow_id/steps').get(getSteps).post(createStep);
router.put('/workflows/:workflow_id/steps/reorder', reorderSteps);
router.route('/steps/:id').put(updateStep).delete(deleteStep);

module.exports = router;
