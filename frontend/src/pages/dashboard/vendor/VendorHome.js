import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, DollarSign, TrendingUp, MessageSquare, Eye, CheckCircle, FileText } from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice, statusBadge } from '../../../utils/helpers';

const VendorHome = () => {
  const [stats, setStats]     = useState(null);
  const [orders, setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/vendors/dashboard'),
      api.get('/orders?limit=6'),
      api.get('/products?limit=5'),
    ]).then(([s, o, p]) => {
      setStats(s.data);
      setOrders(o.data.data || []);
      setProducts(p.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateOrderStatus = async (orderId, status) => {
    await api.put(`/orders/${orderId}/status`, { status });
    setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status } : o));
  };

  if (loading) return <div className="spinner" />;

  const cards = [
    { label: 'Total Products', value: stats?.total_products ?? '—', icon: <Package size={22} />, color: '#e8f4fd', iconColor: '#0077B6' },
    { label: 'Total Orders',   value: stats?.total_orders ?? '—',   icon: <ShoppingBag size={22} />, color: '#fff3e0', iconColor: '#f59e0b' },
    { label: 'Revenue',        value: formatPrice(stats?.total_revenue || 0), icon: <DollarSign size={22} />, color: '#e8fdf6', iconColor: '#2A9D8F' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vendor Dashboard</h1>
          <p>Manage your store, products, orders and customer interactions</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/dashboard/vendor/products/new" className="btn btn-primary">+ Add Product</Link>
          <Link to="/dashboard/messages" className="btn btn-outline"><MessageSquare size={16} /> Messages</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        {cards.map(c => (
          <div className="stat-card" key={c.label}>
            <div className="stat-icon" style={{ background: c.color, color: c.iconColor }}>{c.icon}</div>
            <div><div className="stat-value">{c.value}</div><div className="stat-label">{c.label}</div></div>
          </div>
        ))}
      </div>

      <div className="dash-grid-2" style={{ marginBottom: 24 }}>
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header-row">
            <h3>Recent Orders</h3>
            <Link to="/dashboard/vendor/orders" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={5} className="empty-row">No orders yet</td></tr>}
                {orders.map(o => (
                  <tr key={o.order_id}>
                    <td><code className="code-sm">{o.order_id.slice(0, 8)}…</code></td>
                    <td>{o.full_name || '—'}</td>
                    <td><strong>{formatPrice(o.total_amount)}</strong></td>
                    <td><span className={`badge badge-${statusBadge(o.status)}`}>{o.status}</span></td>
                    <td>
                      {o.status === 'pending' && (
                        <button className="btn btn-xs btn-success" onClick={() => updateOrderStatus(o.order_id, 'confirmed')}>
                          <CheckCircle size={12} /> Confirm
                        </button>
                      )}
                      {o.status === 'confirmed' && (
                        <button className="btn btn-xs btn-primary" onClick={() => updateOrderStatus(o.order_id, 'shipped')}>
                          <TrendingUp size={12} /> Ship
                        </button>
                      )}
                      {!['pending','confirmed'].includes(o.status) && (
                        <span className="text-muted" style={{ fontSize: 12 }}>{o.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* My Products */}
        <div className="card">
          <div className="card-header-row">
            <h3>My Products</h3>
            <Link to="/dashboard/products" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
              <tbody>
                {products.length === 0 && <tr><td colSpan={4} className="empty-row">No products yet</td></tr>}
                {products.map(p => (
                  <tr key={p.product_id}>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                    <td>{formatPrice(p.discount_price || p.price)}</td>
                    <td>
                      <span style={{ color: p.stock_quantity < 5 ? '#e63946' : 'inherit' }}>
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td><span className={`badge badge-${statusBadge(p.status)}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Quick Actions</h3>
        <div className="quick-actions">
          <Link to="/dashboard/vendor/warranties" className="quick-action-btn">
            <FileText size={20} /><span>Manage Warranties</span>
          </Link>
          <Link to="/dashboard/vendor/products/new" className="quick-action-btn">
            <Package size={20} /><span>Add New Product</span>
          </Link>
          <Link to="/dashboard/vendor/orders" className="quick-action-btn">
            <ShoppingBag size={20} /><span>Manage Orders</span>
          </Link>
          <Link to="/dashboard/messages" className="quick-action-btn">
            <MessageSquare size={20} /><span>Customer Messages</span>
          </Link>
          <Link to="/dashboard/analytics" className="quick-action-btn">
            <TrendingUp size={20} /><span>View Analytics</span>
          </Link>
          <Link to="/dashboard/profile" className="quick-action-btn">
            <Eye size={20} /><span>Store Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VendorHome;
