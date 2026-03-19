const Workflow = require('../models/Workflow');
const Execution = require('../models/Execution');
const Step = require('../models/Step');

// @desc Get dashboard statistics
// @route GET /api/dashboard/stats
const getStats = async (req, res, next) => {
  try {
    const [
      totalWorkflows,
      activeWorkflows,
      totalExecutions,
      completedExecutions,
      failedExecutions,
      inProgressExecutions,
      totalSteps
    ] = await Promise.all([
      Workflow.countDocuments(),
      Workflow.countDocuments({ is_active: true }),
      Execution.countDocuments(),
      Execution.countDocuments({ status: 'completed' }),
      Execution.countDocuments({ status: 'failed' }),
      Execution.countDocuments({ status: 'in_progress' }),
      Step.countDocuments()
    ]);

    const successRate = totalExecutions > 0 ? Math.round((completedExecutions / totalExecutions) * 100) : 0;

    res.json({
      success: true,
      data: {
        workflows: { total: totalWorkflows, active: activeWorkflows, inactive: totalWorkflows - activeWorkflows },
        executions: {
          total: totalExecutions,
          completed: completedExecutions,
          failed: failedExecutions,
          in_progress: inProgressExecutions,
          success_rate: successRate
        },
        steps: { total: totalSteps }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get execution trend (last 7 days)
// @route GET /api/dashboard/execution-trend
const getExecutionTrend = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const executions = await Execution.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Build daily data
    const trend = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = { date: dateStr, completed: 0, failed: 0, in_progress: 0, total: 0 };
      executions.forEach(e => {
        if (e._id.date === dateStr) {
          dayData[e._id.status] = e.count;
          dayData.total += e.count;
        }
      });
      trend.push(dayData);
    }

    res.json({ success: true, data: trend });
  } catch (err) {
    next(err);
  }
};

// @desc Get top workflows by executions
// @route GET /api/dashboard/top-workflows
const getTopWorkflows = async (req, res, next) => {
  try {
    const workflows = await Workflow.find()
      .sort({ execution_count: -1 })
      .limit(5)
      .select('name execution_count is_active category last_executed_at');

    res.json({ success: true, data: workflows });
  } catch (err) {
    next(err);
  }
};

// @desc Get recent executions
// @route GET /api/dashboard/recent-executions
const getRecentExecutions = async (req, res, next) => {
  try {
    const executions = await Execution.find()
      .populate('triggered_by', 'name email')
      .sort({ created_at: -1 })
      .limit(10)
      .select('-logs');

    res.json({ success: true, data: executions });
  } catch (err) {
    next(err);
  }
};

// @desc Get status distribution
// @route GET /api/dashboard/status-distribution
const getStatusDistribution = async (req, res, next) => {
  try {
    const distribution = await Execution.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({ success: true, data: distribution });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getExecutionTrend, getTopWorkflows, getRecentExecutions, getStatusDistribution };
