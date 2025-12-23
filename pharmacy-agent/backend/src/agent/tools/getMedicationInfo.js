/**
 * Get Medication Info Tool
 *
 * ============================================================================
 * 1. NAME AND PURPOSE
 * ============================================================================
 * Name: get_medication_info
 * 
 * Purpose: Retrieves educational information about medications including active 
 * ingredients, dosage forms, usage instructions, and warnings. Does NOT return 
 * stock availability (use check_stock) or pricing (use check_price).
 *
 * ============================================================================
 * 2. INPUTS (Parameters and Types)
 * ============================================================================
 * medication_name
 *   - Type: string
 *   - Required: Yes
 *   - Description: Name of the medication to look up
 *   - Examples: "Acamol", "Ibuprofen", "Amoxicillin"
 *
 * ============================================================================
 * 3. OUTPUT SCHEMA (Fields and Types)
 * ============================================================================
 * 
 * SUCCESS RESPONSE:
 * {
 *   success: boolean                   // Always true for successful queries
 *   data: {
 *     name: string                     // Medication name
 *     active_ingredient: string        // Primary active ingredient
 *     dosage_form: string              // Form (Tablet, Capsule, Liquid, etc.)
 *     strength: string                 // Dosage strength (e.g., "400mg", "500mg")
 *     requires_prescription: boolean   // true if prescription required
 *     description: string              // Medical description and use case
 *     usage_instructions: string       // How to take the medication
 *     warnings: Array<string>          // List of safety warnings and precautions
 *   }
 * }
 *
 * ERROR RESPONSE:
 * {
 *   success: boolean                   // Always false for errors
 *   error: string                      // Error code (see Error Handling section)
 *   message: string                    // Human-readable error message
 *   suggestions: Array<string> | Array<Object>  // Optional: Similar medications
 *   hint: string                       // Optional: Helpful hint for user
 * }
 *
 * ============================================================================
 * 4. ERROR HANDLING
 * ============================================================================
 * MEDICATION_NOT_FOUND
 *   - Trigger: Medication doesn't exist in database (after all fallback attempts)
 *   - Behavior: Returns suggestions based on partial matches or active ingredients
 *
 * INVALID_INPUT
 *   - Trigger: medication_name is missing, empty, or not a string
 *   - Behavior: Returns validation error, no database query attempted
 *
 * DATABASE_ERROR
 *   - Trigger: Database connection failure or SQL query exception
 *   - Behavior: Logs technical error, returns generic user-friendly message
 *
 * ============================================================================
 * 5. FALLBACK BEHAVIOR
 * ============================================================================
 * 4-step search strategy when exact match fails:
 *
 * Step 1: Exact name match (case-insensitive)
 *   - SQL: WHERE LOWER(name) = LOWER(?)
 *   - Example: "Ibuprofen" → finds "Ibuprofen"
 *
 * Step 2: Partial name match (LIKE search)
 *   - SQL: WHERE LOWER(name) LIKE '%' || LOWER(?) || '%'
 *   - Example: "Ibu" → finds "Ibuprofen"
 *
 * Step 3: Active ingredient match
 *   - SQL: WHERE LOWER(active_ingredient) LIKE '%' || LOWER(?) || '%'
 *   - Example: "Paracetamol" → finds "Acamol" (contains Paracetamol)
 *
 * Step 4: Not found
 *   - Returns MEDICATION_NOT_FOUND with empty suggestions
 *   - Message: "Please check the spelling or ask a pharmacist"
 *
 * Note: All medication-searching tools use this identical fallback strategy.
 *
 * ============================================================================
 *
 * @module agent/tools/getMedicationInfo
 */

const db = require('../../database/db');

async function getMedicationInfo({ medication_name }) {
  try {
    // Validate input
    if (!medication_name || typeof medication_name !== 'string') {
      return {
        success: false,
        error: 'INVALID_INPUT',
        message: 'Medication name is required.'
      };
    }

    const searchTerm = medication_name.trim().toLowerCase();

    // FALLBACK STRATEGY 1: Exact name match (case-insensitive)
    let medication = db.prepare(`
      SELECT * FROM medications
      WHERE LOWER(name) = ?
    `).get(searchTerm);

    if (medication) {
      return {
        success: true,
        data: {
          name: medication.name,
          active_ingredient: medication.active_ingredient,
          dosage_form: medication.dosage_form,
          strength: medication.strength,
          requires_prescription: medication.requires_prescription === 1,
          description: medication.description,
          usage_instructions: medication.usage_instructions,
          warnings: JSON.parse(medication.warnings || '[]')
        }
      };
    }

    // FALLBACK STRATEGY 2: Partial name match (LIKE search)
    const similarByName = db.prepare(`
      SELECT name FROM medications
      WHERE LOWER(name) LIKE ?
      LIMIT 5
    `).all(`%${searchTerm}%`);

    if (similarByName.length > 0) {
      return {
        success: false,
        error: 'MEDICATION_NOT_FOUND',
        message: `Medication "${medication_name}" not found.`,
        suggestions: similarByName.map(m => m.name),
        hint: 'Did you mean one of these medications?'
      };
    }

    // FALLBACK STRATEGY 3: Active ingredient match
    const similarByIngredient = db.prepare(`
      SELECT name, active_ingredient FROM medications
      WHERE LOWER(active_ingredient) LIKE ?
      LIMIT 5
    `).all(`%${searchTerm}%`);

    if (similarByIngredient.length > 0) {
      return {
        success: false,
        error: 'MEDICATION_NOT_FOUND',
        message: `Medication "${medication_name}" not found, but we have medications with similar active ingredients.`,
        suggestions: similarByIngredient.map(m => ({
          name: m.name,
          active_ingredient: m.active_ingredient
        })),
        hint: 'These medications contain a similar active ingredient.'
      };
    }

    // FALLBACK STRATEGY 4: Not found - no suggestions available
    return {
      success: false,
      error: 'MEDICATION_NOT_FOUND',
      message: `Medication "${medication_name}" was not found in our database.`,
      suggestions: [],
      hint: 'Please check the spelling or ask a pharmacist for assistance.'
    };

  } catch (error) {
    console.error('Error in getMedicationInfo:', error);
    return {
      success: false,
      error: 'DATABASE_ERROR',
      message: 'An error occurred while looking up the medication. Please try again.'
    };
  }
}

module.exports = getMedicationInfo;