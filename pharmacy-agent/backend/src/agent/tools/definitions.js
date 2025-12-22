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

PROVIDES:
- Active ingredient (pharmaceutical composition)
- Dosage form and strength
- Usage instructions (as written on packaging)
- Warnings and contraindications
- General description and purpose
- Whether prescription is required

DOES NOT PROVIDE:
- User-specific prescription information (use get_user_prescriptions)
- Real-time stock availability (use check_stock)
- Current pricing (use check_stock)

IMPORTANT: Use this tool to verify active ingredients and warnings when checking allergy compatibility.

Use this when the customer asks:
- "What is [medication]?"
- "What's in [medication]?"
- "How do I use [medication]?"
- When you need to verify ingredients for allergy checking`,
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

PROVIDES:
- Real-time stock availability (in stock / out of stock)
- Quantity currently available
- Current price
- Whether prescription is required

DOES NOT PROVIDE:
- Active ingredients (use get_medication_info)
- Usage instructions (use get_medication_info)
- Medication warnings (use get_medication_info)
- User prescriptions (use get_user_prescriptions)

Use this when the customer asks:
- "Do you have [medication]?"
- "Is [medication] in stock?"
- "How much is [medication]?"
- When you need to verify availability for a refill`,
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

PROVIDES:
- Prescription metadata (dates, refills remaining, prescriber)
- User allergy information
- Prescription status (expired/active, has refills)

DOES NOT PROVIDE:
- Active ingredients (use get_medication_info)
- Medication warnings (use get_medication_info)
- Current stock availability (use check_stock)
- Current pricing (use check_stock)

IMPORTANT: The user is already authenticated. The user_id is provided automatically 
by the system - DO NOT ask the user for identification.

Use this when the customer:
- Wants to refill a prescription
- Asks about their current prescriptions
- Says "my prescriptions" or "my medications"
- Needs to check prescription validity or refills

This tool provides allergy information. When allergies are present and user is asking 
about a medication, you should also call get_medication_info to verify ingredients and warnings.`,
      parameters: {
        type: "object",
        properties: {
          user_id: {
            type: "integer",
            description: "The authenticated user's database ID (1-10). Provided automatically by the system."
          }
        },
        required: ["user_id"]
      }
    }
  }
];

module.exports = TOOL_DEFINITIONS;