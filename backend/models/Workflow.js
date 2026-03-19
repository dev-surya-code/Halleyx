const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const inputSchemaFieldSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'array', 'object'],
    required: true
  },
  required: { type: Boolean, default: false },
  allowed_values: [String],
  min: Number,
  max: Number,
  description: String
}, { _id: false });

const workflowSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4()
  },
  name: {
    type: String,
    required: [true, 'Workflow name is required'],
    trim: true,
    minlength: 2,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  is_active: {
    type: Boolean,
    default: false
  },
  input_schema: {
    type: Map,
    of: inputSchemaFieldSchema,
    default: {}
  },
  start_step_id: {
    type: String,
    default: null,
    ref: 'Step'
  },
  tags: [String],
  category: {
    type: String,
    trim: true,
    default: 'General'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  execution_count: {
    type: Number,
    default: 0
  },
  last_executed_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  _id: false
});

workflowSchema.index({ name: 1 });
workflowSchema.index({ is_active: 1 });
workflowSchema.index({ created_by: 1 });
workflowSchema.index({ category: 1 });
workflowSchema.index({ created_at: -1 });

// Virtual for step count
workflowSchema.virtual('steps', {
  ref: 'Step',
  localField: '_id',
  foreignField: 'workflow_id'
});

workflowSchema.set('toJSON', { virtuals: true });
workflowSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Workflow', workflowSchema);
