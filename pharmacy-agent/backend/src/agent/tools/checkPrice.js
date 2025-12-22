/**
 * Check Price Tool
 *
 * This tool retrieves the current price for a specific medication from the 
 * pharmacy database. It provides pricing information and prescription requirements.
 *
 * Scope:
 * - Returns ONLY pricing information (price + prescription requirement)
 * - Does NOT return stock availability (use check_stock for that)
 * - Does NOT return medication details (use get_medication_info for that)
 *
 * Search Strategy (4 fallbacks):
 * 1. Exact name match (case-insensitive)
 * 2. Partial name match (LIKE search)
 * 3. Active ingredient match
 * 4. Not found - return suggestions
 *
 * Use Cases:
 * - Customer asks "How much is [medication]?"
 * - Customer asks "What's the price of [medication]?"
 * - Customer wants to compare prices
 *
 * @module agent/tools/checkPrice
 */

const db = require('../../database/db');

/**
 * Check Price Function
 *
 * Retrieves the current price for a medication.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.medication_name - Name of the medication (English)
 * @returns {Promise<Object>} Result object with price information
 *
 * @example
 * // Successful price lookup
 * const result = await checkPrice({ medication_name: 'Acamol' });
 * // Returns: { success: true, data: { medication_name: 'Acamol', price: 12.90 } }
 *
 * @example
 * // Medication not found with suggestions
 * const result = await checkPrice({ medication_name: 'Acamo' });
 * // Returns: { success: false, error: 'MEDICATION_NOT_FOUND', suggestions: ['Acamol'] }
 */
async function checkPrice({ medication_name }) {
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
      SELECT name, price, requires_prescription 
      FROM medications 
      WHERE LOWER(name) = ?
    `).get(searchTerm);

    if (medication) {
      return {
        success: true,
        data: {
          medication_name: medication.name,
          price: medication.price,
          requires_prescription: medication.requires_prescription === 1
        }
      };
    }

    // FALLBACK STRATEGY 2: Partial name match (LIKE search)
    const similarByName = db.prepare(`
      SELECT name, price 
      FROM medications 
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
      SELECT name, active_ingredient 
      FROM medications 
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
      message: `Medication "${medication_name}" was not found in our inventory.`,
      suggestions: [],
      hint: 'Please check the spelling or ask a pharmacist for assistance.'
    };

  } catch (error) {
    console.error('Error in checkPrice:', error);
    return {
      success: false,
      error: 'SYSTEM_ERROR',
      message: 'An error occurred while checking the price. Please try again.'
    };
  }
}

module.exports = checkPrice;