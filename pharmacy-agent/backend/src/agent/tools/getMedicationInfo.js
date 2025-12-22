/**
 * Get Medication Info Tool
 *
 * This tool retrieves comprehensive information about medications from the
 * pharmacy database. It provides detailed medication data including active
 * ingredients, dosage forms, usage instructions, warnings, and prescription
 * requirements.
 *
 * Scope:
 * - Returns ONLY medication details (name, ingredient, dosage, usage, warnings)
 * - Does NOT return stock availability (use check_stock for that)
 * - Does NOT return price (use check_price for that)
 *
 * Search Strategy (4 fallbacks):
 * 1. Exact name match (case-insensitive)
 * 2. Partial name match (LIKE search)
 * 3. Active ingredient match
 * 4. Not found - return suggestions
 *
 * Use Cases:
 * - Customer asks "What is [medication]?"
 * - Customer asks "What does [medication] do?"
 * - Customer wants to know usage instructions or warnings
 * - Customer needs dosage information
 *
 * @module agent/tools/getMedicationInfo
 */

const db = require('../../database/db');

/**
 * Get Medication Info Function
 *
 * Queries the database to retrieve detailed information about a medication.
 * Returns comprehensive data including description, usage instructions,
 * warnings, and prescription requirements.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.medication_name - Name of the medication to look up
 * @returns {Promise<Object>} Result object with medication data or suggestions
 *
 * @example
 * // Exact match found
 * const result = await getMedicationInfo({ medication_name: 'Acamol' });
 * // Returns: { success: true, data: { name: 'Acamol', active_ingredient: 'Paracetamol', ... } }
 *
 * @example
 * // Medication not found, returns suggestions
 * const result = await getMedicationInfo({ medication_name: 'Acamo' });
 * // Returns: { success: false, error: 'MEDICATION_NOT_FOUND', suggestions: ['Acamol'] }
 */
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