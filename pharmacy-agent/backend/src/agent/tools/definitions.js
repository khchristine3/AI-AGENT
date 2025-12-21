/**
 * Tool Definitions Module
 *
 * This module defines the OpenAI function calling schemas for all available
 * tools in the pharmacy agent. These definitions tell the AI agent what tools
 * are available, when to use them, and what parameters they require.
 *
 * Each tool definition includes:
 * - Function name (must match the registry in tools/index.js)
 * - Description explaining when to use the tool
 * - Parameter schema defining required and optional inputs
 * - Usage examples and guidelines
 *
 * Available Tools:
 * - get_medication_info: Retrieve detailed medication information
 * - check_stock: Check medication availability and pricing
 * - get_user_prescriptions: Retrieve prescriptions for authenticated user
 *
 * These definitions follow the OpenAI Function Calling specification.
 *
 * @module agent/tools/definitions
 */

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "get_medication_info",
      description: `Retrieves detailed information about a medication from the pharmacy database.
      
Use this tool when the customer asks about:
- What a medication is or what it's used for
- Active ingredients in a medication
- Dosage form and strength
- Usage instructions
- Whether a prescription is required
- Warnings and precautions

Returns comprehensive medication details including description, usage instructions, and stock status.`,
      parameters: {
        type: "object",
        properties: {
          medication_name: {
            type: "string",
            description: "The name of the medication to look up (in English). Examples: 'Acamol', 'Ibuprofen', 'Amoxicillin'"
          }
        },
        required: ["medication_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_stock",
      description: `Checks the current stock availability and price of a medication.

Use this tool when the customer asks about:
- Whether a medication is available
- If something is in stock
- How much of a medication is available
- The price of a medication

Returns availability status, quantity in stock, and current price.`,
      parameters: {
        type: "object",
        properties: {
          medication_name: {
            type: "string",
            description: "The name of the medication to check (in English). Examples: 'Acamol', 'Ibuprofen', 'Omeprazole'"
          }
        },
        required: ["medication_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_user_prescriptions",
      description: `Retrieves prescription information for the currently authenticated user.

IMPORTANT: The user is already authenticated via the UI. The user_id parameter is provided 
automatically by the system - DO NOT ask the user for their ID number or any identification.

Use this tool when the customer:
- Wants to refill a prescription
- Asks about their current prescriptions
- Needs to check prescription validity or remaining refills
- Asks "my prescriptions" or "do I have any prescriptions?"

The tool will automatically use the authenticated user's ID to retrieve their prescriptions,
allergy information, and medical profile.`,
      parameters: {
        type: "object",
        properties: {
          user_id: {
            type: "integer",
            description: "The authenticated user's database ID (1-10). This is provided automatically by the system based on the logged-in user."
          }
        },
        required: ["user_id"]
      }
    }
  }
];

module.exports = TOOL_DEFINITIONS;