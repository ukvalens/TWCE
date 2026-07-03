require('dotenv').config();
const { pool } = require('../config/db');

async function migrateRepairs() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE repair_requests
        ADD COLUMN IF NOT EXISTS admin_notes    TEXT,
        ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS assigned_to    UUID REFERENCES users(user_id),
        ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();
    `);
    console.log('✅ repair_requests columns added');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateRepairs();
