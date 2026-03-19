const express = require('express');
const router = express.Router();
const {
  getWorkflows, getWorkflow, createWorkflow, updateWorkflow,
  deleteWorkflow, toggleWorkflow, duplicateWorkflow
} = require('../controllers/workflowController');
const { getWorkflowExecutions } = require('../controllers/executionController');
const { startExecution } = require('../controllers/executionController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/')
  .get(getWorkflows)
  .post(createWorkflow);

router.route('/:id')
  .get(getWorkflow)
  .put(updateWorkflow)
  .delete(deleteWorkflow);

router.patch('/:id/toggle', toggleWorkflow);
router.post('/:id/duplicate', duplicateWorkflow);
router.post('/:workflow_id/execute', startExecution);
router.get('/:workflow_id/executions', getWorkflowExecutions);

module.exports = router;
