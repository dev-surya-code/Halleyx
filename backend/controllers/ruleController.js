const Rule = require('../models/Rule');
const Step = require('../models/Step');
const { validateCondition } = require('../rule-engine/ruleEngine');
const { v4: uuidv4 } = require('uuid');

// @desc Get rules for a step
// @route GET /api/steps/:step_id/rules
const getRules = async (req, res, next) => {
  try {
    const rules = await Rule.find({ step_id: req.params.step_id }).sort({ priority: 1 });
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
};

// @desc Create a rule
// @route POST /api/steps/:step_id/rules
const createRule = async (req, res, next) => {
  try {
    const { name, condition, next_step_id, priority, is_default, description } = req.body;
    const { step_id } = req.params;

    const step = await Step.findById(step_id);
    if (!step) return res.status(404).json({ success: false, message: 'Step not found' });

    if (!condition) return res.status(400).json({ success: false, message: 'Condition is required' });

    // Validate condition syntax
    const validation = validateCondition(condition);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: `Invalid condition: ${validation.error}` });
    }

    // Auto-assign priority
    let rulePriority = priority;
    if (rulePriority === undefined) {
      const maxRule = await Rule.findOne({ step_id }).sort({ priority: -1 });
      rulePriority = maxRule ? maxRule.priority + 10 : 10;
    }

    const rule = await Rule.create({
      _id: uuidv4(),
      step_id,
      name: name || '',
      condition,
      next_step_id: next_step_id || null,
      priority: rulePriority,
      is_default: is_default || false,
      description: description || ''
    });

    res.status(201).json({ success: true, message: 'Rule created successfully', data: rule });
  } catch (err) {
    next(err);
  }
};

// @desc Update a rule
// @route PUT /api/rules/:id
const updateRule = async (req, res, next) => {
  try {
    const { name, condition, next_step_id, priority, is_default, description } = req.body;

    const rule = await Rule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    if (condition) {
      const validation = validateCondition(condition);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: `Invalid condition: ${validation.error}` });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (condition !== undefined) updateData.condition = condition;
    if (next_step_id !== undefined) updateData.next_step_id = next_step_id;
    if (priority !== undefined) updateData.priority = priority;
    if (is_default !== undefined) updateData.is_default = is_default;
    if (description !== undefined) updateData.description = description;

    const updated = await Rule.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.json({ success: true, message: 'Rule updated successfully', data: updated });
  } catch (err) {
    next(err);
  }
};

// @desc Delete a rule
// @route DELETE /api/rules/:id
const deleteRule = async (req, res, next) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    await Rule.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc Validate a condition expression
// @route POST /api/rules/validate
const validateRule = async (req, res) => {
  const { condition } = req.body;
  if (!condition) return res.status(400).json({ success: false, message: 'Condition is required' });

  const result = validateCondition(condition);
  res.json({ success: true, valid: result.valid, error: result.error });
};

// @desc Reorder rules by priority
// @route PUT /api/steps/:step_id/rules/reorder
const reorderRules = async (req, res, next) => {
  try {
    const { rules } = req.body; // [{ id, priority }]
    if (!Array.isArray(rules)) return res.status(400).json({ success: false, message: 'rules array required' });

    await Promise.all(rules.map(({ id, priority }) =>
      Rule.findByIdAndUpdate(id, { priority })
    ));

    res.json({ success: true, message: 'Rules reordered successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRules, createRule, updateRule, deleteRule, validateRule, reorderRules };
