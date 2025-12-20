/**
 * Get User Prescriptions Tool
 *
 * This tool retrieves prescription information for an authenticated user
 * from the pharmacy database using their user ID (1-10).
 *
 * Authentication:
 * - User is already authenticated via the UI
 * - User ID (1-10) is provided by the system automatically
 * - No additional verification needed
 *
 * Prescription Processing:
 * - Calculates expiration status
 * - Checks refill availability
 * - Verifies medication stock status
 * - Provides summary statistics
 *
 * @module agent/tools/getUserPrescriptions
 */

const db = require('../../database/db');

/**
 * Get User Prescriptions Function
 *
 * Retrieves all prescriptions for the authenticated user with detailed status
 * information including expiration dates, refill counts, and stock availability.
 *
 * @param {Object} params - Function parameters
 * @param {number} params.user_id - User's database ID (1-10)
 * @returns {Promise<Object>} Result object with user info, prescriptions, and summary
 *
 * @example
 * // Successful retrieval
 * const result = await getUserPrescriptions({ user_id: 1 });
 * // Returns: {
 * //   success: true,
 * //   data: {
 * //     user: { name: 'David Cohen', allergies: ['Penicillin'] },
 * //     prescriptions: [...],
 * //     summary: { total_prescriptions: 1, active_prescriptions: 0, refillable_now: 0 }
 * //   }
 * // }
 *
 * @example
 * // User not found
 * const result = await getUserPrescriptions({ user_id: 999 });
 * // Returns: { success: false, error: 'USER_NOT_FOUND', message: 'User not found.' }
 */
async function getUserPrescriptions({ user_id }) {
  try {
    // Validate user_id parameter
    if (!user_id || typeof user_id !== 'number') {
      return {
        success: false,
        error: 'INVALID_USER_ID',
        message: 'Valid user ID is required.'
      };
    }

    // Validate user_id is in valid range (1-10)
    if (user_id < 1 || user_id > 10) {
      return {
        success: false,
        error: 'INVALID_USER_ID',
        message: 'User ID must be between 1 and 10.'
      };
    }

    // Get user by database ID
    const user = db.prepare(`
      SELECT id, name, phone, id_number, allergies 
      FROM users 
      WHERE id = ?
    `).get(user_id);

    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found. Please contact support.'
      };
    }

    // Get prescriptions for this user
    const prescriptions = db.prepare(`
      SELECT 
        p.id as prescription_id,
        m.name as medication_name,
        m.active_ingredient,
        m.dosage_form,
        m.strength,
        m.stock_quantity,
        p.prescribed_date,
        p.valid_until,
        p.refills_remaining,
        p.prescribing_doctor,
        p.notes
      FROM prescriptions p
      JOIN medications m ON p.medication_id = m.id
      WHERE p.user_id = ?
      ORDER BY p.valid_until DESC
    `).all(user.id);

    // Process prescriptions to calculate status
    const today = new Date().toISOString().split('T')[0];
    
    const processedPrescriptions = prescriptions.map(rx => {
      const isExpired = rx.valid_until < today;
      const hasRefills = rx.refills_remaining > 0;
      const inStock = rx.stock_quantity > 0;

      return {
        prescription_id: rx.prescription_id,
        medication_name: rx.medication_name,
        active_ingredient: rx.active_ingredient,
        dosage_form: rx.dosage_form,
        strength: rx.strength,
        prescribed_date: rx.prescribed_date,
        valid_until: rx.valid_until,
        refills_remaining: rx.refills_remaining,
        prescribing_doctor: rx.prescribing_doctor,
        notes: rx.notes,
        status: {
          is_expired: isExpired,
          has_refills: hasRefills,
          in_stock: inStock,
          can_refill: !isExpired && hasRefills && inStock
        }
      };
    });

    return {
      success: true,
      data: {
        user: {
          name: user.name,
          id_number: user.id_number,
          allergies: JSON.parse(user.allergies || '[]')
        },
        prescriptions: processedPrescriptions,
        summary: {
          total_prescriptions: processedPrescriptions.length,
          active_prescriptions: processedPrescriptions.filter(rx => !rx.status.is_expired).length,
          refillable_now: processedPrescriptions.filter(rx => rx.status.can_refill).length
        }
      }
    };

  } catch (error) {
    console.error('Error in getUserPrescriptions:', error);
    return {
      success: false,
      error: 'SYSTEM_ERROR',
      message: 'An error occurred while retrieving prescription information. Please try again.'
    };
  }
}

module.exports = getUserPrescriptions;