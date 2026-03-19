const Workflow = require('../models/Workflow');
const Step = require('../models/Step');
const Rule = require('../models/Rule');
const { v4: uuidv4 } = require('uuid');

// @desc Get all workflows
// @route GET /api/workflows
const getWorkflows = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status, category } = req.query;

    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (status === 'active') query.is_active = true;
    if (status === 'inactive') query.is_active = false;
    if (category) query.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Workflow.countDocuments(query);
    
    const workflows = await Workflow.find(query)
      .populate('created_by', 'name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get step counts for each workflow
    const workflowsWithCounts = await Promise.all(workflows.map(async (wf) => {
      const stepCount = await Step.countDocuments({ workflow_id: wf._id });
      const obj = wf.toJSON();
      obj.step_count = stepCount;
      return obj;
    }));

    res.json({
      success: true,
      data: workflowsWithCounts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get workflow by ID
// @route GET /api/workflows/:id
const getWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id).populate('created_by', 'name email');
    if (!workflow) return res.status(404).json({ success: false, message: 'Workflow not found' });

    const steps = await Step.find({ workflow_id: workflow._id }).sort({ order: 1 });
    const stepsWithRules = await Promise.all(steps.map(async (step) => {
      const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });
      return { ...step.toJSON(), rules };
    }));

    res.json({ success: true, data: { ...workflow.toJSON(), steps: stepsWithRules } });
  } catch (err) {
    next(err);
  }
};

// @desc Create workflow
// @route POST /api/workflows
const createWorkflow = async (req, res, next) => {
  try {
    const { name, description, input_schema, tags, category } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Workflow name is required' });

    const workflow = await Workflow.create({
      _id: uuidv4(),
      name,
      description,
      input_schema: input_schema || {},
      tags: tags || [],
      category: category || 'General',
      created_by: req.user._id,
      version: 1,
      is_active: false
    });

    res.status(201).json({ success: true, message: 'Workflow created successfully', data: workflow });
  } catch (err) {
    next(err);
  }
};

// @desc Update workflow
// @route PUT /api/workflows/:id
const updateWorkflow = async (req, res, next) => {
  try {
    const { name, description, input_schema, is_active, start_step_id, tags, category } = req.body;

    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, message: 'Workflow not found' });

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (input_schema !== undefined) updateData.input_schema = input_schema;
    if (tags !== undefined) updateData.tags = tags;
    if (category !== undefined) updateData.category = category;
    if (start_step_id !== undefined) updateData.start_step_id = start_step_id;

    // Increment version on schema/config changes
    if (input_schema !== undefined) {
      updateData.version = workflow.version + 1;
    }

    if (is_active !== undefined) {
      // Validate before activating
      if (is_active && !workflow.start_step_id && !start_step_id) {
        const stepCount = await Step.countDocuments({ workflow_id: workflow._id });
        if (stepCount === 0) {
          return res.status(400).json({ success: false, message: 'Cannot activate workflow with no steps' });
        }
      }
      updateData.is_active = is_active;
    }

    const updated = await Workflow.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.json({ success: true, message: 'Workflow updated successfully', data: updated });
  } catch (err) {
    next(err);
  }
};

// @desc Delete workflow
// @route DELETE /api/workflows/:id
const deleteWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, message: 'Workflow not found' });

    // Delete all related steps and rules
    const steps = await Step.find({ workflow_id: workflow._id });
    for (const step of steps) {
      await Rule.deleteMany({ step_id: step._id });
    }
    await Step.deleteMany({ workflow_id: workflow._id });
    await Workflow.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Workflow and all related data deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc Toggle workflow active status
// @route PATCH /api/workflows/:id/toggle
const toggleWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, message: 'Workflow not found' });

    if (!workflow.is_active) {
      // Validate before activating
      if (!workflow.start_step_id) {
        return res.status(400).json({ success: false, message: 'Set a start step before activating' });
      }
    }

    workflow.is_active = !workflow.is_active;
    await workflow.save();

    res.json({
      success: true,
      message: `Workflow ${workflow.is_active ? 'activated' : 'deactivated'} successfully`,
      data: workflow
    });
  } catch (err) {
    next(err);
  }
};

// @desc Duplicate workflow
// @route POST /api/workflows/:id/duplicate
const duplicateWorkflow = async (req, res, next) => {
  try {
    const original = await Workflow.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, message: 'Workflow not found' });

    const newId = uuidv4();
    const newWorkflow = await Workflow.create({
      _id: newId,
      name: `${original.name} (Copy)`,
      description: original.description,
      input_schema: original.input_schema,
      tags: original.tags,
      category: original.category,
      created_by: req.user._id,
      version: 1,
      is_active: false
    });

    // Duplicate steps and rules
    const steps = await Step.find({ workflow_id: original._id }).sort({ order: 1 });
    const stepIdMap = {};

    for (const step of steps) {
      const newStepId = uuidv4();
      stepIdMap[step._id] = newStepId;

      await Step.create({
        _id: newStepId,
        workflow_id: newId,
        name: step.name,
        description: step.description,
        step_type: step.step_type,
        order: step.order,
        metadata: step.metadata,
        is_terminal: step.is_terminal,
        timeout_seconds: step.timeout_seconds,
        retry_config: step.retry_config
      });
    }

    // Duplicate rules with updated step IDs
    for (const step of steps) {
      const rules = await Rule.find({ step_id: step._id });
      for (const rule of rules) {
        await Rule.create({
          _id: uuidv4(),
          step_id: stepIdMap[step._id],
          name: rule.name,
          condition: rule.condition,
          next_step_id: rule.next_step_id ? stepIdMap[rule.next_step_id] || rule.next_step_id : null,
          priority: rule.priority,
          is_default: rule.is_default,
          description: rule.description
        });
      }
    }

    // Update start step
    if (original.start_step_id && stepIdMap[original.start_step_id]) {
      await Workflow.findByIdAndUpdate(newId, { start_step_id: stepIdMap[original.start_step_id] });
    }

    res.status(201).json({ success: true, message: 'Workflow duplicated successfully', data: newWorkflow });
  } catch (err) {
    next(err);
  }
};

module.exports = { getWorkflows, getWorkflow, createWorkflow, updateWorkflow, deleteWorkflow, toggleWorkflow, duplicateWorkflow };
