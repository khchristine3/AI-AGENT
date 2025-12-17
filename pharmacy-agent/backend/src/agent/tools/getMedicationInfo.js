/**
 * Get Medication Info Tool
 *
 * This tool retrieves comprehensive information about medications from the
 * pharmacy database. It provides detailed medication data including active
 * ingredients, dosage forms, usage instructions, warnings, and stock status.
 *
 * Search Strategy:
 * 1. Exact name match (case-insensitive)
 * 2. Partial name match (LIKE search)
 * 3. Active ingredient match
 *
 * Returns:
 * - For exact match: Complete medication details with all fields
 * - For partial matches: Suggestions to help user find the right medication
 * - For no matches: Helpful error message
 *
 * @module agent/tools/getMedicationInfo
 */

const db = require('../../database/db');

/**
 * Get Medication Info Function
 *
 * Queries the database to retrieve detailed information about a medication.
 * Returns comprehensive data including description, usage instructions,
 * warnings, stock availability, and pricing.
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
 * // Returns: { success: false, error: 'MEDICATION_NOT_FOUND', suggestions: [...] }
 */
async function getMedicationInfo({ medication_name }) {
  try {
    const searchTerm = medication_name.trim().toLowerCase();
    
    // Try exact match
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
          warnings: JSON.parse(medication.warnings || '[]'),
          in_stock: medication.stock_quantity > 0,
          stock_quantity: medication.stock_quantity,
          price: medication.price
        }
      };
    }

    // Fallback: Try partial match
    const similar = db.prepare(`
      SELECT name FROM medications 
      WHERE LOWER(name) LIKE ?
    `).all(`%${searchTerm}%`);

    if (similar.length > 0) {
      return {
        success: false,
        error: 'MEDICATION_NOT_FOUND',
        message: `Medication "${medication_name}" not found.`,
        suggestions: similar.map(m => m.name),
        hint: 'Did you mean one of these medications?'
      };
    }

    // Fallback: Search by active ingredient
    const byIngredient = db.prepare(`
      SELECT name, active_ingredient FROM medications 
      WHERE LOWER(active_ingredient) LIKE ?
    `).all(`%${searchTerm}%`);

    if (byIngredient.length > 0) {
      return {
        success: false,
        error: 'MEDICATION_NOT_FOUND',
        message: `Medication "${medication_name}" not found, but found medications with similar active ingredient.`,
        suggestions: byIngredient.map(m => `${m.name} (contains ${m.active_ingredient})`),
        hint: 'These medications contain a similar ingredient.'
      };
    }

    // Nothing found
    return {
      success: false,
      error: 'MEDICATION_NOT_FOUND',
      message: `Medication "${medication_name}" was not found in our database.`,
      suggestions: [],
      hint: 'Please check the spelling or ask for available medications.'
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