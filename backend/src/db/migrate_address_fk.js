/**
 * Migration: fix orders.address_id foreign key
 * Changes: RESTRICT → ON DELETE SET NULL
 * Run once: node backend/src/db/migrate_address_fk.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop the old constraint
    await client.query(`
      ALTER TABLE orders
      DROP CONSTRAINT IF EXISTS orders_address_id_fkey
    `);
    console.log('✓ Dropped old orders_address_id_fkey');

    // Re-add with ON DELETE SET NULL
    await client.query(`
      ALTER TABLE orders
      ADD CONSTRAINT orders_address_id_fkey
      FOREIGN KEY (address_id)
      REFERENCES user_addresses(address_id)
      ON DELETE SET NULL
    `);
    console.log('✓ Added new orders_address_id_fkey (ON DELETE SET NULL)');

    await client.query('COMMIT');
    console.log('✅ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
