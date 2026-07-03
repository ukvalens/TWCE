const { query } = require('../config/db');
const { paginate } = require('../utils/helpers');
const { resolvePrimaryImageUrl } = require('../utils/productImageUtils');
const { normalizeProductPayload } = require('./productPayload');
const { notify } = require('./communicationController');

// ─── Categories ────────────────────────────────────────────
const getCategories = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) { next(err); }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description, parent_id, image_url } = req.body;
    const result = await query(
      'INSERT INTO categories (name, description, parent_id, image_url) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, description, parent_id, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name, description, image_url } = req.body;
    const result = await query(
      'UPDATE categories SET name=COALESCE($1,name), description=COALESCE($2,description), image_url=COALESCE($3,image_url) WHERE category_id=$4 RETURNING *',
      [name, description, image_url, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const deleteCategory = async (req, res, next) => {
  try {
    await query('DELETE FROM categories WHERE category_id=$1', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (err) { next(err); }
};

// ─── Brands ────────────────────────────────────────────────
const getBrands = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM brands ORDER BY name');
    res.json(result.rows);
  } catch (err) { next(err); }
};

const createBrand = async (req, res, next) => {
  try {
    const { name, description, logo_url } = req.body;
    const result = await query(
      'INSERT INTO brands (name, description, logo_url) VALUES ($1,$2,$3) RETURNING *',
      [name, description, logo_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const updateBrand = async (req, res, next) => {
  try {
    const { name, description, logo_url } = req.body;
    const result = await query(
      'UPDATE brands SET name=COALESCE($1,name), description=COALESCE($2,description), logo_url=COALESCE($3,logo_url) WHERE brand_id=$4 RETURNING *',
      [name, description, logo_url, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const deleteBrand = async (req, res, next) => {
  try {
    await query('DELETE FROM brands WHERE brand_id=$1', [req.params.id]);
    res.json({ message: 'Brand deleted' });
  } catch (err) { next(err); }
};

// ─── Products ──────────────────────────────────────────────
const getProducts = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { category, brand, vendor, search, min_price, max_price, status, sort } = req.query;

    const params = [];
    const conditions = [];

    // If caller is a vendor, scope to their own products across all statuses
    if (req.user?.role_id === 2) {
      const v = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
      if (v.rows.length) { params.push(v.rows[0].vendor_id); conditions.push(`p.vendor_id = $${params.length}`); }
      if (status && status !== 'all') { params.push(status); conditions.push(`p.status = $${params.length}`); }
    } else {
      if (status && status !== 'all') { params.push(status); conditions.push(`p.status = $${params.length}`); }
      else if (!status) { conditions.push("p.status = 'active'"); }
    }

    if (category)  { params.push(category);        conditions.push(`p.category_id = $${params.length}`); }
    if (brand)     { params.push(brand);            conditions.push(`p.brand_id = $${params.length}`); }
    if (vendor)    { params.push(vendor);           conditions.push(`p.vendor_id = $${params.length}`); }
    if (search)    { params.push(`%${search}%`);    conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`); }
    if (min_price) { params.push(min_price);        conditions.push(`p.price >= $${params.length}`); }
    if (max_price) { params.push(max_price);        conditions.push(`p.price <= $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderMap = { price_asc: 'p.price ASC', price_desc: 'p.price DESC', newest: 'p.created_at DESC', rating: 'avg_rating DESC' };
    const orderBy = orderMap[sort] || 'p.created_at DESC';

    params.push(limit, offset);
    const result = await query(
      `SELECT p.*, c.name AS category_name, b.name AS brand_name, v.shop_name AS vendor_name,
              (SELECT image_url FROM product_images WHERE product_id=p.product_id ORDER BY is_primary DESC, image_id DESC LIMIT 1) AS primary_image
       FROM products p
       LEFT JOIN categories c ON p.category_id=c.category_id
       LEFT JOIN brands b ON p.brand_id=b.brand_id
       LEFT JOIN vendors v ON p.vendor_id=v.vendor_id
       ${where} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const count = await query(`SELECT COUNT(*) FROM products p ${where}`, params.slice(0, -2));
    res.json({ data: result.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { next(err); }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await query(
      `SELECT p.*, c.name AS category_name, b.name AS brand_name, v.shop_name AS vendor_name
       FROM products p
       LEFT JOIN categories c ON p.category_id=c.category_id
       LEFT JOIN brands b ON p.brand_id=b.brand_id
       LEFT JOIN vendors v ON p.vendor_id=v.vendor_id
       WHERE p.product_id=$1`,
      [id]
    );
    if (!product.rows.length) return res.status(404).json({ message: 'Product not found' });

    const [images, videos, specs, variants, compatibility] = await Promise.all([
      query('SELECT * FROM product_images WHERE product_id=$1 ORDER BY is_primary DESC, image_id DESC', [id]),
      query('SELECT * FROM product_videos WHERE product_id=$1', [id]),
      query('SELECT * FROM product_specifications WHERE product_id=$1', [id]),
      query('SELECT * FROM product_variants WHERE product_id=$1', [id]),
      query('SELECT * FROM product_compatibility WHERE product_id=$1', [id]),
    ]);

    const primaryImage = resolvePrimaryImageUrl(images.rows);

    // Track view
    if (req.user) {
      query('INSERT INTO product_views (user_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.user_id, id]).catch(() => {});
    }

    res.json({
      ...product.rows[0],
      primary_image: primaryImage || product.rows[0].primary_image || null,
      images: images.rows,
      videos: videos.rows,
      specifications: specs.rows,
      variants: variants.rows,
      compatibility: compatibility.rows,
    });
  } catch (err) { next(err); }
};

const createProduct = async (req, res, next) => {
  try {
    const payload = normalizeProductPayload(req.body);
    const { name, description, price, discount_price, stock_quantity, category_id, brand_id } = payload;

    // Admin can create without a vendor profile; vendors must have one
    let vendor_id = null;
    if (req.user.role_id !== 1) {
      const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
      if (!vendor.rows.length) return res.status(403).json({ message: 'Vendor profile required' });
      vendor_id = vendor.rows[0].vendor_id;
    }

    const productStatus = req.user.role_id === 1 ? (req.body.status || 'active') : 'pending';
    const result = await query(
      `INSERT INTO products (vendor_id, category_id, brand_id, name, description, price, discount_price, stock_quantity, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [vendor_id, category_id, brand_id, name, description, price, discount_price, stock_quantity, productStatus]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const updateProduct = async (req, res, next) => {
  try {
    const payload = normalizeProductPayload(req.body);
    const { name, description, price, discount_price, stock_quantity, category_id, brand_id } = payload;
    const status = req.body.status;

    let result;
    if (req.user.role_id === 1) {
      result = await query(
        `UPDATE products SET name=COALESCE($1,name), description=COALESCE($2,description), price=COALESCE($3,price),
         discount_price=COALESCE($4,discount_price), stock_quantity=COALESCE($5,stock_quantity),
         category_id=COALESCE($6,category_id), brand_id=COALESCE($7,brand_id), status=COALESCE($8,status), updated_at=NOW()
         WHERE product_id=$9 RETURNING *`,
        [name, description, price, discount_price, stock_quantity, category_id, brand_id, status, req.params.id]
      );
    } else {
      const existingProduct = await query('SELECT vendor_id FROM products WHERE product_id=$1', [req.params.id]);
      if (!existingProduct.rows.length) return res.status(404).json({ message: 'Product not found' });

      const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
      const vendorId = vendor.rows[0]?.vendor_id || existingProduct.rows[0]?.vendor_id;
      if (!vendorId) return res.status(403).json({ message: 'Vendor profile required' });

      // Auto-flip status based on stock when vendor updates
      const newStock = stock_quantity !== undefined ? parseInt(stock_quantity) : null;
      let autoStatus = null;
      if (newStock !== null) {
        if (newStock <= 0) autoStatus = 'inactive';
        else {
          // Only reactivate if it was inactive due to stock (not rejected/pending)
          const cur = await query('SELECT status FROM products WHERE product_id=$1', [req.params.id]);
          if (cur.rows[0]?.status === 'inactive') autoStatus = 'active';
        }
      }

      result = await query(
        `UPDATE products SET name=COALESCE($1,name), description=COALESCE($2,description), price=COALESCE($3,price),
         discount_price=COALESCE($4,discount_price), stock_quantity=COALESCE($5,stock_quantity),
         category_id=COALESCE($6,category_id), brand_id=COALESCE($7,brand_id),
         status=COALESCE($8,status), updated_at=NOW()
         WHERE product_id=$9 AND vendor_id=$10 RETURNING *`,
        [name, description, price, discount_price, stock_quantity, category_id, brand_id, autoStatus, req.params.id, vendorId]
      );
    }
    if (!result.rows.length) return res.status(404).json({ message: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const deleteProduct = async (req, res, next) => {
  try {
    const id = req.params.id;

    // Verify ownership
    if (req.user.role_id !== 1) {
      const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
      if (!vendor.rows.length) return res.status(403).json({ message: 'Vendor profile required' });
      const owns = await query('SELECT product_id FROM products WHERE product_id=$1 AND vendor_id=$2', [id, vendor.rows[0].vendor_id]);
      if (!owns.rows.length) return res.status(404).json({ message: 'Product not found' });
    } else {
      const exists = await query('SELECT product_id FROM products WHERE product_id=$1', [id]);
      if (!exists.rows.length) return res.status(404).json({ message: 'Product not found' });
    }

    // Remove all FK-dependent records first
    await query('DELETE FROM ai_recommendations WHERE product_id=$1', [id]);
    await query('DELETE FROM product_views WHERE product_id=$1', [id]);
    await query('DELETE FROM flash_sales WHERE product_id=$1', [id]);
    await query('DELETE FROM review_replies WHERE review_id IN (SELECT review_id FROM reviews WHERE product_id=$1)', [id]);
    await query('DELETE FROM reviews WHERE product_id=$1', [id]);
    await query('DELETE FROM product_specifications WHERE product_id=$1', [id]);
    await query('DELETE FROM product_variants WHERE product_id=$1', [id]);
    await query('DELETE FROM product_compatibility WHERE product_id=$1', [id]);
    await query('DELETE FROM product_images WHERE product_id=$1', [id]);
    await query('DELETE FROM product_videos WHERE product_id=$1', [id]);
    // Nullify cart & wishlist references
    await query('DELETE FROM cart_items WHERE product_id=$1', [id]);
    await query('DELETE FROM wishlist_items WHERE product_id=$1', [id]);
    // Nullify order_items (keep order history, just null the product ref)
    await query('UPDATE order_items SET product_id=NULL WHERE product_id=$1', [id]);
    // Nullify repair_requests
    await query('UPDATE repair_requests SET product_id=NULL WHERE product_id=$1', [id]);
    // Handle warranties (warranty_registrations cascade from warranties)
    await query('DELETE FROM warranty_registrations WHERE warranty_id IN (SELECT warranty_id FROM warranties WHERE product_id=$1)', [id]);
    await query('DELETE FROM warranties WHERE product_id=$1', [id]);

    await query('DELETE FROM products WHERE product_id=$1', [id]);
    res.json({ message: 'Product deleted' });
  } catch (err) { next(err); }
};

const uploadProductImages = async (req, res, next) => {
  try {
    if (!req.files?.length) return res.status(400).json({ message: 'No images uploaded' });

    await query('UPDATE product_images SET is_primary = FALSE WHERE product_id = $1', [req.params.id]);

    const images = req.files.map((file, i) => ({
      url: `/uploads/${file.filename}`,
      is_primary: i === 0,
    }));
    const inserted = await Promise.all(
      images.map((img) => query('INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1,$2,$3) RETURNING *', [req.params.id, img.url, img.is_primary]))
    );
    res.status(201).json(inserted.map((r) => r.rows[0]));
  } catch (err) { next(err); }
};

const addProductSpec = async (req, res, next) => {
  try {
    const { spec_name, spec_value } = req.body;
    const result = await query('INSERT INTO product_specifications (product_id, spec_name, spec_value) VALUES ($1,$2,$3) RETURNING *', [req.params.id, spec_name, spec_value]);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const addProductVariant = async (req, res, next) => {
  try {
    const { variant_name, variant_value, price_adjustment } = req.body;
    const result = await query('INSERT INTO product_variants (product_id, variant_name, variant_value, price_adjustment) VALUES ($1,$2,$3,$4) RETURNING *', [req.params.id, variant_name, variant_value, price_adjustment]);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const toggleProductStatus = async (req, res, next) => {
  try {
    let vendorId = null;
    if (req.user.role_id !== 1) {
      const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
      if (!vendor.rows.length) return res.status(403).json({ message: 'Vendor profile required' });
      vendorId = vendor.rows[0].vendor_id;
    }

    const cur = await query(
      'SELECT status, stock_quantity FROM products WHERE product_id=$1' + (vendorId ? ' AND vendor_id=$2' : ''),
      vendorId ? [req.params.id, vendorId] : [req.params.id]
    );
    if (!cur.rows.length) return res.status(404).json({ message: 'Product not found' });

    const { status, stock_quantity } = cur.rows[0];

    // Can only toggle between active ↔ inactive
    // Rejected/pending products cannot be self-activated by vendor
    if (!['active', 'inactive'].includes(status))
      return res.status(400).json({ message: `Cannot toggle a product with status "${status}"` });

    // Cannot activate a product with zero stock
    if (status === 'inactive' && parseInt(stock_quantity) <= 0)
      return res.status(400).json({ message: 'Cannot activate a product with zero stock. Please restock first.' });

    const next_status = status === 'active' ? 'inactive' : 'active';
    const result = await query(
      'UPDATE products SET status=$1, updated_at=NOW() WHERE product_id=$2 RETURNING *',
      [next_status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const approveProduct = async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await query("UPDATE products SET status=$1 WHERE product_id=$2 RETURNING *", [status, req.params.id]);
    if (result.rows.length) {
      const p = result.rows[0];
      if (p.vendor_id) {
        const vendor = await query('SELECT user_id FROM vendors WHERE vendor_id=$1', [p.vendor_id]);
        if (vendor.rows.length) {
          const msg = status === 'active'
            ? `Your product "${p.name}" has been approved and is now live.`
            : `Your product "${p.name}" has been ${status}.`;
          notify(vendor.rows[0].user_id, `Product ${status === 'active' ? 'Approved' : 'Status Updated'}`, msg, 'product');
        }
      }
    }
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const getFeaturedProducts = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, (SELECT image_url FROM product_images WHERE product_id=p.product_id ORDER BY is_primary DESC, image_id DESC LIMIT 1) AS primary_image
       FROM products p WHERE p.is_featured=TRUE AND p.status='active' ORDER BY p.created_at DESC LIMIT 12`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const getNewArrivals = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, (SELECT image_url FROM product_images WHERE product_id=p.product_id ORDER BY is_primary DESC, image_id DESC LIMIT 1) AS primary_image
       FROM products p WHERE p.is_new_arrival=TRUE AND p.status='active' ORDER BY p.created_at DESC LIMIT 12`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const getBestSelling = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, COALESCE(SUM(oi.quantity),0) AS total_sold,
              (SELECT image_url FROM product_images WHERE product_id=p.product_id ORDER BY is_primary DESC, image_id DESC LIMIT 1) AS primary_image
       FROM products p LEFT JOIN order_items oi ON p.product_id=oi.product_id
       WHERE p.status='active' GROUP BY p.product_id ORDER BY total_sold DESC LIMIT 12`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const getRelatedProducts = async (req, res, next) => {
  try {
    const product = await query('SELECT category_id FROM products WHERE product_id=$1', [req.params.id]);
    if (!product.rows.length) return res.status(404).json({ message: 'Product not found' });
    const result = await query(
      `SELECT p.*, (SELECT image_url FROM product_images WHERE product_id=p.product_id ORDER BY is_primary DESC, image_id DESC LIMIT 1) AS primary_image
       FROM products p WHERE p.category_id=$1 AND p.product_id!=$2 AND p.status='active' LIMIT 8`,
      [product.rows[0].category_id, req.params.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const compareProducts = async (req, res, next) => {
  try {
    const { ids } = req.query; // comma-separated product IDs
    const idList = ids.split(',').slice(0, 4);
    const placeholders = idList.map((_, i) => `$${i + 1}`).join(',');
    const result = await query(
      `SELECT p.*, c.name AS category_name, b.name AS brand_name
       FROM products p
       LEFT JOIN categories c ON p.category_id=c.category_id
       LEFT JOIN brands b ON p.brand_id=b.brand_id
       WHERE p.product_id IN (${placeholders})`,
      idList
    );
    const products = await Promise.all(result.rows.map(async (p) => {
      const specs = await query('SELECT * FROM product_specifications WHERE product_id=$1', [p.product_id]);
      return { ...p, specifications: specs.rows };
    }));
    res.json(products);
  } catch (err) { next(err); }
};

module.exports = {
  getCategories, createCategory, updateCategory, deleteCategory,
  getBrands, createBrand, updateBrand, deleteBrand,
  getProducts, getProductById, createProduct, updateProduct, deleteProduct,
  uploadProductImages, addProductSpec, addProductVariant,
  toggleProductStatus, approveProduct, getFeaturedProducts, getNewArrivals, getBestSelling,
  getRelatedProducts, compareProducts,
};
