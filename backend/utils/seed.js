require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Workflow = require('../models/Workflow');
const Step = require('../models/Step');
const Rule = require('../models/Rule');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_platform');
  console.log('🌱 Connected to MongoDB for seeding...');

  // Clear existing data
  await Promise.all([User.deleteMany(), Workflow.deleteMany(), Step.deleteMany(), Rule.deleteMany()]);
  console.log('🧹 Cleared existing data');

  // Create users
  const adminUser = await User.create({
    name: 'Admin',
    email: 'admin@workflowplatform.com',
    password: 'Admin@123',
    role: 'admin'
  });
  const managerUser = await User.create({
    name: 'Manager',
    email: 'manager@example.com',
    password: 'Manager@123',
    role: 'manager'
  });
  await User.create({
    name: 'User',
    email: 'user@example.com',
    password: 'User@123',
    role: 'user'
  });
  console.log('👤 Users created');

  // ─── WORKFLOW 1: Expense Approval ─────────────────────────────────────────
  const expenseWfId = uuidv4();
  const expenseStep1Id = uuidv4();
  const expenseStep2Id = uuidv4();
  const expenseStep3Id = uuidv4();
  const expenseStep4Id = uuidv4();
  const expenseStep5Id = uuidv4();

  await Workflow.create({
    _id: expenseWfId,
    name: 'Expense Approval Workflow',
    description: 'Automated expense approval based on amount, country, and priority',
    version: 1,
    is_active: true,
    input_schema: new Map([
      ['amount', { type: 'number', required: true, min: 0, description: 'Expense amount in USD' }],
      ['country', { type: 'string', required: true, description: 'Country code (US, UK, IN, etc.)' }],
      ['department', { type: 'string', required: false, description: 'Department name' }],
      ['priority', { type: 'string', required: true, allowed_values: ['High', 'Medium', 'Low'], description: 'Expense priority' }],
      ['description', { type: 'string', required: false, description: 'Expense description' }]
    ]),
    start_step_id: expenseStep1Id,
    tags: ['finance', 'approval'],
    category: 'Finance',
    created_by: adminUser._id,
    execution_count: 12
  });

  await Step.create([
    { _id: expenseStep1Id, workflow_id: expenseWfId, name: 'Validate Expense', step_type: 'task', order: 0, metadata: { action: 'validate_expense' } },
    { _id: expenseStep2Id, workflow_id: expenseWfId, name: 'Manager Approval', step_type: 'approval', order: 1, metadata: { assignee_email: 'manager@example.com', message: 'Please review the expense request' } },
    { _id: expenseStep3Id, workflow_id: expenseWfId, name: 'Send Approval Email', step_type: 'notification', order: 2, metadata: { channel: 'email', template: 'expense-approved', recipient: '{{requester_email}}' } },
    { _id: expenseStep4Id, workflow_id: expenseWfId, name: 'Send Rejection Email', step_type: 'notification', order: 3, metadata: { channel: 'email', template: 'expense-rejected', recipient: '{{requester_email}}' } },
    { _id: expenseStep5Id, workflow_id: expenseWfId, name: 'Process Payment', step_type: 'task', order: 4, is_terminal: true, metadata: { action: 'process_payment', system: 'SAP' } }
  ]);

  await Rule.create([
    { _id: uuidv4(), step_id: expenseStep1Id, name: 'High value needs approval', condition: 'amount > 100', next_step_id: expenseStep2Id, priority: 10 },
    { _id: uuidv4(), step_id: expenseStep1Id, name: 'Low value auto-approve', condition: 'amount <= 100', next_step_id: expenseStep3Id, priority: 20 },
    { _id: uuidv4(), step_id: expenseStep1Id, name: 'Default', condition: 'DEFAULT', next_step_id: expenseStep2Id, priority: 99, is_default: true },
    { _id: uuidv4(), step_id: expenseStep2Id, name: 'Approved', condition: 'DEFAULT', next_step_id: expenseStep3Id, priority: 10, is_default: true },
    { _id: uuidv4(), step_id: expenseStep3Id, name: 'Proceed to payment', condition: 'DEFAULT', next_step_id: expenseStep5Id, priority: 10, is_default: true }
  ]);

  // ─── WORKFLOW 2: Employee Onboarding ──────────────────────────────────────
  const onboardWfId = uuidv4();
  const onStep1Id = uuidv4();
  const onStep2Id = uuidv4();
  const onStep3Id = uuidv4();
  const onStep4Id = uuidv4();
  const onStep5Id = uuidv4();
  const onStep6Id = uuidv4();

  await Workflow.create({
    _id: onboardWfId,
    name: 'Employee Onboarding Workflow',
    description: 'Automated employee onboarding process with IT setup and HR tasks',
    version: 1,
    is_active: true,
    input_schema: new Map([
      ['employee_name', { type: 'string', required: true, description: 'Full name of the new employee' }],
      ['employee_email', { type: 'string', required: true, description: 'Work email address' }],
      ['department', { type: 'string', required: true, allowed_values: ['Engineering', 'Sales', 'HR', 'Finance', 'Marketing'], description: 'Department' }],
      ['start_date', { type: 'string', required: true, description: 'Employment start date' }],
      ['role', { type: 'string', required: true, description: 'Job title/role' }],
      ['is_remote', { type: 'boolean', required: false, description: 'Is the employee remote?' }]
    ]),
    start_step_id: onStep1Id,
    tags: ['hr', 'onboarding', 'automation'],
    category: 'HR',
    created_by: managerUser._id,
    execution_count: 5
  });

  await Step.create([
    { _id: onStep1Id, workflow_id: onboardWfId, name: 'Create Employee Record', step_type: 'task', order: 0, metadata: { action: 'create_employee_record', system: 'HRIS' } },
    { _id: onStep2Id, workflow_id: onboardWfId, name: 'Send Welcome Email', step_type: 'notification', order: 1, metadata: { channel: 'email', template: 'welcome-employee', recipient: '{{employee_email}}' } },
    { _id: onStep3Id, workflow_id: onboardWfId, name: 'Setup IT Access', step_type: 'task', order: 2, metadata: { action: 'provision_it_access', systems: ['slack', 'jira', 'github'] } },
    { _id: onStep4Id, workflow_id: onboardWfId, name: 'Engineering Setup', step_type: 'task', order: 3, metadata: { action: 'setup_dev_environment', tools: ['vscode', 'docker', 'vpn'] } },
    { _id: onStep5Id, workflow_id: onboardWfId, name: 'Sales CRM Setup', step_type: 'task', order: 3, metadata: { action: 'setup_crm_access', system: 'Salesforce' } },
    { _id: onStep6Id, workflow_id: onboardWfId, name: 'HR Manager Approval', step_type: 'approval', order: 4, is_terminal: true, metadata: { assignee_email: 'manager@example.com', message: 'Please confirm onboarding completion' } }
  ]);

  await Rule.create([
    { _id: uuidv4(), step_id: onStep1Id, name: 'All employees', condition: 'DEFAULT', next_step_id: onStep2Id, priority: 10, is_default: true },
    { _id: uuidv4(), step_id: onStep2Id, name: 'Always setup IT', condition: 'DEFAULT', next_step_id: onStep3Id, priority: 10, is_default: true },
    { _id: uuidv4(), step_id: onStep3Id, name: 'Engineering department', condition: "department == 'Engineering'", next_step_id: onStep4Id, priority: 10 },
    { _id: uuidv4(), step_id: onStep3Id, name: 'Sales department', condition: "department == 'Sales'", next_step_id: onStep5Id, priority: 20 },
    { _id: uuidv4(), step_id: onStep3Id, name: 'Other departments', condition: 'DEFAULT', next_step_id: onStep6Id, priority: 99, is_default: true },
    { _id: uuidv4(), step_id: onStep4Id, name: 'Engineering complete', condition: 'DEFAULT', next_step_id: onStep6Id, priority: 10, is_default: true },
    { _id: uuidv4(), step_id: onStep5Id, name: 'Sales complete', condition: 'DEFAULT', next_step_id: onStep6Id, priority: 10, is_default: true }
  ]);

  // ─── WORKFLOW 3: Leave Request ─────────────────────────────────────────────
  const leaveWfId = uuidv4();
  const leaveStep1Id = uuidv4();
  const leaveStep2Id = uuidv4();
  const leaveStep3Id = uuidv4();

  await Workflow.create({
    _id: leaveWfId,
    name: 'Leave Request Workflow',
    description: 'Employee leave request with manager approval and HR notification',
    version: 1,
    is_active: true,
    input_schema: new Map([
      ['employee_name', { type: 'string', required: true }],
      ['leave_type', { type: 'string', required: true, allowed_values: ['Annual', 'Sick', 'Emergency', 'Unpaid'] }],
      ['days', { type: 'number', required: true, min: 1, max: 30 }],
      ['reason', { type: 'string', required: false }]
    ]),
    start_step_id: leaveStep1Id,
    tags: ['hr', 'leave'],
    category: 'HR',
    created_by: adminUser._id,
    execution_count: 8
  });

  await Step.create([
    { _id: leaveStep1Id, workflow_id: leaveWfId, name: 'Manager Approval', step_type: 'approval', order: 0, metadata: { assignee_email: 'manager@example.com' } },
    { _id: leaveStep2Id, workflow_id: leaveWfId, name: 'Notify HR', step_type: 'notification', order: 1, metadata: { channel: 'email', template: 'leave-approved' } },
    { _id: leaveStep3Id, workflow_id: leaveWfId, name: 'Update Leave Balance', step_type: 'task', order: 2, is_terminal: true, metadata: { action: 'update_leave_balance' } }
  ]);

  await Rule.create([
    { _id: uuidv4(), step_id: leaveStep1Id, name: 'Approved', condition: 'DEFAULT', next_step_id: leaveStep2Id, priority: 10, is_default: true },
    { _id: uuidv4(), step_id: leaveStep2Id, name: 'Notify and update', condition: 'DEFAULT', next_step_id: leaveStep3Id, priority: 10, is_default: true }
  ]);

  console.log('✅ Sample workflows created:');
  console.log('   - Expense Approval Workflow (active)');
  console.log('   - Employee Onboarding Workflow (active)');
  console.log('   - Leave Request Workflow (active)');
  console.log('\n👤 Demo accounts:');
  console.log('   admin@workflowplatform.com / Admin@123 (admin)');
  console.log('   manager@example.com / Manager@123 (manager)');
  console.log('   john@example.com / User@123 (user)');

  await mongoose.disconnect();
  console.log('\n🌱 Seeding complete!');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
