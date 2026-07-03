require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Users (1 admin, 2 vendors, 2 customers, 1 support, 1 delivery) ──
    const hash = await bcrypt.hash('Password123!', 12);

    const usersResult = await client.query(`
      INSERT INTO users (full_name, email, phone, password_hash, role_id, status, email_verified) VALUES
        ('Admin User',       'admin@twce.com',     '+1000000001', $1, 1, 'active', TRUE),
        ('Alice Vendor',     'alice@twce.com',     '+1000000002', $1, 2, 'active', TRUE),
        ('Bob Vendor',       'bob@twce.com',       '+1000000003', $1, 2, 'active', TRUE),
        ('Carol Customer',   'carol@twce.com',     '+1000000004', $1, 3, 'active', TRUE),
        ('David Customer',   'david@twce.com',     '+1000000005', $1, 3, 'active', TRUE),
        ('Eve Support',      'eve@twce.com',       '+1000000006', $1, 4, 'active', TRUE),
        ('Frank Delivery',   'frank@twce.com',     '+1000000007', $1, 5, 'active', TRUE)
      ON CONFLICT (email) DO NOTHING
      RETURNING user_id, email, role_id
    `, [hash]);

    const users = {};
    for (const u of usersResult.rows) users[u.email] = u.user_id;

    // ── Addresses ──
    const addrResult = await client.query(`
      INSERT INTO user_addresses (user_id, country, city, street, postal_code, is_default) VALUES
        ($1, 'USA', 'New York',    '123 Main St',     '10001', TRUE),
        ($2, 'USA', 'Los Angeles', '456 Sunset Blvd', '90001', TRUE),
        ($3, 'UK',  'London',      '789 Baker St',    'NW1 6X', TRUE)
      RETURNING address_id
    `, [users['carol@twce.com'], users['david@twce.com'], users['admin@twce.com']]);

    const addr1 = addrResult.rows[0].address_id;
    const addr2 = addrResult.rows[1].address_id;

    // ── Vendors ──
    const vendorResult = await client.query(`
      INSERT INTO vendors (user_id, shop_name, business_email, business_phone, verification_status, rating) VALUES
        ($1, 'TechZone Store',    'techzone@twce.com',  '+2000000001', 'verified', 4.5),
        ($2, 'GadgetHub',         'gadgethub@twce.com', '+2000000002', 'verified', 4.2)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING vendor_id
    `, [users['alice@twce.com'], users['bob@twce.com']]);

    const vendor1 = vendorResult.rows[0]?.vendor_id;
    const vendor2 = vendorResult.rows[1]?.vendor_id;

    // ── Categories ──
    const catResult = await client.query(`
      INSERT INTO categories (name, description) VALUES
        ('Laptops',       'Portable computers for work and gaming'),
        ('Smartphones',   'Mobile phones and accessories'),
        ('Monitors',      'Desktop displays and screens'),
        ('Accessories',   'Keyboards, mice and peripherals'),
        ('Networking',    'Routers, switches and cables')
      ON CONFLICT DO NOTHING
      RETURNING category_id, name
    `);
    const cats = {};
    for (const c of catResult.rows) cats[c.name] = c.category_id;

    // ── Brands ──
    const brandResult = await client.query(`
      INSERT INTO brands (name, description) VALUES
        ('Apple',   'Premium consumer electronics'),
        ('Samsung', 'Korean electronics giant'),
        ('Dell',    'American PC manufacturer'),
        ('HP',      'Hewlett-Packard computers'),
        ('Logitech','Peripherals and accessories')
      ON CONFLICT (name) DO NOTHING
      RETURNING brand_id, name
    `);
    const brands = {};
    for (const b of brandResult.rows) brands[b.name] = b.brand_id;

    // ── Products ──
    const prodData = [
      [vendor1, cats['Laptops'],    brands['Apple'],   'MacBook Pro 14"',        'Apple M3 Pro chip, 18GB RAM, 512GB SSD',         1999.99, 1849.99, 15, true,  true ],
      [vendor1, cats['Laptops'],    brands['Dell'],    'Dell XPS 15',            'Intel Core i7, 16GB RAM, 512GB NVMe SSD',        1499.99, 1399.99, 20, true,  false],
      [vendor2, cats['Smartphones'],brands['Apple'],   'iPhone 15 Pro',          'A17 Pro chip, 256GB, Titanium design',           1199.99, null,    30, true,  true ],
      [vendor2, cats['Smartphones'],brands['Samsung'], 'Samsung Galaxy S24',     'Snapdragon 8 Gen 3, 128GB, 50MP camera',          899.99,  799.99, 25, false, true ],
      [vendor1, cats['Monitors'],   brands['Dell'],    'Dell UltraSharp 27"',   '4K IPS display, USB-C, 99% sRGB',                 549.99,  499.99, 12, false, false],
      [vendor2, cats['Accessories'],brands['Logitech'],'Logitech MX Keys',       'Wireless keyboard with backlight',                109.99,   89.99, 50, false, false],
      [vendor1, cats['Networking'], brands['HP'],      'HP WiFi 6 Router',       'Dual-band WiFi 6 router, 3000 Mbps',              199.99,  179.99, 18, false, false],
    ];
    const prodResult = { rows: [] };
    for (const p of prodData) {
      const r = await client.query(
        `INSERT INTO products (vendor_id, category_id, brand_id, name, description, price, discount_price, stock_quantity, status, is_featured, is_new_arrival)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10) RETURNING product_id, name`,
        p
      );
      prodResult.rows.push(r.rows[0]);
    }

    const prods = {};
    for (const p of prodResult.rows) prods[p.name] = p.product_id;

    // ── Product Images ──
    const imageData = [
      [prods['MacBook Pro 14"'],    'https://placehold.co/600x400?text=MacBook+Pro'],
      [prods['Dell XPS 15'],        'https://placehold.co/600x400?text=Dell+XPS'],
      [prods['iPhone 15 Pro'],      'https://placehold.co/600x400?text=iPhone+15'],
      [prods['Samsung Galaxy S24'], 'https://placehold.co/600x400?text=Galaxy+S24'],
      [prods['Dell UltraSharp 27"'],'https://placehold.co/600x400?text=Dell+Monitor'],
      [prods['Logitech MX Keys'],   'https://placehold.co/600x400?text=MX+Keys'],
      [prods['HP WiFi 6 Router'],   'https://placehold.co/600x400?text=HP+Router'],
    ];
    for (const [pid, url] of imageData) {
      await client.query('INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1,$2,TRUE)', [pid, url]);
    }

    // ── Product Specifications ──
    const specData = [
      [prods['MacBook Pro 14"'],    'Processor',  'Apple M3 Pro'],
      [prods['MacBook Pro 14"'],    'RAM',         '18GB'],
      [prods['MacBook Pro 14"'],    'Storage',     '512GB SSD'],
      [prods['Dell XPS 15'],        'Processor',  'Intel Core i7-13700H'],
      [prods['Dell XPS 15'],        'RAM',         '16GB DDR5'],
      [prods['iPhone 15 Pro'],      'Chip',        'Apple A17 Pro'],
      [prods['iPhone 15 Pro'],      'Camera',      '48MP Main + 12MP Ultra Wide'],
      [prods['Samsung Galaxy S24'], 'Processor',  'Snapdragon 8 Gen 3'],
      [prods['Samsung Galaxy S24'], 'Battery',    '4000mAh'],
      [prods['Dell UltraSharp 27"'],'Resolution', '3840x2160 (4K)'],
    ];
    for (const [pid, name, val] of specData) {
      await client.query('INSERT INTO product_specifications (product_id, spec_name, spec_value) VALUES ($1,$2,$3)', [pid, name, val]);
    }

    // ── Product Variants ──
    const variantData = [
      [prods['MacBook Pro 14"'], 'Storage', '512GB', 0],
      [prods['MacBook Pro 14"'], 'Storage', '1TB',   200],
      [prods['Dell XPS 15'],     'Color',   'Silver', 0],
      [prods['Dell XPS 15'],     'Color',   'Black',  0],
      [prods['iPhone 15 Pro'],   'Storage', '256GB',  0],
      [prods['iPhone 15 Pro'],   'Storage', '512GB',  200],
    ];
    for (const [pid, vname, vval, adj] of variantData) {
      await client.query('INSERT INTO product_variants (product_id, variant_name, variant_value, price_adjustment) VALUES ($1,$2,$3,$4)', [pid, vname, vval, adj]);
    }

    // ── Warranties ──
    const warrantyData = [
      [prods['MacBook Pro 14"'],    12, 'One year limited warranty. Covers manufacturing defects.'],
      [prods['Dell XPS 15'],        24, 'Two year warranty. Includes on-site support.'],
      [prods['iPhone 15 Pro'],      12, 'Apple limited warranty. Does not cover physical damage.'],
      [prods['Samsung Galaxy S24'], 12, 'Samsung one year warranty.'],
      [prods['Dell UltraSharp 27"'],36, 'Dell three year premium warranty with next business day support.'],
    ];
    for (const [pid, months, terms] of warrantyData) {
      await client.query('INSERT INTO warranties (product_id, duration_months, terms) VALUES ($1,$2,$3) ON CONFLICT (product_id) DO NOTHING', [pid, months, terms]);
    }

    // ── Coupons ──
    await client.query(`
      INSERT INTO coupons (code, discount_type, value, min_order_amount, max_uses, expiry_date) VALUES
        ('WELCOME10',  'percentage', 10, 50,   100, '2025-12-31'),
        ('SAVE50',     'fixed',      50, 500,   50, '2025-12-31'),
        ('TECH20',     'percentage', 20, 200,   30, '2025-06-30'),
        ('FREESHIP',   'fixed',      15, 100,  200, '2025-09-30'),
        ('TWCE2025',   'percentage', 15, 100,   75, '2025-12-31')
      ON CONFLICT (code) DO NOTHING
    `);

    // ── Wishlists & Loyalty for customers ──
    await client.query(`
      INSERT INTO wishlist (user_id) VALUES ($1), ($2)
      ON CONFLICT (user_id) DO NOTHING
    `, [users['carol@twce.com'], users['david@twce.com']]);

    await client.query(`
      INSERT INTO loyalty_points (user_id, points) VALUES ($1, 250), ($2, 150)
      ON CONFLICT (user_id) DO NOTHING
    `, [users['carol@twce.com'], users['david@twce.com']]);

    // ── Wishlist Items ──
    const wlResult = await client.query(`SELECT wishlist_id FROM wishlist WHERE user_id=$1`, [users['carol@twce.com']]);
    if (wlResult.rows.length) {
      await client.query(`
        INSERT INTO wishlist_items (wishlist_id, product_id) VALUES ($1,$2), ($1,$3)
      `, [wlResult.rows[0].wishlist_id, prods['MacBook Pro 14"'], prods['iPhone 15 Pro']]);
    }

    // ── Orders ──
    const order1 = await client.query(`
      INSERT INTO orders (user_id, address_id, total_amount, discount_amount, status, payment_status)
      VALUES ($1, $2, 3199.98, 150.00, 'delivered', 'paid') RETURNING order_id
    `, [users['carol@twce.com'], addr1]);

    const order2 = await client.query(`
      INSERT INTO orders (user_id, address_id, total_amount, discount_amount, status, payment_status)
      VALUES ($1, $2, 899.99, 0, 'confirmed', 'paid') RETURNING order_id
    `, [users['david@twce.com'], addr2]);

    const order3 = await client.query(`
      INSERT INTO orders (user_id, address_id, total_amount, discount_amount, status, payment_status)
      VALUES ($1, $2, 1399.99, 100.00, 'pending', 'unpaid') RETURNING order_id
    `, [users['carol@twce.com'], addr1]);

    const oid1 = order1.rows[0].order_id;
    const oid2 = order2.rows[0].order_id;
    const oid3 = order3.rows[0].order_id;

    // ── Order Items ──
    const oi1 = await client.query(`
      INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
        ($1, $2, 1, 1849.99),
        ($1, $3, 1, 1199.99)
      RETURNING order_item_id
    `, [oid1, prods['MacBook Pro 14"'], prods['iPhone 15 Pro']]);

    await client.query(`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, 1, 899.99)`,
      [oid2, prods['Samsung Galaxy S24']]);

    await client.query(`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, 1, 1399.99)`,
      [oid3, prods['Dell XPS 15']]);

    // ── Order Status History ──
    const carol = users['carol@twce.com'];
    const admin = users['admin@twce.com'];
    await client.query(`INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES ($1,'pending','Order placed',$2)`, [oid1, carol]);
    await client.query(`INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES ($1,'confirmed','Payment confirmed',$2)`, [oid1, admin]);
    await client.query(`INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES ($1,'shipped','Dispatched from warehouse',$2)`, [oid1, admin]);
    await client.query(`INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES ($1,'delivered','Delivered successfully',$2)`, [oid1, admin]);
    await client.query(`INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES ($1,'pending','Order placed',$2)`, [oid2, carol]);
    await client.query(`INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES ($1,'confirmed','Payment confirmed',$2)`, [oid2, admin]);

    // ── Invoices ──
    await client.query(`
      INSERT INTO invoices (order_id, invoice_number) VALUES
        ($1, 'INV-2025-001'),
        ($2, 'INV-2025-002'),
        ($3, 'INV-2025-003')
      ON CONFLICT (order_id) DO NOTHING
    `, [oid1, oid2, oid3]);

    // ── Payments ──
    const pay1 = await client.query(`
      INSERT INTO payments (order_id, amount, method_id, status, paid_at) VALUES
        ($1, 3199.98, 2, 'completed', NOW())
      RETURNING payment_id
    `, [oid1]);

    const pay2 = await client.query(`
      INSERT INTO payments (order_id, amount, method_id, status, paid_at) VALUES
        ($1, 899.99, 5, 'completed', NOW())
      RETURNING payment_id
    `, [oid2]);

    // ── Transactions ──
    await client.query(`INSERT INTO transactions (payment_id, transaction_ref, gateway_response, status) VALUES ($1,'TXN-2025-CC-001','{}','completed')`, [pay1.rows[0].payment_id]);
    await client.query(`INSERT INTO transactions (payment_id, transaction_ref, gateway_response, status) VALUES ($1,'TXN-2025-PP-001','{}','completed')`, [pay2.rows[0].payment_id]);

    // ── Deliveries ──
    const del1 = await client.query(`
      INSERT INTO deliveries (order_id, delivery_person_id, status, estimated_time, delivered_at) VALUES
        ($1, $2, 'delivered', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day')
      RETURNING delivery_id
    `, [oid1, users['frank@twce.com']]);

    const del2 = await client.query(`
      INSERT INTO deliveries (order_id, delivery_person_id, status, estimated_time) VALUES
        ($1, $2, 'in_transit', NOW() + INTERVAL '1 day')
      RETURNING delivery_id
    `, [oid2, users['frank@twce.com']]);

    // ── Delivery Tracking ──
    const did1 = del1.rows[0].delivery_id;
    const did2 = del2.rows[0].delivery_id;
    await client.query(`INSERT INTO delivery_tracking (delivery_id, location, status) VALUES ($1,'Warehouse - New York','assigned')`, [did1]);
    await client.query(`INSERT INTO delivery_tracking (delivery_id, location, status) VALUES ($1,'Transit Hub - Queens','in_transit')`, [did1]);
    await client.query(`INSERT INTO delivery_tracking (delivery_id, location, status) VALUES ($1,'Customer Location','delivered')`, [did1]);
    await client.query(`INSERT INTO delivery_tracking (delivery_id, location, status) VALUES ($1,'Warehouse - LA','assigned')`, [did2]);
    await client.query(`INSERT INTO delivery_tracking (delivery_id, location, status) VALUES ($1,'Transit Hub - Burbank','in_transit')`, [did2]);

    // ── Warranty Registrations ──
    const warrantyResult = await client.query(`SELECT warranty_id FROM warranties WHERE product_id=$1`, [prods['MacBook Pro 14"']]);
    if (warrantyResult.rows.length && oi1.rows.length) {
      await client.query(`
        INSERT INTO warranty_registrations (warranty_id, user_id, order_item_id, purchase_date, expiry_date) VALUES
          ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months')
        ON CONFLICT DO NOTHING
      `, [warrantyResult.rows[0].warranty_id, users['carol@twce.com'], oi1.rows[0].order_item_id]);
    }

    // ── Repair Requests ──
    await client.query(`INSERT INTO repair_requests (user_id, product_id, issue_description, status) VALUES ($1,$2,'Screen flickering after 6 months of use','in_review')`,
      [users['carol@twce.com'], prods['MacBook Pro 14"']]);
    await client.query(`INSERT INTO repair_requests (user_id, product_id, issue_description, status) VALUES ($1,$2,'Battery drains very fast','pending')`,
      [users['david@twce.com'], prods['Samsung Galaxy S24']]);

    // ── Return Requests ──
    await client.query(`INSERT INTO return_requests (order_id, user_id, reason, status) VALUES ($1,$2,'Product not as described, different color received','pending')`,
      [oid1, users['carol@twce.com']]);

    // ── Reviews ──
    await client.query(`INSERT INTO reviews (user_id, product_id, rating, comment, is_verified, status) VALUES ($1,$2,5,'Absolutely love this MacBook! Fast and great battery.',TRUE,'approved')`,
      [users['carol@twce.com'], prods['MacBook Pro 14"']]);
    await client.query(`INSERT INTO reviews (user_id, product_id, rating, comment, is_verified, status) VALUES ($1,$2,4,'iPhone 15 Pro is amazing but expensive.',TRUE,'approved')`,
      [users['carol@twce.com'], prods['iPhone 15 Pro']]);
    await client.query(`INSERT INTO reviews (user_id, product_id, rating, comment, is_verified, status) VALUES ($1,$2,5,'Samsung Galaxy S24 has an incredible camera!',TRUE,'approved')`,
      [users['david@twce.com'], prods['Samsung Galaxy S24']]);
    await client.query(`INSERT INTO reviews (user_id, product_id, rating, comment, is_verified, status) VALUES ($1,$2,3,'Good monitor but the stand could be better.',TRUE,'approved')`,
      [users['david@twce.com'], prods['Dell UltraSharp 27"']]);
    await client.query(`INSERT INTO reviews (user_id, product_id, rating, comment, is_verified, status) VALUES ($1,$2,4,'Great keyboard for long typing sessions.',FALSE,'pending')`,
      [users['carol@twce.com'], prods['Logitech MX Keys']]);

    // ── Notifications ──
    await client.query(`INSERT INTO notifications (user_id, title, message, type, is_read) VALUES ($1,'Order Delivered','Your order #INV-2025-001 has been delivered!','order',TRUE)`, [users['carol@twce.com']]);
    await client.query(`INSERT INTO notifications (user_id, title, message, type, is_read) VALUES ($1,'Review Approved','Your review for MacBook Pro has been approved.','review',FALSE)`, [users['carol@twce.com']]);
    await client.query(`INSERT INTO notifications (user_id, title, message, type, is_read) VALUES ($1,'Order Confirmed','Your order #INV-2025-002 is confirmed.','order',FALSE)`, [users['david@twce.com']]);
    await client.query(`INSERT INTO notifications (user_id, title, message, type, is_read) VALUES ($1,'Flash Sale!','20%% off on all laptops today only!','promotion',FALSE)`, [users['carol@twce.com']]);
    await client.query(`INSERT INTO notifications (user_id, title, message, type, is_read) VALUES ($1,'Coupon Available','Use WELCOME10 for 10%% off your next order.','promotion',TRUE)`, [users['david@twce.com']]);

    // ── Messages ──
    await client.query(`INSERT INTO messages (sender_id, receiver_id, content, is_read) VALUES ($1,$2,'Hello, I have a question about my order.',TRUE)`, [users['carol@twce.com'], users['eve@twce.com']]);
    await client.query(`INSERT INTO messages (sender_id, receiver_id, content, is_read) VALUES ($1,$2,'Hi Carol! How can I help you today?',TRUE)`, [users['eve@twce.com'], users['carol@twce.com']]);
    await client.query(`INSERT INTO messages (sender_id, receiver_id, content, is_read) VALUES ($1,$2,'When will my MacBook be delivered?',FALSE)`, [users['carol@twce.com'], users['eve@twce.com']]);
    await client.query(`INSERT INTO messages (sender_id, receiver_id, content, is_read) VALUES ($1,$2,'Is the Dell XPS 15 still available?',TRUE)`, [users['david@twce.com'], users['alice@twce.com']]);
    await client.query(`INSERT INTO messages (sender_id, receiver_id, content, is_read) VALUES ($1,$2,'Yes, we have 20 units in stock!',FALSE)`, [users['alice@twce.com'], users['david@twce.com']]);

    // ── Support Tickets ──
    const ticket1 = await client.query(
      `INSERT INTO support_tickets (user_id, assigned_to, subject, message, status) VALUES ($1,$2,'Order not delivered on time','My order INV-2025-001 was supposed to arrive yesterday.','in_progress') RETURNING ticket_id`,
      [users['carol@twce.com'], users['eve@twce.com']]
    );
    await client.query(
      `INSERT INTO support_tickets (user_id, assigned_to, subject, message, status) VALUES ($1,$2,'Wrong product received','I ordered a black Dell XPS but received a silver one.','open') RETURNING ticket_id`,
      [users['david@twce.com'], users['eve@twce.com']]
    );

    // ── Ticket Replies ──
    await client.query(`INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES ($1,$2,'We are sorry for the delay. Package is in transit and will arrive tomorrow.')`,
      [ticket1.rows[0].ticket_id, users['eve@twce.com']]);
    await client.query(`INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES ($1,$2,'Thank you for the update. I will wait.')`,
      [ticket1.rows[0].ticket_id, users['carol@twce.com']]);

    // ── Flash Sales ──
    await client.query(`INSERT INTO flash_sales (product_id, sale_price, start_time, end_time, is_active) VALUES ($1,1699.99,NOW()-INTERVAL '1 hour',NOW()+INTERVAL '23 hours',TRUE)`, [prods['MacBook Pro 14"']]);
    await client.query(`INSERT INTO flash_sales (product_id, sale_price, start_time, end_time, is_active) VALUES ($1,749.99,NOW()-INTERVAL '2 hours',NOW()+INTERVAL '22 hours',TRUE)`, [prods['Samsung Galaxy S24']]);

    // ── Search History ──
    await client.query(`INSERT INTO search_history (user_id, query) VALUES ($1,'MacBook Pro')`, [users['carol@twce.com']]);
    await client.query(`INSERT INTO search_history (user_id, query) VALUES ($1,'gaming laptop')`, [users['carol@twce.com']]);
    await client.query(`INSERT INTO search_history (user_id, query) VALUES ($1,'Samsung phone')`, [users['david@twce.com']]);
    await client.query(`INSERT INTO search_history (user_id, query) VALUES ($1,'wireless keyboard')`, [users['david@twce.com']]);
    await client.query(`INSERT INTO search_history (user_id, query) VALUES ($1,'iPhone 15')`, [users['carol@twce.com']]);

    // ── Product Views ──
    const viewData = [
      [users['carol@twce.com'], prods['MacBook Pro 14"']],
      [users['carol@twce.com'], prods['iPhone 15 Pro']],
      [users['carol@twce.com'], prods['Samsung Galaxy S24']],
      [users['david@twce.com'], prods['Samsung Galaxy S24']],
      [users['david@twce.com'], prods['Dell XPS 15']],
      [users['david@twce.com'], prods['Dell UltraSharp 27"']],
    ];
    for (const [uid, pid] of viewData) {
      await client.query('INSERT INTO product_views (user_id, product_id) VALUES ($1,$2)', [uid, pid]);
    }

    // ── AI Recommendations ──
    await client.query(`INSERT INTO ai_recommendations (user_id, product_id, score) VALUES ($1,$2,0.9500)`, [users['carol@twce.com'], prods['MacBook Pro 14"']]);
    await client.query(`INSERT INTO ai_recommendations (user_id, product_id, score) VALUES ($1,$2,0.8700)`, [users['carol@twce.com'], prods['iPhone 15 Pro']]);
    await client.query(`INSERT INTO ai_recommendations (user_id, product_id, score) VALUES ($1,$2,0.9200)`, [users['david@twce.com'], prods['Samsung Galaxy S24']]);
    await client.query(`INSERT INTO ai_recommendations (user_id, product_id, score) VALUES ($1,$2,0.7800)`, [users['david@twce.com'], prods['Dell XPS 15']]);

    // ── Audit Logs ──
    await client.query(`INSERT INTO audit_logs (user_id, action, table_name, ip_address) VALUES ($1,'USER_LOGIN','users','192.168.1.1')`, [users['admin@twce.com']]);
    await client.query(`INSERT INTO audit_logs (user_id, action, table_name, ip_address) VALUES ($1,'PRODUCT_APPROVED','products','192.168.1.1')`, [users['admin@twce.com']]);
    await client.query(`INSERT INTO audit_logs (user_id, action, table_name, ip_address) VALUES ($1,'PRODUCT_CREATED','products','192.168.1.2')`, [users['alice@twce.com']]);
    await client.query(`INSERT INTO audit_logs (user_id, action, table_name, ip_address) VALUES ($1,'ORDER_CREATED','orders','192.168.1.3')`, [users['carol@twce.com']]);
    await client.query(`INSERT INTO audit_logs (user_id, action, table_name, ip_address) VALUES ($1,'REVIEW_SUBMITTED','reviews','192.168.1.3')`, [users['carol@twce.com']]);

    // ── Loyalty Transactions ──
    await client.query(`INSERT INTO loyalty_transactions (user_id, points, type, reference) VALUES ($1,250,'earned','Order INV-2025-001')`, [users['carol@twce.com']]);
    await client.query(`INSERT INTO loyalty_transactions (user_id, points, type, reference) VALUES ($1,150,'earned','Order INV-2025-002')`, [users['david@twce.com']]);
    await client.query(`INSERT INTO loyalty_transactions (user_id, points, type, reference) VALUES ($1,50,'redeemed','Discount applied on order INV-2025-003')`, [users['carol@twce.com']]);

    // ── Product Compatibility ──
    const compatData = [
      [prods['MacBook Pro 14"'],    'Apple USB-C Hub'],
      [prods['MacBook Pro 14"'],    'MagSafe Charger 140W'],
      [prods['Dell XPS 15'],        'Dell Thunderbolt Dock'],
      [prods['iPhone 15 Pro'],      'Apple AirPods Pro'],
      [prods['Samsung Galaxy S24'], 'Samsung Galaxy Watch 6'],
    ];
    for (const [pid, name] of compatData) {
      await client.query('INSERT INTO product_compatibility (product_id, compatible_product_name) VALUES ($1,$2)', [pid, name]);
    }

    await client.query('COMMIT');
    console.log('✅ Seed completed successfully!');
    console.log('\n📋 Test Credentials (password for all: Password123!)');
    console.log('  admin@twce.com    → Admin');
    console.log('  alice@twce.com    → Vendor 1');
    console.log('  bob@twce.com      → Vendor 2');
    console.log('  carol@twce.com    → Customer 1');
    console.log('  david@twce.com    → Customer 2');
    console.log('  eve@twce.com      → Support');
    console.log('  frank@twce.com    → Delivery');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
