/**
 * Get User Prescriptions Tool
 *
 * ============================================================================
 * 1. NAME AND PURPOSE
 * ============================================================================
 * Name: get_user_prescriptions
 * 
 * Purpose: Retrieves prescription history and allergy information for authenticated 
 * users. Returns prescription metadata, refill status, and user allergies. Does NOT 
 * return stock availability (use check_stock), medication details (use get_medication_info), 
 * or pricing (use check_price).
 *
 * Note: user_id is automatically injected by the orchestrator for any tool whose
 * name starts with 'get_user_'. The agent doesn't need to ask for identification.
 *
 * ============================================================================
 * 2. INPUTS (Parameters and Types)
 * ============================================================================
 * user_id
 *   - Type: number (integer)
 *   - Required: Yes (auto-injected by system)
 *   - Description: User's database ID
 *   - Valid range: 1-10 (demo database)
 *   - Examples: 1, 2, 3
 *
 * ============================================================================
 * 3. OUTPUT SCHEMA (Fields and Types)
 * ============================================================================
 * 
 * SUCCESS RESPONSE:
 * {
 *   success: boolean                   // Always true for successful queries
 *   data: {
 *     user: {
 *       name: string                   // User's full name
 *       id_number: string              // National ID number
 *       allergies: Array<string>       // List of known allergies
 *     }
 *     prescriptions: Array<{
 *       prescription_id: number        // Unique prescription ID
 *       medication_name: string        // Name of prescribed medication
 *       dosage_form: string            // Form (Tablet, Capsule, etc.)
 *       strength: string               // Dosage strength (e.g., "500mg")
 *       prescribed_date: string        // ISO date (YYYY-MM-DD)
 *       valid_until: string            // ISO date (YYYY-MM-DD)
 *       refills_remaining: number      // Number of refills left
 *       prescribing_doctor: string     // Doctor's name
 *       notes: string                  // Prescription notes
 *       status: {
 *         is_expired: boolean          // true if past valid_until date
 *         has_refills: boolean         // true if refills_remaining > 0
 *         can_refill: boolean          // true if not expired AND has refills
 *       }
 *     }>
 *     summary: {
 *       total_prescriptions: number    // Total count of all prescriptions
 *       active_prescriptions: number   // Count of non-expired prescriptions
 *       refillable_now: number         // Count of prescriptions that can be refilled
 *     }
 *   }
 * }
 *
 * ERROR RESPONSE:
 * {
 *   success: boolean                   // Always false for errors
 *   error: string                      // Error code (see Error Handling section)
 *   message: string                    // Human-readable error message
 * }
 *
 * ============================================================================
 * 4. ERROR HANDLING
 * ============================================================================
 * USER_NOT_FOUND
 *   - Trigger: Invalid user_id (not in database)
 *   - Behavior: Returns error message, suggests contacting support
 *
 * INVALID_USER_ID
 *   - Trigger: Missing user_id, not a number, or out of valid range (1-10)
 *   - Behavior: Returns validation error, no database query attempted
 *
 * SYSTEM_ERROR
 *   - Trigger: Database connection failure or SQL query exception
 *   - Behavior: Logs technical error, returns generic user-friendly message
 *
 * ============================================================================
 * 5. FALLBACK BEHAVIOR
 * ============================================================================
 * No fallback search strategy - requires exact user_id match.
 *
 * Graceful degradation:
 *   - If user exists but has no prescriptions → Returns empty prescriptions array
 *     with summary showing zeros
 *   - If user has no allergies → Returns empty allergies array
 *   - Always returns user info even if prescriptions table is empty
 *
 * ============================================================================
 *
 * @module agent/tools/getUserPrescriptions
 */

const db = require('../../database/db');

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

    // Get prescriptions (MINIMAL INFO - agent should call other tools for details)
    const prescriptions = db.prepare(`
      SELECT 
        p.id as prescription_id,
        m.name as medication_name,
        m.dosage_form,
        m.strength,
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

    // Process prescriptions to calculate status (WITHOUT stock/ingredient info)
    const today = new Date().toISOString().split('T')[0];
    
    const processedPrescriptions = prescriptions.map(rx => {
      const isExpired = rx.valid_until < today;
      const hasRefills = rx.refills_remaining > 0;

      return {
        prescription_id: rx.prescription_id,
        medication_name: rx.medication_name,
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
          can_refill: !isExpired && hasRefills
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