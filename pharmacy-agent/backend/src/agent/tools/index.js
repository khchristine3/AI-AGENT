/**
 * Tool Registry and Executor Module
 *
 * This module serves as the central registry for all AI agent tools and provides
 * a unified interface for executing them. Tools are functions that the AI agent
 * can call to interact with the database, external APIs, or perform specific tasks.
 *
 * Key Responsibilities:
 * - Maintains a registry mapping tool names to their implementations
 * - Provides safe execution with error handling
 * - Logs tool calls and results for debugging
 * - Returns standardized response formats
 *
 * @module agent/tools
 */

const getMedicationInfo = require('./getMedicationInfo');
const checkStock = require('./checkStock');
const getUserPrescriptions = require('./getUserPrescriptions');

/**
 * Tool Registry
 *
 * Maps tool names (as defined in tool definitions) to their implementation functions.
 * When the AI agent requests a tool call, the tool name is looked up here.
 *
 * Available Tools:
 * - get_medication_info: Retrieves detailed information about a medication
 * - check_stock: Checks inventory levels for a medication
 * - get_user_prescriptions: Fetches prescription history for a user
 *
 * @type {Object.<string, Function>}
 */
const toolRegistry = {
  get_medication_info: getMedicationInfo,
  check_stock: checkStock,
  get_user_prescriptions: getUserPrescriptions
};

/**
 * Execute Tool
 *
 * Executes a tool by name with the provided arguments. This function handles
 * tool lookup, execution, error handling, and logging.
 *
 * Error Handling:
 * - Returns UNKNOWN_TOOL error if tool doesn't exist in registry
 * - Returns TOOL_EXECUTION_ERROR if tool throws an exception
 * - All errors return standardized error response format
 *
 * @param {string} toolName - The name of the tool to execute (must match registry key)
 * @param {Object} args - Arguments to pass to the tool function
 * @returns {Promise<Object>} Tool execution result with success status and data/error
 *
 * @example
 * const result = await executeTool('get_medication_info', { medication_name: 'Acamol' });
 * if (result.success) {
 *   console.log(result.medication);
 * } else {
 *   console.error(result.error, result.message);
 * }
 */
async function executeTool(toolName, args) {
  console.log(`Executing tool: ${toolName}`);
  console.log('Args:', JSON.stringify(args));

  // Lookup tool in registry
  const tool = toolRegistry[toolName];

  // Handle unknown tool
  if (!tool) {
    console.error(`Unknown tool: ${toolName}`);
    return {
      success: false,
      error: 'UNKNOWN_TOOL',
      message: `Tool "${toolName}" is not available.`
    };
  }

  // Execute tool with error handling
  try {
    const result = await tool(args);
    console.log('Tool result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Tool execution error:', error);
    return {
      success: false,
      error: 'TOOL_EXECUTION_ERROR',
      message: `An error occurred while executing ${toolName}. Please try again.`
    };
  }
}

// Export tool executor and registry
module.exports = { executeTool, toolRegistry };