-- ============================================================================
-- Pharmacy Agent Database Schema
-- ============================================================================
-- This schema defines the database structure for the pharmacy agent system,
-- which manages users (patients), medications inventory, and prescriptions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Users Table
-- ----------------------------------------------------------------------------
-- Stores patient/customer information for the pharmacy system
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,      -- Unique user identifier
    name TEXT NOT NULL,                        -- Full name of the user
    phone TEXT NOT NULL,                       -- Contact phone number
    id_number TEXT NOT NULL UNIQUE,            -- Government ID or patient ID (unique)
    date_of_birth TEXT NOT NULL,               -- Date of birth (ISO 8601 format)
    allergies TEXT DEFAULT '[]'                -- JSON array of known allergies
);

-- ----------------------------------------------------------------------------
-- Medications Table
-- ----------------------------------------------------------------------------
-- Stores the pharmacy's medication inventory and details
CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,      -- Unique medication identifier
    name TEXT NOT NULL UNIQUE,                 -- Brand/commercial name (unique)
    active_ingredient TEXT NOT NULL,           -- Active pharmaceutical ingredient
    dosage_form TEXT NOT NULL,                 -- Form (tablet, capsule, syrup, etc.)
    strength TEXT NOT NULL,                    -- Dosage strength (e.g., "500mg")
    requires_prescription INTEGER NOT NULL DEFAULT 0,  -- Boolean: 1 = Rx required, 0 = OTC
    description TEXT NOT NULL,                 -- Medication description and purpose
    usage_instructions TEXT NOT NULL,          -- How to take the medication
    warnings TEXT DEFAULT '[]',                -- JSON array of warnings and contraindications
    stock_quantity INTEGER NOT NULL DEFAULT 0, -- Current inventory count
    price REAL NOT NULL                        -- Price per unit
);

-- ----------------------------------------------------------------------------
-- Prescriptions Table
-- ----------------------------------------------------------------------------
-- Links users to medications with prescription details and validity
CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,      -- Unique prescription identifier
    user_id INTEGER NOT NULL,                  -- Reference to the patient
    medication_id INTEGER NOT NULL,            -- Reference to the prescribed medication
    prescribed_date TEXT NOT NULL,             -- Date prescription was issued (ISO 8601)
    valid_until TEXT NOT NULL,                 -- Expiration date of prescription (ISO 8601)
    refills_remaining INTEGER NOT NULL DEFAULT 0,  -- Number of refills left
    prescribing_doctor TEXT NOT NULL,          -- Name of the prescribing physician
    notes TEXT,                                -- Additional prescription notes
    FOREIGN KEY (user_id) REFERENCES users(id),           -- Enforce user relationship
    FOREIGN KEY (medication_id) REFERENCES medications(id) -- Enforce medication relationship
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
-- Performance optimization indexes for common query patterns

-- Fast lookup of users by their ID number
CREATE INDEX IF NOT EXISTS idx_users_id_number ON users(id_number);

-- Fast lookup of medications by name (for search functionality)
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);

-- Fast lookup of prescriptions by user (for patient prescription history)
CREATE INDEX IF NOT EXISTS idx_prescriptions_user_id ON prescriptions(user_id);