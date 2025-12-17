/**
 * Check Stock Tool
 *
 * This tool checks the current stock availability and price of a medication
 * in the pharmacy database. It provides detailed information about whether a
 * medication is in stock, quantity available, pricing, and prescription requirements.
 *
 * Search Strategy:
 * 1. Exact name match (case-insensitive)
 * 2. Partial name match (LIKE search)
 *
 * Returns:
 * - For exact match: Medication stock details including quantity, price, and in-stock status
 * - For partial matches: Suggestions for possible medications
 * - For no matches: Helpful error message
 *
 * @module agent/tools/checkStock
 */

const db = require('../../database/db');

/**
 * Check Stock Function
 *
 * Queries the database to retrieve stock and pricing information for a medication.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.medication_name - Name of the medication to check
 * @returns {Promise<Object>} Result object with stock information or suggestions
 *
 * @example
 * // Exact match found
 * const result = await checkStock({ medication_name: 'Acamol' });
 * // Returns: { success: true, data: { medication_name: 'Acamol', in_stock: true, quantity_available: 150, price: 10.5, ... } }
 *
 * @example
 * // Medication not found, returns suggestions
 * const result = await checkStock({ medication_name: 'Acamo' });
 * // Returns: { success: false, error: 'MEDICATION_NOT_FOUND', suggestions: [...], hint: 'Did you mean...' }
 */
async function checkStock({ medication_name }) {
  try {
    const searchTerm = medication_name.trim().toLowerCase();
    
    // Try Exact match
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

    //Fallback: Try partial match
    const similar = db.prepare(`
      SELECT name, stock_quantity FROM medications 
      WHERE LOWER(name) LIKE ?
    `).all(`%${searchTerm}%`);

    if (similar.length > 0) {
      return {
        success: false,
        error: 'MEDICATION_NOT_FOUND',
        message: `Medication "${medication_name}" not found.`,
        suggestions: similar.map(m => ({
          name: m.name,
          in_stock: m.stock_quantity > 0
        })),
        hint: 'Did you mean one of these medications?'
      };
    }

    // No matches
    return {
      success: false,
      error: 'MEDICATION_NOT_FOUND',
      message: `Medication "${medication_name}" was not found in our inventory.`,
      suggestions: [],
      hint: 'Please check the spelling or ask for available medications.'
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
