const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ruleSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4()
  },
  step_id: {
    type: String,
    required: [true, 'Step ID is required'],
    ref: 'Step',
    index: true
  },
  name: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  },
  condition: {
    type: String,
    required: [true, 'Condition is required'],
    trim: true
  },
  next_step_id: {
    type: String,
    ref: 'Step',
    default: null
  },
  priority: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  is_default: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  _id: false
});

ruleSchema.index({ step_id: 1, priority: 1 });
ruleSchema.index({ is_default: 1 });

module.exports = mongoose.model('Rule', ruleSchema);
