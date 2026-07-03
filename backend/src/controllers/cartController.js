const { query } = require('../config/db');

const getCart = async (req, res, next) => {
  try {
    let cart = await query('SELECT * FROM carts WHERE user_id=$1', [req.user.user_id]);
    if (!cart.rows.length) {
      cart = await query('INSERT INTO carts (user_id) VALUES ($1) RETURNING *', [req.user.user_id]);
    }
    const cartId = cart.rows[0].cart_id;
    const items = await query(
      `SELECT ci.*, p.name, p.price, p.discount_price, p.stock_quantity,
              pv.variant_name, pv.variant_value, pv.price_adjustment,
              (SELECT image_url FROM product_images WHERE product_id=p.product_id AND is_primary=TRUE LIMIT 1) AS image
       FROM cart_items ci
       JOIN products p ON ci.product_id=p.product_id
       LEFT JOIN product_variants pv ON ci.variant_id=pv.variant_id
       WHERE ci.cart_id=$1`,
      [cartId]
    );
    res.json({ cart_id: cartId, items: items.rows });
  } catch (err) { next(err); }
};

const addToCart = async (req, res, next) => {
  try {
    const { product_id, variant_id, quantity = 1 } = req.body;
    let cart = await query('SELECT cart_id FROM carts WHERE user_id=$1', [req.user.user_id]);
    if (!cart.rows.length) {
      cart = await query('INSERT INTO carts (user_id) VALUES ($1) RETURNING *', [req.user.user_id]);
    }
    const cartId = cart.rows[0].cart_id;

    const existing = await query('SELECT * FROM cart_items WHERE cart_id=$1 AND product_id=$2 AND (variant_id=$3 OR ($3 IS NULL AND variant_id IS NULL))', [cartId, product_id, variant_id]);
    let result;
    if (existing.rows.length) {
      result = await query('UPDATE cart_items SET quantity=quantity+$1 WHERE cart_item_id=$2 RETURNING *', [quantity, existing.rows[0].cart_item_id]);
    } else {
      result = await query('INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES ($1,$2,$3,$4) RETURNING *', [cartId, product_id, variant_id, quantity]);
    }

    const productInfo = await query('SELECT p.name, p.vendor_id FROM products p WHERE p.product_id=$1', [product_id]);
    if (productInfo.rows[0]?.vendor_id) {
      const vendorUser = await query('SELECT user_id FROM vendors WHERE vendor_id=$1', [productInfo.rows[0].vendor_id]);
      if (vendorUser.rows[0]?.user_id) {
        await query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
          [vendorUser.rows[0].user_id, 'Cart activity', `${productInfo.rows[0].name} was added to a customer cart.`, 'order']
        );
      }
    }

    res.status(existing.rows.length ? 200 : 201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (quantity < 1) {
      await query('DELETE FROM cart_items WHERE cart_item_id=$1', [req.params.itemId]);
      return res.json({ message: 'Item removed' });
    }
    const result = await query('UPDATE cart_items SET quantity=$1 WHERE cart_item_id=$2 RETURNING *', [quantity, req.params.itemId]);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const removeCartItem = async (req, res, next) => {
  try {
    await query('DELETE FROM cart_items WHERE cart_item_id=$1', [req.params.itemId]);
    res.json({ message: 'Item removed from cart' });
  } catch (err) { next(err); }
};

const clearCart = async (req, res, next) => {
  try {
    const cart = await query('SELECT cart_id FROM carts WHERE user_id=$1', [req.user.user_id]);
    if (cart.rows.length) await query('DELETE FROM cart_items WHERE cart_id=$1', [cart.rows[0].cart_id]);
    res.json({ message: 'Cart cleared' });
  } catch (err) { next(err); }
};

// ─── Wishlist ──────────────────────────────────────────────
const getWishlist = async (req, res, next) => {
  try {
    // Auto-create wishlist if missing
    let wishlist = await query('SELECT wishlist_id FROM wishlist WHERE user_id=$1', [req.user.user_id]);
    if (!wishlist.rows.length) {
      wishlist = await query('INSERT INTO wishlist (user_id) VALUES ($1) RETURNING *', [req.user.user_id]);
    }
    const result = await query(
      `SELECT wi.wishlist_item_id, wi.product_id,
              p.name, p.price, p.discount_price, p.status, p.stock_quantity,
              c.name  AS category_name,
              b.name  AS brand_name,
              v.shop_name AS vendor_name,
              (SELECT image_url FROM product_images WHERE product_id=p.product_id AND is_primary=TRUE LIMIT 1) AS image
       FROM wishlist_items wi
       JOIN products p  ON wi.product_id  = p.product_id
       LEFT JOIN categories c ON p.category_id = c.category_id
       LEFT JOIN brands     b ON p.brand_id    = b.brand_id
       LEFT JOIN vendors    v ON p.vendor_id   = v.vendor_id
       WHERE wi.wishlist_id = $1
       ORDER BY wi.wishlist_item_id DESC`,
      [wishlist.rows[0].wishlist_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const addToWishlist = async (req, res, next) => {
  try {
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ message: 'product_id is required' });

    // Auto-create wishlist if missing
    let wishlist = await query('SELECT wishlist_id FROM wishlist WHERE user_id=$1', [req.user.user_id]);
    if (!wishlist.rows.length) {
      wishlist = await query('INSERT INTO wishlist (user_id) VALUES ($1) RETURNING *', [req.user.user_id]);
    }

    const existing = await query(
      'SELECT * FROM wishlist_items WHERE wishlist_id=$1 AND product_id=$2',
      [wishlist.rows[0].wishlist_id, product_id]
    );
    if (existing.rows.length) return res.status(409).json({ message: 'Already in wishlist' });

    const result = await query(
      'INSERT INTO wishlist_items (wishlist_id, product_id) VALUES ($1,$2) RETURNING *',
      [wishlist.rows[0].wishlist_id, product_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const removeFromWishlist = async (req, res, next) => {
  try {
    const wishlist = await query('SELECT wishlist_id FROM wishlist WHERE user_id=$1', [req.user.user_id]);
    if (!wishlist.rows.length) return res.json({ message: 'Removed' });
    await query(
      'DELETE FROM wishlist_items WHERE wishlist_id=$1 AND product_id=$2',
      [wishlist.rows[0].wishlist_id, req.params.productId]
    );
    res.json({ message: 'Removed from wishlist' });
  } catch (err) { next(err); }
};

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart, getWishlist, addToWishlist, removeFromWishlist };
