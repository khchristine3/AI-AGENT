/**
 * Check Stock Tool
 *
 * ============================================================================
 * 1. NAME AND PURPOSE
 * ============================================================================
 * Name: check_stock
 * 
 * Purpose: Checks real-time inventory availability for medications. Returns 
 * stock status and quantity available. Does NOT return pricing (use check_price) 
 * or medication details (use get_medication_info) or if prescription required (use get_medication_info).
 *
 * ============================================================================
 * 2. INPUTS (Parameters and Types)
 * ============================================================================
 * medication_name
 *   - Type: string
 *   - Required: Yes
 *   - Description: Name of the medication to check stock for
 *   - Examples: "Acamol", "Ibuprofen", "Omeprazole"
 *
 * ============================================================================
 * 3. OUTPUT SCHEMA (Fields and Types)
 * ============================================================================
 * 
 * SUCCESS RESPONSE:
 * {
 *   success: boolean              // Always true for successful queries
 *   data: {
 *     medication_name: string     // Medication name as found in database
 *     in_stock: boolean           // true if quantity > 0, false otherwise
 *     quantity_available: number  // Number of units in stock (integer)
 *     status_message: string      // Human-readable status message
 *   }
 * }
 *
 * ERROR RESPONSE:
 * {
 *   success: boolean              // Always false for errors
 *   error: string                 // Error code (see Error Handling section)
 *   message: string               // Human-readable error message
 *   suggestions: Array<Object>    // Optional: Similar medications if found
 *   hint: string                  // Optional: Helpful hint for user
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
 * @module agent/tools/checkStock
 */

const db = require('../../database/db');

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
      SELECT name, stock_quantity 
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