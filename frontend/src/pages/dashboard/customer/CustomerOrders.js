import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, X, Plus, ShoppingCart, Minus, Trash2, Search, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { formatPrice, formatDate, statusBadge } from '../../../utils/helpers';
import toast from 'react-hot-toast';

const imgSrc = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return url; // relative path served via CRA proxy → localhost:5000/uploads/...
};

/* ── helpers ── */
const itemTotal = (item) =>
  parseFloat(item.discount_price || item.price) * item.qty;

const cartTotal = (cart) =>
  cart.reduce((s, i) => s + itemTotal(i), 0);

/* ═══════════════════════════════════════════════════════════ */
const CustomerOrders = () => {
  const [tab, setTab] = useState('orders'); // 'orders' | 'shop'

  /* ── orders state ── */
  const [orders, setOrders]   = useState([]);
  const [ordLoading, setOrdLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [page, setPage]       = useState(1);
  const PAGE_SIZE             = 8;

  /* ── shop state ── */
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopLoaded, setShopLoaded]   = useState(false);
  const [search, setSearch]     = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [cart, setCart]         = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [shopPage, setShopPage]   = useState(1);
  const [shopTotal, setShopTotal] = useState(0);
  const SHOP_PAGE_SIZE            = 8;

  /* ── checkout state ── */
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [addresses, setAddresses]   = useState([]);
  const [payMethods, setPayMethods] = useState([]);
  const [addressId, setAddressId]   = useState('');
  const [payMethodId, setPayMethodId] = useState('');
  const [coupon, setCoupon]         = useState('');
  const [placing, setPlacing]       = useState(false);

  const navigate = useNavigate();

  /* ── load orders ── */
  useEffect(() => {
    api.get('/orders/my?limit=200')
      .then(r => setOrders(r.data.data || []))
      .catch(() => {})
      .finally(() => setOrdLoading(false));
  }, []);

  /* ── load shop ── */
  const loadShop = useCallback((pg = 1, q = '', cat = '') => {
    setShopLoading(true);
    const params = new URLSearchParams({ page: pg, limit: 8, status: 'active' });
    if (q)   params.append('search', q);
    if (cat) params.append('category', cat);
    Promise.all([
      api.get(`/products?${params}`),
      api.get('/products/meta/categories'),
    ]).then(([p, c]) => {
      setProducts(p.data.data || []);
      setShopTotal(p.data.total || 0);
      setCategories(c.data || []);
      setShopLoaded(true);
    }).catch(() => toast.error('Failed to load products'))
      .finally(() => setShopLoading(false));
  }, []);

  const switchTab = (t) => {
    setTab(t);
    if (t === 'shop') { setShopPage(1); loadShop(1, search, catFilter); }
  };

  const handleShopSearch = (val) => { setSearch(val); setShopPage(1); loadShop(1, val, catFilter); };
  const handleCatFilter  = (val) => { setCatFilter(val); setShopPage(1); loadShop(1, search, val); };
  const handleShopPage   = (pg)  => { setShopPage(pg); loadShop(pg, search, catFilter); };

  /* ── cart helpers ── */
  const addToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(i => i.product_id === product.product_id);
      if (exists) return prev.map(i => i.product_id === product.product_id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
    toast.success(`${product.name} added to cart`, { duration: 1500 });
  };

  const changeQty = (id, delta) => {
    setCart(prev => prev
      .map(i => i.product_id === id ? { ...i, qty: i.qty + delta } : i)
      .filter(i => i.qty > 0)
    );
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.product_id !== id));

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  /* ── open checkout ── */
  const openCheckout = async () => {
    if (!cart.length) return toast.error('Cart is empty');
    try {
      const [a, p] = await Promise.all([
        api.get('/users/addresses'),
        api.get('/payments/methods'),
      ]);
      setAddresses(a.data || []);
      setPayMethods(p.data || []);
      setAddressId(a.data?.[0]?.address_id || '');
      setPayMethodId(p.data?.[0]?.method_id?.toString() || '');
      setCartOpen(false);
      setCheckoutOpen(true);
    } catch { toast.error('Failed to load checkout data'); }
  };

  /* ── place order ── */
  const placeOrder = async (e) => {
    e.preventDefault();
    if (!addressId)   return toast.error('Please select a delivery address');
    if (!payMethodId) return toast.error('Please select a payment method');

    setPlacing(true);
    try {
      // 1. clear existing cart on server, then add items
      await api.delete('/cart');
      for (const item of cart) {
        await api.post('/cart/items', { product_id: item.product_id, quantity: item.qty });
      }
      // 2. place order
      const { data } = await api.post('/orders', {
        address_id: addressId,
        payment_method_id: parseInt(payMethodId),
        coupon_code: coupon.trim() || undefined,
      });
      toast.success(`Order placed! Invoice: ${data.order?.order_id?.slice(0, 8)}`);
      setCart([]);
      setCheckoutOpen(false);
      setTab('orders');
      // refresh orders
      const r = await api.get('/orders/my?limit=200');
      setOrders(r.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally { setPlacing(false); }
  };

  /* ── orders: cancel ── */
  const cancel = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      await api.put(`/orders/${orderId}/cancel`);
      setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: 'cancelled' } : o));
      toast.success('Order cancelled');
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot cancel'); }
  };

  /* ── filtered products ── */
  const filtered = products.filter(p => {
    const matchCat = !catFilter || String(p.category_id) === String(catFilter);
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const totalPages    = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pagedOrders   = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1>My Orders</h1>
          <p>Browse products and manage your orders</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {tab === 'shop' && cart.length > 0 && (
            <button className="btn btn-outline" onClick={() => setCartOpen(true)} style={{ position: 'relative' }}>
              <ShoppingCart size={16} />
              Cart
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: 'var(--error)', color: '#fff',
                borderRadius: '50%', width: 18, height: 18,
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{cartCount}</span>
            </button>
          )}
          <button
            className={`btn ${tab === 'shop' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => switchTab(tab === 'shop' ? 'orders' : 'shop')}
          >
            {tab === 'shop' ? '← Back to Orders' : <><Plus size={16} /> New Order</>}
          </button>
        </div>
      </div>

      {/* ══════════════ SHOP TAB ══════════════ */}
      {tab === 'shop' && (
        <div>
          {/* Search + Category filter */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 36 }}
                placeholder="Search products…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="form-control" style={{ width: 200 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
            </select>
          </div>

          {shopLoading && <div className="spinner" />}

          {!shopLoading && filtered.length === 0 && (
            <div className="card">
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>No products found</p>
            </div>
          )}

          {/* Product grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
            {filtered.map(p => {
              const inCart = cart.find(i => i.product_id === p.product_id);
              const price  = parseFloat(p.discount_price || p.price);
              return (
                <div key={p.product_id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {/* image */}
                  <div style={{ height: 200, background: '#f8f9fa', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border)' }}>
                    <img
                      src={imgSrc(p.primary_image || p.image || p.images?.[0]?.image_url) || 'https://placehold.co/400x200/f1f3f5/999'}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: p.primary_image ? 'contain' : 'cover', padding: p.primary_image ? 8 : 0 }}
                      onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x200/f1f3f5/999'; }}
                    />
                  </div>
                  {/* info */}
                  <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {p.brand_name || p.category_name || ''}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 15 }}>{formatPrice(price)}</span>
                      {p.discount_price && (
                        <s style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatPrice(p.price)}</s>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: p.stock_quantity < 5 ? 'var(--error)' : 'var(--text-muted)' }}>
                      {p.stock_quantity < 1 ? 'Out of stock' : p.stock_quantity < 5 ? `Only ${p.stock_quantity} left` : `In stock`}
                    </div>
                    {/* qty controls or add button */}
                    <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                      {inCart ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button className="btn btn-xs btn-outline" onClick={() => changeQty(p.product_id, -1)}><Minus size={12} /></button>
                          <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{inCart.qty}</span>
                          <button className="btn btn-xs btn-outline" onClick={() => changeQty(p.product_id, 1)}><Plus size={12} /></button>
                          <button className="btn btn-xs btn-danger" style={{ marginLeft: 'auto' }} onClick={() => removeFromCart(p.product_id)}><Trash2 size={12} /></button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link to={`/products/${p.product_id}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                            <Eye size={14} /> View
                          </Link>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, justifyContent: 'center' }}
                            disabled={p.stock_quantity < 1}
                            onClick={() => addToCart(p)}
                          >
                            <ShoppingCart size={14} /> Add to Cart
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════ ORDERS TAB ══════════════ */}
      {tab === 'orders' && (
        <>
          <div className="filter-tabs">
            {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
              <button key={s} className={`filter-tab ${filter === s ? 'active' : ''}`} onClick={() => { setFilter(s); setPage(1); }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="tab-count">{s === 'all' ? orders.length : orders.filter(o => o.status === s).length}</span>
              </button>
            ))}
          </div>

          {ordLoading ? <div className="spinner" /> : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Invoice</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {pagedOrders.length === 0 && <tr><td colSpan={6} className="empty-row">No orders found</td></tr>}
                    {pagedOrders.map(o => (
                      <tr key={o.order_id}>
                        <td><code className="code-sm">{o.invoice_number || o.order_id.slice(0, 8)}</code></td>
                        <td><strong>{formatPrice(o.total_amount)}</strong></td>
                        <td><span className={`badge badge-${statusBadge(o.payment_status)}`}>{o.payment_status}</span></td>
                        <td><span className={`badge badge-${statusBadge(o.status)}`}>{o.status}</span></td>
                        <td style={{ fontSize: 12 }}>{formatDate(o.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {o.status === 'pending' && (
                              <button className="btn btn-xs btn-danger" onClick={() => cancel(o.order_id)}>Cancel</button>
                            )}
                            <button className="btn btn-xs btn-outline" title="Message Vendor"
                              onClick={() => navigate(`/dashboard/messages?to=${o.vendor_user_id || ''}`)}>
                              <MessageSquare size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* ── Pagination ── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {filteredOrders.length === 0
                    ? 'No orders'
                    : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredOrders.length)} of ${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''}`
                  }
                </span>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >← Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        className={`btn btn-sm ${n === page ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setPage(n)}
                      >{n}</button>
                    ))}
                    <button
                      className="btn btn-sm btn-outline"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >Next →</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════ CART DRAWER ══════════════ */}
      {cartOpen && (
        <div className="modal-overlay" onClick={() => setCartOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cart ({cartCount} item{cartCount !== 1 ? 's' : ''})</h3>
              <button className="modal-close" onClick={() => setCartOpen(false)}><X size={18} /></button>
            </div>
            <div style={{ padding: '0 24px 8px' }}>
              {cart.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>Your cart is empty</p>}
              {cart.map(item => (
                <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <img
                    src={imgSrc(item.primary_image || item.image || item.images?.[0]?.image_url) || 'https://placehold.co/50x50/f1f3f5/999'}
                    alt={item.name}
                    style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6, flexShrink: 0, background: '#f8f9fa', border: '1px solid var(--border)' }}
                    onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/50x50/f1f3f5/999'; }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatPrice(parseFloat(item.discount_price || item.price))} each</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-xs btn-outline" onClick={() => changeQty(item.product_id, -1)}><Minus size={11} /></button>
                    <span style={{ fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{item.qty}</span>
                    <button className="btn btn-xs btn-outline" onClick={() => changeQty(item.product_id, 1)}><Plus size={11} /></button>
                    <button className="btn btn-xs btn-danger" onClick={() => removeFromCart(item.product_id)}><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
              {cart.length > 0 && (
                <div style={{ padding: '14px 0 4px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--primary)' }}>{formatPrice(cartTotal(cart))}</span>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px 24px' }}>
              <button className="btn btn-outline" onClick={() => setCartOpen(false)}>Continue Shopping</button>
              <button className="btn btn-primary" disabled={!cart.length} onClick={openCheckout}>
                Checkout →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ CHECKOUT MODAL ══════════════ */}
      {checkoutOpen && (
        <div className="modal-overlay" onClick={() => setCheckoutOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Place Order</h3>
              <button className="modal-close" onClick={() => setCheckoutOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={placeOrder} className="modal-form">

              {/* Order summary */}
              <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                {cart.map(item => (
                  <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                    <span>{item.name} × {item.qty}</span>
                    <span style={{ fontWeight: 600 }}>{formatPrice(itemTotal(item))}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--primary)' }}>{formatPrice(cartTotal(cart))}</span>
                </div>
              </div>

              {/* Delivery address */}
              <div className="form-group">
                <label className="form-label">Delivery Address *</label>
                {addresses.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--error)' }}>
                    No address saved.{' '}
                    <span style={{ textDecoration: 'underline', cursor: 'pointer' }}
                      onClick={() => { setCheckoutOpen(false); navigate('/dashboard/addresses'); }}>
                      Add one in your profile →
                    </span>
                  </p>
                ) : (
                  <select className="form-control" value={addressId} onChange={e => setAddressId(e.target.value)}>
                    {addresses.map(a => (
                      <option key={a.address_id} value={a.address_id}>
                        {a.street}, {a.city}, {a.country}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Payment method */}
              <div className="form-group">
                <label className="form-label">Payment Method *</label>
                <select className="form-control" value={payMethodId} onChange={e => setPayMethodId(e.target.value)}>
                  <option value="">Select payment method</option>
                  {payMethods.map(m => (
                    <option key={m.method_id} value={m.method_id}>{m.method_name}</option>
                  ))}
                </select>
              </div>

              {/* Coupon */}
              <div className="form-group">
                <label className="form-label">Coupon Code (optional)</label>
                <input className="form-control" placeholder="e.g. WELCOME10" value={coupon} onChange={e => setCoupon(e.target.value)} />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setCheckoutOpen(false); setCartOpen(true); }}>
                  ← Back to Cart
                </button>
                <button type="submit" className="btn btn-primary" disabled={placing || !addressId || !payMethodId}>
                  {placing ? 'Placing…' : `Place Order · ${formatPrice(cartTotal(cart))}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default CustomerOrders;
