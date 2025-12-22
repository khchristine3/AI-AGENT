/**
 * Check Stock Tool
 *
 * This tool checks the current stock availability for a specific medication.
 * It provides information about whether a medication is in stock and how many 
 * units are available.
 *
 * Scope:
 * - Returns ONLY stock/availability information (in_stock, quantity)
 * - Does NOT return price (use check_price for that)
 * - Does NOT return medication details (use get_medication_info for that)
 *
 * Search Strategy (4 fallbacks):
 * 1. Exact name match (case-insensitive)
 * 2. Partial name match (LIKE search)
 * 3. Active ingredient match
 * 4. Not found - return suggestions
 *
 * Use Cases:
 * - Customer asks "Do you have [medication]?"
 * - Customer asks "Is [medication] in stock?"
 * - Verifying availability for prescription refills
 *
 * @module agent/tools/checkStock
 */

const db = require('../../database/db');

/**
 * Check Stock Function
 *
 * Queries the database to check if a medication is in stock and returns
 * availability information.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.medication_name - Name of the medication to check
 * @returns {Promise<Object>} Result object with stock information or suggestions
 *
 * @example
 * // Exact match found
 * const result = await checkStock({ medication_name: 'Acamol' });
 * // Returns: { success: true, data: { medication_name: 'Acamol', in_stock: true, quantity: 150 } }
 *
 * @example
 * // Medication not found, returns suggestions
 * const result = await checkStock({ medication_name: 'Acamo' });
 * // Returns: { success: false, error: 'MEDICATION_NOT_FOUND', suggestions: ['Acamol'] }
 */
async function checkStock({ medication_name }) {
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
      SELECT name, stock_quantity, requires_prescription 
      FROM medications 
      WHERE LOWER(name) = ?
    `).get(searchTerm);

    if (medication) {
      const inStock = medication.stock_quantity > 0;
      
      return {
        success: true,
        data: {
          medication_name: medication.name,
          in_stock: inStock,
          quantity_available: medication.stock_quantity,
          requires_prescription: medication.requires_prescription === 1,
          status_message: inStock 
            ? `${medication.name} is in stock (${medication.stock_quantity} units available).`
            : `${medication.name} is currently out of stock.`
        }
      };
    }

    // FALLBACK STRATEGY 2: Partial name match (LIKE search)
    const similarByName = db.prepare(`
      SELECT name, stock_quantity 
      FROM medications 
      WHERE LOWER(name) LIKE ?
      LIMIT 5
    `).all(`%${searchTerm}%`);

    if (similarByName.length > 0) {
      return {
        success: false,
        error: 'MEDICATION_NOT_FOUND',
        message: `Medication "${medication_name}" not found.`,
        suggestions: similarByName.map(m => ({
          name: m.name,
          in_stock: m.stock_quantity > 0
        })),
        hint: 'Did you mean one of these medications?'
      };
    }

    // FALLBACK STRATEGY 3: Active ingredient match
    const similarByIngredient = db.prepare(`
      SELECT name, active_ingredient, stock_quantity 
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
          active_ingredient: m.active_ingredient,
          in_stock: m.stock_quantity > 0
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
    console.error('Error in checkStock:', error);
    return {
      success: false,
      error: 'DATABASE_ERROR',
      message: 'An error occurred while checking stock. Please try again.'
    };
  }
}

module.exports = checkStock;