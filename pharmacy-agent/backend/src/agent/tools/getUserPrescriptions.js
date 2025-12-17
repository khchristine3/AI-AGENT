/**
 * Get User Prescriptions Tool
 *
 * This tool verifies a user's identity and retrieves their prescription
 * information from the pharmacy database. It implements two-factor verification
 * using ID number and phone number for security.
 *
 * Security Features:
 * - Two-factor verification (ID number + last 4 digits of phone)
 * - Input validation for format and completeness
 * - Returns user allergy information for safety checks
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
 * Verifies user identity using two-factor authentication (ID + phone) and
 * retrieves all prescriptions with detailed status information including
 * expiration dates, refill counts, and stock availability.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.id_number - User's ID number (Teudat Zehut)
 * @param {string} params.phone_last_4 - Last 4 digits of registered phone number
 * @returns {Promise<Object>} Result object with user info, prescriptions, and summary
 *
 * @example
 * // Successful verification and retrieval
 * const result = await getUserPrescriptions({
 *   id_number: '123456789',
 *   phone_last_4: '4567'
 * });
 * // Returns: {
 * //   success: true,
 * //   data: {
 * //     user: { name: 'David Cohen', allergies: ['Penicillin'] },
 * //     prescriptions: [...],
 * //     summary: { total_prescriptions: 2, active_prescriptions: 1, ... }
 * //   }
 * // }
 *
 * @example
 * // Verification failed
 * const result = await getUserPrescriptions({
 *   id_number: '123456789',
 *   phone_last_4: '9999'
 * });
 * // Returns: { success: false, error: 'VERIFICATION_FAILED', message: '...' }
 */
async function getUserPrescriptions({ id_number, phone_last_4 }) {
  try {
    // Input validation
    if (!id_number || !phone_last_4) {
      return {
        success: false,
        error: 'MISSING_CREDENTIALS',
        message: 'Both ID number and last 4 digits of phone are required for verification.'
      };
    }

    const cleanId = id_number.toString().trim();
    const cleanPhone = phone_last_4.toString().trim();

    // Validate phone format
    if (cleanPhone.length !== 4 || !/^\d{4}$/.test(cleanPhone)) {
      return {
        success: false,
        error: 'INVALID_PHONE_FORMAT',
        message: 'Please provide exactly 4 digits from your phone number.'
      };
    }

    // Find user by ID
    const user = db.prepare(`
      SELECT id, name, phone, id_number, allergies 
      FROM users 
      WHERE id_number = ?
    `).get(cleanId);

    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'No account found with this ID number. Please check and try again.'
      };
    }

    // Verify phone (last 4 digits)
    const userPhoneLast4 = user.phone.replace(/\D/g, '').slice(-4);
    
    if (userPhoneLast4 !== cleanPhone) {
      return {
        success: false,
        error: 'VERIFICATION_FAILED',
        message: 'Phone number verification failed. Please check the last 4 digits and try again.'
      };
    }

    // Get prescriptions
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

    // Process prescriptions
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