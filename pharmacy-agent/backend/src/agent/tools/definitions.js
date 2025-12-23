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
 * - get_medication_info: Retrieve medication information only
 * - check_stock: Check medication availability only
 * - check_price: Pricing information only
 * - get_user_prescriptions: Retrieve prescriptions only for authenticated user
 *
 * NO DATA OVERLAP between tools - each has a single, clear purpose.
 *
 * @module agent/tools/definitions
 */

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "get_medication_info",
      description: `Retrieves educational information about a medication.

Use this tool when the customer asks:
- "What is [medication]?"
- "What's in [medication]?" (active ingredients)
- "How do I use [medication]?" (usage instructions)
- When you need to verify ingredients for allergy checking
- when you need to check if a prescription is required for a medication

Returns: Active ingredient, dosage form, strength, usage instructions, prescription requirement, warnings, description.
Does NOT return: Stock availability (use check_stock), pricing (use check_price).`,
      parameters: {
        type: "object",
        properties: {
          medication_name: {
            type: "string",
            description: "Medication name in English. Examples: 'Acamol', 'Ibuprofen', 'Amoxicillin'"
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
      description: `Checks stock availability for a medication.

Use this tool when the customer asks:
- "Do you have [medication]?"
- "Is [medication] in stock?"
- "How many [medication] do you have?"

Returns: Stock status (in stock / out of stock), quantity available.`,
      parameters: {
        type: "object",
        properties: {
          medication_name: {
            type: "string",
            description: "Medication name in English. Examples: 'Acamol', 'Ibuprofen', 'Omeprazole'"
          }
        },
        required: ["medication_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_price",
      description: `Checks the current price of a medication.

Use this tool when the customer asks:
- "How much is [medication]?"
- "What's the price of [medication]?"
- "How much does [medication] cost?"

Returns: Current price.`,
      parameters: {
        type: "object",
        properties: {
          medication_name: {
            type: "string",
            description: "Medication name in English. Examples: 'Acamol', 'Ibuprofen', 'Amoxicillin'"
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
      description: `Retrieves prescription information for the authenticated user.

IMPORTANT: The user is already authenticated. The user_id is provided automatically.

Use this tool when the customer:
- Wants to refill a prescription
- Asks about their current prescriptions
- Says "my prescriptions" or "my medications"

Returns: Prescription metadata (dates, refills, prescriber), user allergies, prescription status.
Does NOT return: Active ingredients, medication warnings, stock, pricing.

Note: When allergies are present, also call get_medication_info to verify ingredients and warnings.`,
      parameters: {
        type: "object",
        properties: {
          user_id: {
            type: "integer",
            description: "User's database ID (1-10). Provided automatically by the system."
          }
        },
        required: ["user_id"]
      }
    }
  }
];

module.exports = TOOL_DEFINITIONS;