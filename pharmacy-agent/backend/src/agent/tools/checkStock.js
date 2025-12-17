/**
 * Check Stock Tool
 *
 * This tool checks the current stock availability and price of medications
 * in the pharmacy inventory. It implements intelligent search with multiple
 * fallback strategies to help users find medications even with typos or
 * partial names.
 *
 * Search Strategy:
 * 1. Exact name match (case-insensitive)
 * 2. Partial name match (LIKE search)
 * 3. Active ingredient match
 * 4. List all medications if nothing found
 *
 * Returns:
 * - For exact match: Stock quantity, price, and prescription requirement
 * - For partial matches: Suggestions with stock status
 * - For no matches: Complete medication inventory
 *
 * @module agent/tools/checkStock
 */

const db = require('../../database/db');

/**
 * Check Stock Function
 *
 * Queries the database to check if a medication is in stock and returns
 * availability information along with price and prescription requirements.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.medication_name - Name of the medication to check
 * @returns {Promise<Object>} Result object with stock information or suggestions
 *
 * @example
 * // Exact match found
 * const result = await checkStock({ medication_name: 'Acamol' });
 * // Returns: { success: true, data: { medication_name: 'Acamol', in_stock: true, ... } }
 *
 * @example
 * // Medication not found, returns suggestions
 * const result = await checkStock({ medication_name: 'Acamo' });
 * // Returns: { success: false, error: 'MEDICATION_NOT_FOUND', suggestions: [...] }
 */
async function checkStock({ medication_name }) {
  try {
    const searchTerm = medication_name.trim().toLowerCase();
    
    // 1. Try exact match
    let medication = db.prepare(`
      SELECT name, stock_quantity, price, requires_prescription 
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
          price: medication.price,
          requires_prescription: medication.requires_prescription === 1,
          status_message: inStock 
            ? `${medication.name} is in stock (${medication.stock_quantity} units available).`
            : `${medication.name} is currently out of stock.`
        }
      };
    }

    // 2. Fallback: Try partial name match
    const similarByName = db.prepare(`
      SELECT name, stock_quantity FROM medications 
      WHERE LOWER(name) LIKE ?
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

    // 3. Fallback: Try search by active ingredient
    const similarByIngredient = db.prepare(`
      SELECT name, active_ingredient, stock_quantity FROM medications 
      WHERE LOWER(active_ingredient) LIKE ?
    `).all(`%${searchTerm}%`);

    if (similarByIngredient.length > 0) {
      return {
        success: false,
        error: 'MEDICATION_NOT_FOUND',
        message: `Medication "${medication_name}" not found, but we have medications with similar ingredients.`,
        suggestions: similarByIngredient.map(m => ({
          name: m.name,
          active_ingredient: m.active_ingredient,
          in_stock: m.stock_quantity > 0
        })),
        hint: 'These medications contain a similar active ingredient.'
      };
    }

    // 4. Nothing found - list all available medications
    const allMedications = db.prepare(`
      SELECT name, stock_quantity FROM medications
      ORDER BY name
    `).all();

    return {
      success: false,
      error: 'MEDICATION_NOT_FOUND',
      message: `Medication "${medication_name}" was not found in our inventory.`,
      suggestions: allMedications.map(m => ({
        name: m.name,
        in_stock: m.stock_quantity > 0
      })),
      hint: 'Here are the medications we carry.'
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