const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const stepSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4()
  },
  workflow_id: {
    type: String,
    required: [true, 'Workflow ID is required'],
    ref: 'Workflow',
    index: true
  },
  name: {
    type: String,
    required: [true, 'Step name is required'],
    trim: true,
    minlength: 2,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  step_type: {
    type: String,
    enum: ['task', 'approval', 'notification', 'condition', 'delay', 'webhook'],
    required: [true, 'Step type is required']
  },
  order: {
    type: Number,
    required: true,
    min: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  is_terminal: {
    type: Boolean,
    default: false
  },
  timeout_seconds: {
    type: Number,
    default: null
  },
  retry_config: {
    max_retries: { type: Number, default: 0 },
    retry_delay_seconds: { type: Number, default: 30 }
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  _id: false
});

// Virtual for rules
stepSchema.virtual('rules', {
  ref: 'Rule',
  localField: '_id',
  foreignField: 'step_id'
});

stepSchema.index({ workflow_id: 1, order: 1 });
stepSchema.index({ step_type: 1 });
stepSchema.set('toJSON', { virtuals: true });
stepSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Step', stepSchema);
