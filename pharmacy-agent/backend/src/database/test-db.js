  /**
   * Database Test Script
   *
   * This script performs comprehensive testing of the pharmacy database after
   * seeding. It queries and displays all data to verify that the database was
   * set up correctly and contains the expected sample data.
   *
   * Test Coverage:
   * 1. Record counts for all tables (users, medications, prescriptions)
   * 2. Medication inventory with stock levels and prescription requirements
   * 3. User profiles with allergy information
   * 4. Prescription relationships with user and medication details
   *
   * Usage:
   *   node src/database/test-db.js
   *
   * Output:
   * - Displays formatted data from all tables
   * - Shows relationships between users, medications, and prescriptions
   * - Verifies foreign key relationships are working
   *
   * @module database/test-db
   */

  const db = require('./db');

  console.log('\n========== Testing Database ==========\n');

  // Test 1: Count records
  console.log('1. Record counts:');
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const medCount = db.prepare('SELECT COUNT(*) as count FROM medications').get();
  const rxCount = db.prepare('SELECT COUNT(*) as count FROM prescriptions').get();

  console.log(`   Users: ${userCount.count}`);
  console.log(`   Medications: ${medCount.count}`);
  console.log(`   Prescriptions: ${rxCount.count}`);

  // Test 2: List all medications
  console.log('\n2. Medications:');
  const meds = db.prepare('SELECT name, stock_quantity, requires_prescription FROM medications').all();
  meds.forEach(m => {
    const rx = m.requires_prescription ? 'Rx' : 'OTC';
    const stock = m.stock_quantity > 0 ? `${m.stock_quantity} in stock` : 'OUT OF STOCK';
    console.log(`   [${rx}] ${m.name}: ${stock}`);
  });

  // Test 3: List all users
  console.log('\n3. Users:');
  const users = db.prepare('SELECT name, id_number, allergies FROM users').all();
  users.forEach(u => {
    const allergies = JSON.parse(u.allergies);
    const allergyText = allergies.length > 0 ? `Allergies: ${allergies.join(', ')}` : 'No allergies';
    console.log(`   ${u.name} (${u.id_number}) - ${allergyText}`);
  });

  // Test 4: List prescriptions with user names
  console.log('\n4. Prescriptions:');
  const prescriptions = db.prepare(`
    SELECT u.name as user_name, m.name as med_name, p.valid_until, p.refills_remaining
    FROM prescriptions p
    JOIN users u ON p.user_id = u.id
    JOIN medications m ON p.medication_id = m.id
  `).all();
  prescriptions.forEach(p => {
    console.log(`   ${p.user_name} -> ${p.med_name} (valid until: ${p.valid_until}, refills: ${p.refills_remaining})`);
  });

  console.log('\n========== Database Test Complete ==========\n');

  db.close();

