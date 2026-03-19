const express = require('express');
const router = express.Router();
const { getStats, getExecutionTrend, getTopWorkflows, getRecentExecutions, getStatusDistribution } = require('../controllers/dashboardController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/stats', getStats);
router.get('/execution-trend', getExecutionTrend);
router.get('/top-workflows', getTopWorkflows);
router.get('/recent-executions', getRecentExecutions);
router.get('/status-distribution', getStatusDistribution);

module.exports = router;
