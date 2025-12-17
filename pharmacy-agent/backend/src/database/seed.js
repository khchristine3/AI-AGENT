/**
 * Database Seed Script
 *
 * This script initializes the pharmacy database with sample data for development
 * and testing purposes. It creates a fresh database, applies the schema, and
 * populates it with sample users, medications, and prescriptions.
 *
 * WARNING: This script will delete the existing database if it exists.
 *
 * Usage: node src/database/seed.js
 *
 * @module database/seed
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(process.cwd(), './src/database/pharmacy.db');

// Remove existing database if it exists to start fresh
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Removed existing database');
}

// Create a new database instance
const db = new Database(dbPath);
console.log('Created new database');

// Read and execute the schema SQL file to create tables and indexes
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);
console.log('Schema created');

// ============================================================================
// Sample Data
// ============================================================================

/**
 * Sample Users (Patients)
 *
 * 10 test users with diverse profiles including various allergies.
 * Allergies are stored as JSON arrays for flexible querying.
 */
const users = [
  { name: 'David Cohen', phone: '050-1234567', id_number: '123456789', date_of_birth: '1985-03-15', allergies: JSON.stringify(['Penicillin']) },
  { name: 'Sarah Levi', phone: '052-2345678', id_number: '234567890', date_of_birth: '1990-07-22', allergies: JSON.stringify([]) },
  { name: 'Michael Ben-David', phone: '054-3456789', id_number: '345678901', date_of_birth: '1978-11-08', allergies: JSON.stringify(['Aspirin', 'Ibuprofen']) },
  { name: 'Rachel Green', phone: '053-4567890', id_number: '456789012', date_of_birth: '1995-01-30', allergies: JSON.stringify([]) },
  { name: 'Yossi Mizrahi', phone: '050-5678901', id_number: '567890123', date_of_birth: '1982-09-12', allergies: JSON.stringify(['Sulfa']) },
  { name: 'Noa Shapira', phone: '052-6789012', id_number: '678901234', date_of_birth: '1988-05-25', allergies: JSON.stringify([]) },
  { name: 'Amit Goldberg', phone: '054-7890123', id_number: '789012345', date_of_birth: '1975-12-03', allergies: JSON.stringify(['Codeine']) },
  { name: 'Maya Peretz', phone: '053-8901234', id_number: '890123456', date_of_birth: '1992-04-18', allergies: JSON.stringify(['Penicillin', 'Amoxicillin']) },
  { name: 'Oren Katz', phone: '050-9012345', id_number: '901234567', date_of_birth: '1980-08-07', allergies: JSON.stringify([]) },
  { name: 'Tamar Rosen', phone: '052-0123456', id_number: '012345678', date_of_birth: '1998-02-14', allergies: JSON.stringify(['Latex']) }
];

/**
 * Sample Medications
 *
 * 5 common medications including both OTC and prescription drugs.
 * Includes variety in stock levels (including out-of-stock Omeprazole).
 * Warnings are stored as JSON arrays.
 */
const medications = [
  { name: 'Acamol', active_ingredient: 'Paracetamol (Acetaminophen)', dosage_form: 'Tablet', strength: '500mg', requires_prescription: 0, description: 'Pain reliever and fever reducer.', usage_instructions: 'Adults: Take 1-2 tablets every 4-6 hours. Do not exceed 8 tablets in 24 hours.', warnings: JSON.stringify(['Do not exceed recommended dose', 'Avoid alcohol']), stock_quantity: 150, price: 12.90 },
  { name: 'Ibuprofen', active_ingredient: 'Ibuprofen', dosage_form: 'Tablet', strength: '400mg', requires_prescription: 0, description: 'NSAID for pain, fever, and inflammation.', usage_instructions: 'Adults: Take 1 tablet every 6-8 hours with food. Do not exceed 3 tablets in 24 hours.', warnings: JSON.stringify(['Take with food', 'Avoid if allergic to aspirin']), stock_quantity: 75, price: 18.50 },
  { name: 'Amoxicillin', active_ingredient: 'Amoxicillin', dosage_form: 'Capsule', strength: '500mg', requires_prescription: 1, description: 'Antibiotic for bacterial infections.', usage_instructions: 'Take as prescribed. Typically 1 capsule every 8 hours. Complete the full course.', warnings: JSON.stringify(['Requires prescription', 'Complete full course']), stock_quantity: 50, price: 35.00 },
  { name: 'Omeprazole', active_ingredient: 'Omeprazole', dosage_form: 'Capsule', strength: '20mg', requires_prescription: 1, description: 'Reduces stomach acid. Used for heartburn and GERD.', usage_instructions: 'Take 1 capsule daily, 30 minutes before breakfast.', warnings: JSON.stringify(['Requires prescription', 'Take before meals']), stock_quantity: 0, price: 28.00 },
  { name: 'Loratadine', active_ingredient: 'Loratadine', dosage_form: 'Tablet', strength: '10mg', requires_prescription: 0, description: 'Non-drowsy antihistamine for allergies.', usage_instructions: 'Take 1 tablet once daily. Do not exceed 1 tablet in 24 hours.', warnings: JSON.stringify(['May cause drowsiness in some']), stock_quantity: 100, price: 22.00 }
];

/**
 * Sample Prescriptions
 *
 * 5 prescriptions with different scenarios:
 * - Active prescriptions with refills
 * - Prescriptions with no refills remaining
 * - An expired prescription for testing validation
 */
const prescriptions = [
  { user_id: 2, medication_id: 3, prescribed_date: '2025-12-01', valid_until: '2026-06-01', refills_remaining: 2, prescribing_doctor: 'Dr. Avi Sharon', notes: 'For throat infection.' },
  { user_id: 4, medication_id: 4, prescribed_date: '2025-12-01', valid_until: '2026-06-01', refills_remaining: 3, prescribing_doctor: 'Dr. Miriam Levy', notes: 'For GERD.' },
  { user_id: 6, medication_id: 3, prescribed_date: '2025-12-01', valid_until: '2026-03-01', refills_remaining: 0, prescribing_doctor: 'Dr. Yosef Katz', notes: null },
  { user_id: 9, medication_id: 4, prescribed_date: '2025-12-01', valid_until: '2026-06-01', refills_remaining: 5, prescribing_doctor: 'Dr. Dana Cohen', notes: 'Long-term treatment.' },
  { user_id: 1, medication_id: 3, prescribed_date: '2024-06-01', valid_until: '2024-12-01', refills_remaining: 0, prescribing_doctor: 'Dr. Old Record', notes: 'Expired prescription.' }
];

// ============================================================================
// Data Insertion
// ============================================================================

/**
 * Insert Users
 *
 * Uses prepared statements for efficient and safe insertion.
 * Named parameters (@name, @phone, etc.) prevent SQL injection.
 */
const insertUser = db.prepare('INSERT INTO users (name, phone, id_number, date_of_birth, allergies) VALUES (@name, @phone, @id_number, @date_of_birth, @allergies)');
for (const user of users) insertUser.run(user);
console.log('Inserted ' + users.length + ' users');

/**
 * Insert Medications
 *
 * Populates the medication inventory with sample drugs.
 */
const insertMed = db.prepare('INSERT INTO medications (name, active_ingredient, dosage_form, strength, requires_prescription, description, usage_instructions, warnings, stock_quantity, price) VALUES (@name, @active_ingredient, @dosage_form, @strength, @requires_prescription, @description, @usage_instructions, @warnings, @stock_quantity, @price)');
for (const med of medications) insertMed.run(med);
console.log('Inserted ' + medications.length + ' medications');

/**
 * Insert Prescriptions
 *
 * Creates sample prescription records linking users to medications.
 */
const insertRx = db.prepare('INSERT INTO prescriptions (user_id, medication_id, prescribed_date, valid_until, refills_remaining, prescribing_doctor, notes) VALUES (@user_id, @medication_id, @prescribed_date, @valid_until, @refills_remaining, @prescribing_doctor, @notes)');
for (const rx of prescriptions) insertRx.run(rx);
console.log('Inserted ' + prescriptions.length + ' prescriptions');

// ============================================================================
// Completion
// ============================================================================

console.log('\nDatabase seeded successfully!');
db.close();