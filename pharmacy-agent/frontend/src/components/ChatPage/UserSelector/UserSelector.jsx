/**
 * UserSelector Component
 * 
 * A dropdown component for selecting the current user/patient.
 * This simulates user authentication for the assignment demo.
 * In production, this would be replaced by a real authentication system.
 * This is essential for the agent to access user-specific data
 * (prescriptions, allergies, medical history).
 * 
 * Features:
 * - Displays all 10 users from the database
 * - Shows user names in dropdown (both English and Hebrew) 
 * - Note: User names match the database seed data exactly.
 * - Notifies parent when selection changes
 * - Resets chat history on user change
 * 
 * Props:
 * @param {number} selectedUserId - Currently selected user ID (1-10)
 * @param {function} onUserChange - Callback when user selection changes
 * @param {boolean} disabled - Whether selector is disabled (during loading)
 * 
 * @example
 * <UserSelector 
 *   selectedUserId={1}
 *   onUserChange={(userId) => handleUserChange(userId)}
 *   disabled={isLoading}
 * />
 */

import './UserSelector.css';

export function UserSelector({ selectedUserId, onUserChange, disabled = false }) {
  // List of users matching the database seed data
  const users = [
    { id: 1, name: 'David Cohen', nameHebrew: 'דוד כהן' },
    { id: 2, name: 'Sarah Levi', nameHebrew: 'שרה לוי' },
    { id: 3, name: 'Michael Ben-David', nameHebrew: 'מיכאל בן-דוד' },
    { id: 4, name: 'Rachel Green', nameHebrew: 'רחל גרין' },
    { id: 5, name: 'Yossi Mizrahi', nameHebrew: 'יוסי מזרחי' },
    { id: 6, name: 'Noa Shapira', nameHebrew: 'נועה שפירא' },
    { id: 7, name: 'Amit Goldberg', nameHebrew: 'עמית גולדברג' },
    { id: 8, name: 'Maya Peretz', nameHebrew: 'מאיה פרץ' },
    { id: 9, name: 'Oren Katz', nameHebrew: 'אורן כץ' },
    { id: 10, name: 'Tamar Rosen', nameHebrew: 'תמר רוזן' }
  ];

  const handleChange = (e) => {
    const userId = Number(e.target.value);
    onUserChange(userId);
  };

  return (
    <div className="user-selector-container">
      <label htmlFor="user-select" className="user-selector-label">
        Select Patient:
      </label>
      <select
        id="user-select"
        className="user-selector"
        value={selectedUserId}
        onChange={handleChange}
        disabled={disabled}
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.nameHebrew})
          </option>
        ))}
      </select>
    </div>
  );
}