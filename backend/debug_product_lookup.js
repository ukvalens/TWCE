const { query } = require('./src/config/db');

(async () => {
  try {
    const name = 'iPhone 15 Pro';
    const res = await query('SELECT product_id, vendor_id, status, name FROM products WHERE name ILIKE $1 LIMIT 10', [`%${name}%`]);
    console.log('products:', res.rows);
    for (const row of res.rows) {
      const imgs = await query('SELECT image_id, image_url, is_primary FROM product_images WHERE product_id=$1 ORDER BY is_primary DESC, image_id DESC', [row.product_id]);
      console.log('images for', row.product_id, imgs.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();