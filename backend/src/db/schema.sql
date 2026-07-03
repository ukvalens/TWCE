-- ============================================================
-- TWCE - The World of Computers and Electronics
-- Full PostgreSQL Database Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USER & AUTHENTICATION MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role_id INT REFERENCES roles(role_id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','banned')),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_addresses (
  address_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  country VARCHAR(100),
  city VARCHAR(100),
  street VARCHAR(255),
  postal_code VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- 2. VENDOR MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS vendors (
  vendor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  shop_name VARCHAR(200) NOT NULL,
  business_email VARCHAR(255),
  business_phone VARCHAR(20),
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_documents (
  document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE CASCADE,
  document_type VARCHAR(100),
  file_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. PRODUCT MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  category_id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  parent_id INT REFERENCES categories(category_id),
  description TEXT,
  image_url VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS brands (
  brand_id SERIAL PRIMARY KEY,
  name VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  logo_url VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS products (
  product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE SET NULL,
  category_id INT REFERENCES categories(category_id),
  brand_id INT REFERENCES brands(brand_id),
  name VARCHAR(300) NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL,
  discount_price NUMERIC(12,2),
  stock_quantity INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active','inactive','pending','rejected')),
  is_featured BOOLEAN DEFAULT FALSE,
  is_new_arrival BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  image_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS product_videos (
  video_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,
  video_url VARCHAR(500) NOT NULL
);

CREATE TABLE IF NOT EXISTS product_specifications (
  spec_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,
  spec_name VARCHAR(150) NOT NULL,
  spec_value VARCHAR(500) NOT NULL
);

CREATE TABLE IF NOT EXISTS product_variants (
  variant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,
  variant_name VARCHAR(150),
  variant_value VARCHAR(150),
  price_adjustment NUMERIC(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_compatibility (
  compatibility_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,
  compatible_product_name VARCHAR(300)
);

-- ============================================================
-- 4. CART & WISHLIST
-- ============================================================

CREATE TABLE IF NOT EXISTS carts (
  cart_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  cart_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID REFERENCES carts(cart_id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(product_id),
  variant_id UUID REFERENCES product_variants(variant_id),
  quantity INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS wishlist (
  wishlist_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  wishlist_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wishlist_id UUID REFERENCES wishlist(wishlist_id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(product_id)
);

-- ============================================================
-- 5. ORDER MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  address_id UUID REFERENCES user_addresses(address_id) ON DELETE SET NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','returned')),
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded','partially_refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(product_id),
  variant_id UUID REFERENCES product_variants(variant_id),
  quantity INT NOT NULL,
  price NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_status_history (
  status_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(order_id) ON DELETE CASCADE,
  status VARCHAR(30),
  note TEXT,
  changed_by UUID REFERENCES users(user_id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE REFERENCES orders(order_id),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. PAYMENT MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  method_id SERIAL PRIMARY KEY,
  method_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(order_id),
  amount NUMERIC(12,2) NOT NULL,
  method_id INT REFERENCES payment_methods(method_id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(payment_id),
  transaction_ref VARCHAR(255) UNIQUE,
  gateway_response JSONB,
  status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. DELIVERY MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS deliveries (
  delivery_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE REFERENCES orders(order_id),
  delivery_person_id UUID REFERENCES users(user_id),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','assigned','in_transit','delivered','failed')),
  estimated_time TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS delivery_tracking (
  tracking_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES deliveries(delivery_id) ON DELETE CASCADE,
  location VARCHAR(300),
  status VARCHAR(30),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. WARRANTY & REPAIR MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS warranties (
  warranty_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID UNIQUE REFERENCES products(product_id),
  duration_months INT NOT NULL,
  terms TEXT
);

CREATE TABLE IF NOT EXISTS warranty_registrations (
  registration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warranty_id UUID REFERENCES warranties(warranty_id),
  user_id UUID REFERENCES users(user_id),
  order_item_id UUID REFERENCES order_items(order_item_id),
  purchase_date DATE,
  expiry_date DATE,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repair_requests (
  request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  product_id UUID REFERENCES products(product_id),
  issue_description TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','in_review','in_repair','completed','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. RETURNS & REFUNDS MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS return_requests (
  return_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(order_id),
  user_id UUID REFERENCES users(user_id),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds (
  refund_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(payment_id),
  return_id UUID REFERENCES return_requests(return_id),
  amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  processed_at TIMESTAMPTZ
);

-- ============================================================
-- 10. REVIEWS MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  product_id UUID REFERENCES products(product_id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_replies (
  reply_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES reviews(review_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. PROMOTIONS MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS coupons (
  coupon_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) CHECK (discount_type IN ('percentage','fixed')),
  value NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(12,2) DEFAULT 0,
  max_uses INT,
  used_count INT DEFAULT 0,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS coupon_usage (
  usage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID REFERENCES coupons(coupon_id),
  user_id UUID REFERENCES users(user_id),
  order_id UUID REFERENCES orders(order_id),
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_points (
  point_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(user_id),
  points INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  lt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  points INT NOT NULL,
  type VARCHAR(20) CHECK (type IN ('earned','redeemed')),
  reference VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flash_sales (
  flash_sale_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(product_id),
  sale_price NUMERIC(12,2) NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- 12. AI & ANALYTICS MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS product_views (
  view_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  product_id UUID REFERENCES products(product_id),
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS search_history (
  search_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  query VARCHAR(500),
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_recommendations (
  recommendation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  product_id UUID REFERENCES products(product_id),
  score NUMERIC(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud_logs (
  fraud_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  reason TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. COMMUNICATION MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES users(user_id),
  receiver_id UUID REFERENCES users(user_id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  assigned_to UUID REFERENCES users(user_id),
  subject VARCHAR(300),
  message TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_replies (
  reply_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. SYSTEM ADMIN MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  action VARCHAR(255) NOT NULL,
  table_name VARCHAR(100),
  record_id VARCHAR(255),
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(50),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  setting_id SERIAL PRIMARY KEY,
  key VARCHAR(150) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO roles (role_name, description) VALUES
  ('admin', 'System administrator with full access'),
  ('vendor', 'Vendor/seller managing products and orders'),
  ('customer', 'Regular customer'),
  ('support', 'Customer support staff'),
  ('delivery', 'Delivery personnel')
ON CONFLICT DO NOTHING;

INSERT INTO payment_methods (method_name) VALUES
  ('Mobile Money'), ('Credit Card'), ('Debit Card'), ('Bank Transfer'), ('PayPal'), ('Cash on Delivery')
ON CONFLICT DO NOTHING;

INSERT INTO system_settings (key, value, description) VALUES
  ('site_name', 'TWCE', 'Website name'),
  ('site_currency', 'USD', 'Default currency'),
  ('loyalty_points_per_dollar', '10', 'Loyalty points per dollar spent'),
  ('max_return_days', '30', 'Days allowed for return requests'),
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode')
ON CONFLICT DO NOTHING;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_user ON product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
