/**
 * Execution Engine Service
 * Handles workflow execution lifecycle
 */
const Execution = require('../models/Execution');
const Workflow = require('../models/Workflow');
const Step = require('../models/Step');
const Rule = require('../models/Rule');
const { evaluateRules, MAX_ITERATIONS } = require('../rule-engine/ruleEngine');
const wsManager = require('./websocketService');
const notificationService = require('./notificationService');

/**
 * Creates and starts a new workflow execution
 */
async function startExecution(workflowId, inputData, userId, userName) {
  const workflow = await Workflow.findById(workflowId);
  if (!workflow) throw new Error('Workflow not found');
  if (!workflow.is_active) throw new Error('Workflow is not active');
  if (!workflow.start_step_id) throw new Error('Workflow has no start step defined');

  // Validate input schema
  const validationErrors = validateInput(inputData, workflow.input_schema);
  if (validationErrors.length > 0) {
    throw new Error(`Input validation failed: ${validationErrors.join(', ')}`);
  }

  // Create execution record
  const execution = new Execution({
    workflow_id: workflowId,
    workflow_name: workflow.name,
    workflow_version: workflow.version,
    status: 'pending',
    data: inputData,
    current_step_id: workflow.start_step_id,
    triggered_by: userId,
    triggered_by_name: userName,
    started_at: new Date(),
    logs: []
  });

  await execution.save();

  // Increment execution count
  await Workflow.findByIdAndUpdate(workflowId, {
    $inc: { execution_count: 1 },
    last_executed_at: new Date()
  });

  // Broadcast execution start
  wsManager.broadcast('execution:started', {
    execution_id: execution._id,
    workflow_id: workflowId,
    workflow_name: workflow.name,
    status: 'pending'
  });

  // Run the execution asynchronously
  runExecution(execution._id).catch(err => {
    console.error(`Execution ${execution._id} failed:`, err.message);
  });

  return execution;
}

/**
 * Main execution loop
 */
async function runExecution(executionId) {
  let execution = await Execution.findById(executionId);
  if (!execution) throw new Error('Execution not found');

  // Update status to in_progress
  execution.status = 'in_progress';
  await execution.save();

  wsManager.broadcast('execution:updated', {
    execution_id: execution._id,
    status: 'in_progress'
  });

  let iterationCount = 0;
  let currentStepId = execution.current_step_id;

  while (currentStepId && iterationCount < MAX_ITERATIONS) {
    iterationCount++;
    
    // Re-fetch execution to check for cancellation
    execution = await Execution.findById(executionId);
    if (!execution || execution.status === 'canceled') {
      console.log(`Execution ${executionId} was canceled`);
      return;
    }

    const step = await Step.findById(currentStepId);
    if (!step) {
      await failExecution(execution, `Step ${currentStepId} not found`);
      return;
    }

    const stepStartTime = Date.now();
    const logEntry = {
      step_id: step._id,
      step_name: step.name,
      step_type: step.step_type,
      status: 'started',
      evaluated_rules: [],
      timestamp: new Date()
    };

    try {
      // Execute the step
      const stepResult = await executeStep(step, execution.data, execution);
      
      logEntry.metadata = stepResult.metadata || {};

      // Handle approval steps differently - they pause execution
      if (step.step_type === 'approval') {
        logEntry.status = 'pending_approval';
        logEntry.approver = step.metadata?.assignee_email;
        logEntry.duration_ms = Date.now() - stepStartTime;
        
        execution.logs.push(logEntry);
        execution.current_step_id = currentStepId;
        execution.status = 'in_progress';
        await execution.save();

        wsManager.broadcast('execution:step_update', {
          execution_id: execution._id,
          step: logEntry
        });

        // Don't continue - wait for approval
        return;
      }

      // Get rules for this step
      const rules = await Rule.find({ step_id: currentStepId }).sort({ priority: 1 });
      
      let nextStepId = null;
      let evaluatedRules = [];

      if (rules.length > 0) {
        const ruleResult = evaluateRules(rules, execution.data);
        evaluatedRules = ruleResult.evaluatedRules;
        
        if (ruleResult.matchedRule) {
          nextStepId = ruleResult.matchedRule.next_step_id;
          logEntry.selected_rule_id = ruleResult.matchedRule._id;
        }
      }

      logEntry.evaluated_rules = evaluatedRules;
      logEntry.next_step_id = nextStepId;
      logEntry.status = 'completed';
      logEntry.duration_ms = Date.now() - stepStartTime;

      execution.logs.push(logEntry);

      // Broadcast step completion
      wsManager.broadcast('execution:step_update', {
        execution_id: execution._id,
        step: logEntry
      });

      // Move to next step
      if (step.is_terminal || !nextStepId) {
        currentStepId = null; // End of workflow
      } else {
        currentStepId = nextStepId;
        execution.current_step_id = nextStepId;
      }

      await execution.save();

    } catch (stepError) {
      logEntry.status = 'failed';
      logEntry.error_message = stepError.message;
      logEntry.duration_ms = Date.now() - stepStartTime;
      
      execution.logs.push(logEntry);
      await failExecution(execution, stepError.message);
      return;
    }
  }

  if (iterationCount >= MAX_ITERATIONS) {
    await failExecution(execution, `Max iterations (${MAX_ITERATIONS}) reached - possible infinite loop`);
    return;
  }

  // Execution completed
  await completeExecution(execution);
}

/**
 * Executes a single step based on its type
 */
async function executeStep(step, data, execution) {
  const result = { metadata: {} };

  switch (step.step_type) {
    case 'task':
      result.metadata = await executeTaskStep(step, data);
      break;

    case 'notification':
      result.metadata = await executeNotificationStep(step, data, execution);
      break;

    case 'approval':
      result.metadata = { assignee: step.metadata?.assignee_email };
      break;

    case 'condition':
      result.metadata = { evaluated: true };
      break;

    case 'delay':
      const delayMs = (step.metadata?.delay_seconds || 0) * 1000;
      if (delayMs > 0 && delayMs <= 60000) { // Max 60s delay in execution
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      result.metadata = { delayed_seconds: step.metadata?.delay_seconds };
      break;

    case 'webhook':
      result.metadata = await executeWebhookStep(step, data);
      break;

    default:
      result.metadata = { action: step.step_type };
  }

  return result;
}

async function executeTaskStep(step, data) {
  // Simulate task execution
  const action = step.metadata?.action || 'default_action';
  console.log(`Executing task: ${action} with data:`, JSON.stringify(data).slice(0, 100));
  return { action, executed: true, timestamp: new Date().toISOString() };
}

async function executeNotificationStep(step, data, execution) {
  const { channel, template, recipient } = step.metadata || {};
  
  try {
    await notificationService.send({
      channel: channel || 'email',
      template: template || 'default',
      recipient: recipient || step.metadata?.assignee_email,
      data: { ...data, execution_id: execution._id, workflow_name: execution.workflow_name }
    });
    return { channel, template, sent: true };
  } catch (err) {
    console.warn('Notification failed:', err.message);
    return { channel, template, sent: false, error: err.message };
  }
}

async function executeWebhookStep(step, data) {
  // Webhook execution placeholder
  const { url, method = 'POST' } = step.metadata || {};
  console.log(`Webhook: ${method} ${url}`);
  return { url, method, called: true };
}

/**
 * Marks execution as completed
 */
async function completeExecution(execution) {
  execution.status = 'completed';
  execution.ended_at = new Date();
  execution.duration_ms = execution.ended_at - execution.started_at;
  execution.current_step_id = null;
  await execution.save();

  wsManager.broadcast('execution:completed', {
    execution_id: execution._id,
    status: 'completed',
    duration_ms: execution.duration_ms
  });

  console.log(`✅ Execution ${execution._id} completed in ${execution.duration_ms}ms`);
}

/**
 * Marks execution as failed
 */
async function failExecution(execution, errorMessage) {
  execution.status = 'failed';
  execution.ended_at = new Date();
  execution.duration_ms = execution.ended_at - execution.started_at;
  execution.error = errorMessage;
  await execution.save();

  wsManager.broadcast('execution:failed', {
    execution_id: execution._id,
    status: 'failed',
    error: errorMessage
  });

  console.error(`❌ Execution ${execution._id} failed: ${errorMessage}`);
}

/**
 * Validates input data against workflow schema
 */
function validateInput(data, inputSchema) {
  const errors = [];
  if (!inputSchema || inputSchema.size === 0) return errors;

  for (const [field, config] of inputSchema.entries()) {
    const value = data[field];

    if (config.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required`);
      continue;
    }

    if (value !== undefined && value !== null) {
      if (config.type === 'number' && isNaN(Number(value))) {
        errors.push(`Field '${field}' must be a number`);
      }

      if (config.allowed_values && config.allowed_values.length > 0) {
        if (!config.allowed_values.includes(String(value))) {
          errors.push(`Field '${field}' must be one of: ${config.allowed_values.join(', ')}`);
        }
      }

      if (config.type === 'number') {
        const num = Number(value);
        if (config.min !== undefined && num < config.min) {
          errors.push(`Field '${field}' must be >= ${config.min}`);
        }
        if (config.max !== undefined && num > config.max) {
          errors.push(`Field '${field}' must be <= ${config.max}`);
        }
      }
    }
  }

  return errors;
}

/**
 * Process an approval action (approve/reject)
 */
async function processApproval(executionId, stepId, action, approverEmail, comment) {
  const execution = await Execution.findById(executionId);
  if (!execution) throw new Error('Execution not found');
  if (execution.status !== 'in_progress') throw new Error('Execution is not in progress');

  // Find the pending approval log entry
  const logEntry = execution.logs.find(
    l => l.step_id === stepId && l.status === 'pending_approval'
  );
  if (!logEntry) throw new Error('No pending approval found for this step');

  // Update the log entry
  logEntry.approval_status = action === 'approve' ? 'approved' : 'rejected';
  logEntry.approver = approverEmail;
  logEntry.status = action === 'approve' ? 'completed' : 'failed';
  logEntry.metadata = { ...logEntry.metadata, comment };

  await execution.save();

  if (action === 'approve') {
    // Continue execution from this step
    const rules = await Rule.find({ step_id: stepId }).sort({ priority: 1 });
    let nextStepId = null;

    if (rules.length > 0) {
      const ruleResult = evaluateRules(rules, execution.data);
      if (ruleResult.matchedRule) {
        nextStepId = ruleResult.matchedRule.next_step_id;
      }
    }

    execution.current_step_id = nextStepId;
    await execution.save();

    wsManager.broadcast('execution:approval_processed', {
      execution_id: executionId,
      action: 'approved',
      next_step_id: nextStepId
    });

    // Continue execution
    if (nextStepId) {
      runExecution(executionId).catch(console.error);
    } else {
      await completeExecution(execution);
    }
  } else {
    await failExecution(execution, `Approval rejected by ${approverEmail}: ${comment || 'No reason provided'}`);
  }
}

/**
 * Cancel an execution
 */
async function cancelExecution(executionId) {
  const execution = await Execution.findById(executionId);
  if (!execution) throw new Error('Execution not found');

  if (['completed', 'failed', 'canceled'].includes(execution.status)) {
    throw new Error(`Cannot cancel execution with status: ${execution.status}`);
  }

  execution.status = 'canceled';
  execution.ended_at = new Date();
  execution.duration_ms = execution.ended_at - execution.started_at;
  await execution.save();

  wsManager.broadcast('execution:canceled', { execution_id: executionId });
  return execution;
}

/**
 * Retry a failed execution
 */
async function retryExecution(executionId) {
  const execution = await Execution.findById(executionId);
  if (!execution) throw new Error('Execution not found');
  if (execution.status !== 'failed') throw new Error('Only failed executions can be retried');
  if (execution.retries >= execution.max_retries) {
    throw new Error(`Max retries (${execution.max_retries}) exceeded`);
  }

  // Reset execution state
  execution.status = 'pending';
  execution.retries += 1;
  execution.error = null;
  execution.ended_at = null;
  execution.duration_ms = null;

  // Find the last completed step to resume from
  const lastCompletedLog = [...execution.logs].reverse().find(l => l.status === 'completed');
  if (lastCompletedLog?.next_step_id) {
    execution.current_step_id = lastCompletedLog.next_step_id;
  } else {
    // Restart from beginning
    const workflow = await Workflow.findById(execution.workflow_id);
    execution.current_step_id = workflow.start_step_id;
  }

  await execution.save();

  wsManager.broadcast('execution:retrying', { execution_id: executionId, retries: execution.retries });
  runExecution(executionId).catch(console.error);

  return execution;
}

module.exports = {
  startExecution,
  runExecution,
  cancelExecution,
  retryExecution,
  processApproval,
  validateInput
};
