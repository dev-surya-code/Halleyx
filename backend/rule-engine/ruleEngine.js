/**
 * Rule Engine - Evaluates conditions against execution data
 * Supports: comparison operators, logical operators, and built-in functions
 */

const MAX_ITERATIONS = 100;

/**
 * Safely evaluates a rule condition against provided data
 * @param {string} condition - The rule expression string
 * @param {object} data - The execution data object
 * @returns {boolean} - Whether the condition is true
 */
function evaluateCondition(condition, data) {
  if (!condition || condition.trim() === '') return false;
  if (condition.trim().toUpperCase() === 'DEFAULT' || condition.trim() === '*') return true;

  try {
    // Build a safe evaluation context
    const context = buildContext(data);
    const transformedCondition = transformCondition(condition);
    
    // Use Function constructor with restricted scope
    const evalFn = new Function(
      ...Object.keys(context),
      `"use strict"; return (${transformedCondition});`
    );
    
    const result = evalFn(...Object.values(context));
    return Boolean(result);
  } catch (err) {
    console.error(`Rule Engine Error evaluating "${condition}":`, err.message);
    return false;
  }
}

/**
 * Builds a safe evaluation context from data
 */
function buildContext(data) {
  const context = {};
  
  // Flatten nested objects with dot notation support
  flattenObject(data, '', context);
  
  // Add built-in functions
  context.__contains = (fieldValue, searchValue) => {
    if (typeof fieldValue === 'string') return fieldValue.includes(searchValue);
    if (Array.isArray(fieldValue)) return fieldValue.includes(searchValue);
    return false;
  };
  context.__startsWith = (fieldValue, searchValue) => {
    if (typeof fieldValue === 'string') return fieldValue.startsWith(searchValue);
    return false;
  };
  context.__endsWith = (fieldValue, searchValue) => {
    if (typeof fieldValue === 'string') return fieldValue.endsWith(searchValue);
    return false;
  };
  context.__isEmpty = (val) => {
    if (val === null || val === undefined) return true;
    if (typeof val === 'string') return val.trim() === '';
    if (Array.isArray(val)) return val.length === 0;
    return false;
  };
  context.__isNull = (val) => val === null || val === undefined;

  return context;
}

/**
 * Flattens nested object for context
 */
function flattenObject(obj, prefix, result) {
  if (obj === null || typeof obj !== 'object') return;
  
  for (const [key, value] of Object.entries(obj)) {
    const flatKey = prefix ? `${prefix}_${key}` : key;
    // Sanitize key for use as variable name
    const safeKey = key.replace(/[^a-zA-Z0-9_$]/g, '_');
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[safeKey] = value;
      flattenObject(value, flatKey, result);
    } else {
      result[safeKey] = value;
    }
  }
}

/**
 * Transforms condition string to safe JS expression
 * Handles: contains(), startsWith(), endsWith(), == for string comparison
 */
function transformCondition(condition) {
  let transformed = condition;

  // Replace contains(field, "value") -> __contains(field, "value")
  transformed = transformed.replace(/\bcontains\s*\(/g, '__contains(');
  
  // Replace startsWith(field, "value") -> __startsWith(field, "value")
  transformed = transformed.replace(/\bstartsWith\s*\(/g, '__startsWith(');
  
  // Replace endsWith(field, "value") -> __endsWith(field, "value")
  transformed = transformed.replace(/\bendsWith\s*\(/g, '__endsWith(');
  
  // Replace isEmpty(field) -> __isEmpty(field)
  transformed = transformed.replace(/\bisEmpty\s*\(/g, '__isEmpty(');
  
  // Replace isNull(field) -> __isNull(field)
  transformed = transformed.replace(/\bisNull\s*\(/g, '__isNull(');

  // Handle single-quoted strings -> double-quoted
  transformed = transformed.replace(/'/g, '"');

  return transformed;
}

/**
 * Evaluates rules for a given step and returns the matching rule
 * @param {Array} rules - Array of rule objects sorted by priority
 * @param {object} data - Execution data
 * @returns {object|null} - The matched rule or null
 */
function evaluateRules(rules, data) {
  if (!rules || rules.length === 0) return null;

  // Sort rules by priority (lower number = higher priority)
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  const evaluatedRules = [];
  let matchedRule = null;
  let defaultRule = null;

  for (const rule of sortedRules) {
    // Store the default rule for later
    if (rule.is_default || rule.condition.trim().toUpperCase() === 'DEFAULT') {
      defaultRule = rule;
      evaluatedRules.push({
        rule_id: rule._id,
        condition: rule.condition,
        result: false, // Will be marked true if used
        is_default: true
      });
      continue;
    }

    const result = evaluateCondition(rule.condition, data);
    evaluatedRules.push({
      rule_id: rule._id,
      condition: rule.condition,
      result,
      is_default: false
    });

    if (result && !matchedRule) {
      matchedRule = rule;
    }
  }

  // Fall back to DEFAULT rule if no match
  if (!matchedRule && defaultRule) {
    matchedRule = defaultRule;
    // Mark default as matched in evaluated rules
    const defaultEntry = evaluatedRules.find(r => r.is_default);
    if (defaultEntry) defaultEntry.result = true;
  }

  return { matchedRule, evaluatedRules };
}

/**
 * Validates a condition expression for syntax errors
 * @param {string} condition - Condition to validate
 * @returns {object} - { valid: boolean, error: string|null }
 */
function validateCondition(condition) {
  if (!condition || condition.trim() === '') {
    return { valid: false, error: 'Condition cannot be empty' };
  }
  
  if (condition.trim().toUpperCase() === 'DEFAULT' || condition.trim() === '*') {
    return { valid: true, error: null };
  }

  try {
    const testData = {};
    const context = buildContext(testData);
    const transformed = transformCondition(condition);
    
    // Try to parse (not execute) the expression
    new Function(...Object.keys(context), `"use strict"; return (${transformed});`);
    return { valid: true, error: null };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

module.exports = {
  evaluateCondition,
  evaluateRules,
  validateCondition,
  MAX_ITERATIONS
};
