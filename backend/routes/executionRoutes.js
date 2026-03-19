const express = require('express');
const router = express.Router();
const { getExecutions, getExecution, cancelExecution, retryExecution, processApproval } = require('../controllers/executionController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/executions', getExecutions);
router.get('/executions/:id', getExecution);
router.post('/executions/:id/cancel', cancelExecution);
router.post('/executions/:id/retry', retryExecution);
router.post('/executions/:id/approve', processApproval);

module.exports = router;
