const Execution = require('../models/Execution');
const executionEngine = require('../services/executionEngine');

// @desc Start workflow execution
// @route POST /api/workflows/:workflow_id/execute
const startExecution = async (req, res, next) => {
  try {
    const { workflow_id } = req.params;
    const inputData = req.body.data || req.body;

    const execution = await executionEngine.startExecution(
      workflow_id,
      inputData,
      req.user._id,
      req.user.name
    );

    res.status(201).json({
      success: true,
      message: 'Execution started',
      data: execution
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get all executions
// @route GET /api/executions
const getExecutions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, workflow_id } = req.query;
    const query = {};
    if (status) query.status = status;
    if (workflow_id) query.workflow_id = workflow_id;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Execution.countDocuments(query);
    const executions = await Execution.find(query)
      .populate('triggered_by', 'name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-logs');

    res.json({
      success: true,
      data: executions,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get single execution with logs
// @route GET /api/executions/:id
const getExecution = async (req, res, next) => {
  try {
    const execution = await Execution.findById(req.params.id).populate('triggered_by', 'name email');
    if (!execution) return res.status(404).json({ success: false, message: 'Execution not found' });
    res.json({ success: true, data: execution });
  } catch (err) {
    next(err);
  }
};

// @desc Cancel an execution
// @route POST /api/executions/:id/cancel
const cancelExecution = async (req, res, next) => {
  try {
    const execution = await executionEngine.cancelExecution(req.params.id);
    res.json({ success: true, message: 'Execution canceled', data: execution });
  } catch (err) {
    next(err);
  }
};

// @desc Retry a failed execution
// @route POST /api/executions/:id/retry
const retryExecution = async (req, res, next) => {
  try {
    const execution = await executionEngine.retryExecution(req.params.id);
    res.json({ success: true, message: 'Execution retrying', data: execution });
  } catch (err) {
    next(err);
  }
};

// @desc Process approval
// @route POST /api/executions/:id/approve
const processApproval = async (req, res, next) => {
  try {
    const { step_id, action, comment } = req.body;
    if (!step_id || !action) return res.status(400).json({ success: false, message: 'step_id and action required' });
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, message: 'action must be approve or reject' });

    await executionEngine.processApproval(req.params.id, step_id, action, req.user.email, comment);
    res.json({ success: true, message: `Step ${action}d successfully` });
  } catch (err) {
    next(err);
  }
};

// @desc Get executions for a workflow
// @route GET /api/workflows/:workflow_id/executions
const getWorkflowExecutions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { workflow_id: req.params.workflow_id };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Execution.countDocuments(query);
    const executions = await Execution.find(query)
      .populate('triggered_by', 'name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-logs');

    res.json({
      success: true,
      data: executions,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { startExecution, getExecutions, getExecution, cancelExecution, retryExecution, processApproval, getWorkflowExecutions };
