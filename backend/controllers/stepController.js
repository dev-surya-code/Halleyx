const Step = require('../models/Step');
const Workflow = require('../models/Workflow');
const Rule = require('../models/Rule');
const { v4: uuidv4 } = require('uuid');

// @desc Get steps for a workflow
// @route GET /api/workflows/:workflow_id/steps
const getSteps = async (req, res, next) => {
  try {
    const steps = await Step.find({ workflow_id: req.params.workflow_id }).sort({ order: 1 });

    const stepsWithRules = await Promise.all(steps.map(async (step) => {
      const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });
      return { ...step.toJSON(), rules };
    }));

    res.json({ success: true, data: stepsWithRules });
  } catch (err) {
    next(err);
  }
};

// @desc Create a step
// @route POST /api/workflows/:workflow_id/steps
const createStep = async (req, res, next) => {
  try {
    const { name, description, step_type, order, metadata, is_terminal, timeout_seconds, retry_config } = req.body;
    const { workflow_id } = req.params;

    const workflow = await Workflow.findById(workflow_id);
    if (!workflow) return res.status(404).json({ success: false, message: 'Workflow not found' });

    if (!name || !step_type) {
      return res.status(400).json({ success: false, message: 'Step name and type are required' });
    }

    // Auto-assign order if not provided
    let stepOrder = order;
    if (stepOrder === undefined) {
      const maxStep = await Step.findOne({ workflow_id }).sort({ order: -1 });
      stepOrder = maxStep ? maxStep.order + 1 : 0;
    }

    const step = await Step.create({
      _id: uuidv4(),
      workflow_id,
      name,
      description,
      step_type,
      order: stepOrder,
      metadata: metadata || {},
      is_terminal: is_terminal || false,
      timeout_seconds: timeout_seconds || null,
      retry_config: retry_config || { max_retries: 0, retry_delay_seconds: 30 }
    });

    // If this is the first step, set as start step
    if (!workflow.start_step_id) {
      await Workflow.findByIdAndUpdate(workflow_id, { start_step_id: step._id });
    }

    res.status(201).json({ success: true, message: 'Step created successfully', data: step });
  } catch (err) {
    next(err);
  }
};

// @desc Update a step
// @route PUT /api/steps/:id
const updateStep = async (req, res, next) => {
  try {
    const { name, description, step_type, order, metadata, is_terminal, timeout_seconds, retry_config } = req.body;

    const step = await Step.findById(req.params.id);
    if (!step) return res.status(404).json({ success: false, message: 'Step not found' });

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (step_type !== undefined) updateData.step_type = step_type;
    if (order !== undefined) updateData.order = order;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (is_terminal !== undefined) updateData.is_terminal = is_terminal;
    if (timeout_seconds !== undefined) updateData.timeout_seconds = timeout_seconds;
    if (retry_config !== undefined) updateData.retry_config = retry_config;

    const updated = await Step.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.json({ success: true, message: 'Step updated successfully', data: updated });
  } catch (err) {
    next(err);
  }
};

// @desc Delete a step
// @route DELETE /api/steps/:id
const deleteStep = async (req, res, next) => {
  try {
    const step = await Step.findById(req.params.id);
    if (!step) return res.status(404).json({ success: false, message: 'Step not found' });

    // Delete associated rules
    await Rule.deleteMany({ step_id: step._id });
    
    // Remove references to this step from other rules
    await Rule.updateMany({ next_step_id: step._id }, { next_step_id: null });

    // If this was the start step, unset it
    const workflow = await Workflow.findById(step.workflow_id);
    if (workflow?.start_step_id === step._id) {
      const nextStep = await Step.findOne({ workflow_id: step.workflow_id, _id: { $ne: step._id } }).sort({ order: 1 });
      await Workflow.findByIdAndUpdate(step.workflow_id, { start_step_id: nextStep?._id || null });
    }

    await Step.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Step deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc Reorder steps
// @route PUT /api/workflows/:workflow_id/steps/reorder
const reorderSteps = async (req, res, next) => {
  try {
    const { steps } = req.body; // Array of { id, order }
    if (!Array.isArray(steps)) return res.status(400).json({ success: false, message: 'steps array required' });

    await Promise.all(steps.map(({ id, order }) =>
      Step.findByIdAndUpdate(id, { order })
    ));

    res.json({ success: true, message: 'Steps reordered successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSteps, createStep, updateStep, deleteStep, reorderSteps };
