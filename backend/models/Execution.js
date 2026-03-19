const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const executionLogSchema = new mongoose.Schema({
  step_id: { type: String },
  step_name: { type: String },
  step_type: { type: String },
  status: {
    type: String,
    enum: ['started', 'completed', 'failed', 'skipped', 'pending_approval'],
    default: 'started'
  },
  evaluated_rules: [{
    rule_id: String,
    condition: String,
    result: Boolean,
    is_default: Boolean
  }],
  selected_rule_id: { type: String, default: null },
  next_step_id: { type: String, default: null },
  approver: { type: String, default: null },
  approval_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', null],
    default: null
  },
  error_message: { type: String, default: null },
  duration_ms: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

const executionSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4()
  },
  workflow_id: {
    type: String,
    required: true,
    ref: 'Workflow',
    index: true
  },
  workflow_name: { type: String },
  workflow_version: { type: Number },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'canceled'],
    default: 'pending',
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  output: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  logs: [executionLogSchema],
  current_step_id: {
    type: String,
    default: null,
    ref: 'Step'
  },
  retries: {
    type: Number,
    default: 0
  },
  max_retries: {
    type: Number,
    default: 3
  },
  triggered_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  triggered_by_name: { type: String },
  error: { type: String, default: null },
  started_at: { type: Date, default: null },
  ended_at: { type: Date, default: null },
  duration_ms: { type: Number, default: null }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  _id: false
});

executionSchema.index({ workflow_id: 1, status: 1 });
executionSchema.index({ triggered_by: 1 });
executionSchema.index({ created_at: -1 });
executionSchema.index({ status: 1, created_at: -1 });

module.exports = mongoose.model('Execution', executionSchema);
