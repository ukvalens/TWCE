import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, Gift, MessageSquare, Package, RotateCcw, Bell } from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice, formatDate, statusBadge } from '../../../utils/helpers';

const PAGE_SIZE = 8;

const CustomerHome = () => {
  const [orders, setOrders]     = useState([]);
  const [points, setPoints]     = useState(0);
  const [wishlist, setWishlist] = useState([]);
  const [notifs, setNotifs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);

  useEffect(() => {
    Promise.all([
      api.get('/orders/my?limit=200'),
      api.get('/promotions/loyalty'),
      api.get('/cart/wishlist'),
      api.get('/communications/notifications'),
    ]).then(([o, l, w, n]) => {
      setOrders(o.data.data || []);
      setPage(1);
      setPoints(l.data.points || 0);
      setWishlist(w.data || []);
      setNotifs((n.data || []).filter(x => !x.is_read).slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  const cards = [
    { label: 'My Orders',      value: orders.length, icon: <ShoppingBag size={22} />, color: '#e8f4fd', iconColor: '#0077B6', to: '/dashboard/my-orders' },
    { label: 'Loyalty Points', value: points,        icon: <Gift size={22} />,        color: '#fff3e0', iconColor: '#f59e0b', to: '/dashboard/loyalty' },
    { label: 'Wishlist Items', value: wishlist.length,icon: <Heart size={22} />,      color: '#fde8ea', iconColor: '#E63946', to: '/dashboard/wishlist' },
    { label: 'Notifications',  value: notifs.length, icon: <Bell size={22} />,        color: '#f3e8fd', iconColor: '#7c3aed', to: '/dashboard/notifications' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Dashboard</h1>
          <p>Track orders, messages and more</p>
        </div>

      </div>

      {/* Stats */}
      <div className="stats-row">
        {cards.map(c => (
          <Link to={c.to} className="stat-card stat-card-link" key={c.label}>
            <div className="stat-icon" style={{ background: c.color, color: c.iconColor }}>{c.icon}</div>
            <div><div className="stat-value">{c.value}</div><div className="stat-label">{c.label}</div></div>
          </Link>
        ))}
      </div>

      <div className="dash-grid-2" style={{ marginBottom: 24 }}>
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header-row">
            <h3>Recent Orders</h3>
            <Link to="/dashboard/my-orders" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={5} className="empty-row">No orders yet — <Link to="/">start shopping!</Link></td></tr>}
                {orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(o => (
                  <tr key={o.order_id}>
                    <td><code className="code-sm">{o.invoice_number || o.order_id.slice(0, 8)}</code></td>
                    <td><strong>{formatPrice(o.total_amount)}</strong></td>
                    <td><span className={`badge badge-${statusBadge(o.status)}`}>{o.status}</span></td>
                    <td style={{ fontSize: 12 }}>{formatDate(o.created_at)}</td>
                    <td>
                      {o.status === 'pending' && (
                        <button className="btn btn-xs btn-danger" onClick={async () => {
                          await api.put(`/orders/${o.order_id}/cancel`);
                          setOrders(prev => prev.map(x => x.order_id === o.order_id ? { ...x, status: 'cancelled' } : x));
                        }}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {orders.length > PAGE_SIZE && (() => {
            const totalPages = Math.ceil(orders.length / PAGE_SIZE);
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, orders.length)} of {orders.length} orders
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-sm btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button key={n} className={`btn btn-sm ${n === page ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(n)}>{n}</button>
                  ))}
                  <button className="btn btn-sm btn-outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="card-header-row">
            <h3>Notifications</h3>
            <Link to="/dashboard/notifications" className="btn btn-outline btn-sm">All</Link>
          </div>
          {notifs.length === 0 ? (
            <p className="empty-state">You're all caught up!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifs.map(n => (
                <div key={n.notification_id} className="notif-item">
                  <div className="notif-dot" />
                  <div>
                    <strong style={{ fontSize: 13 }}>{n.title}</strong>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Quick Actions</h3>
        <div className="quick-actions">
          <Link to="/dashboard/my-orders"    className="quick-action-btn"><ShoppingBag size={20}/><span>My Orders</span></Link>
          <Link to="/dashboard/messages"     className="quick-action-btn"><MessageSquare size={20}/><span>Message Vendor</span></Link>
          <Link to="/dashboard/wishlist"     className="quick-action-btn"><Heart size={20}/><span>Wishlist</span></Link>
          <Link to="/dashboard/returns"      className="quick-action-btn"><RotateCcw size={20}/><span>Returns</span></Link>
          <Link to="/dashboard/tickets"      className="quick-action-btn"><Package size={20}/><span>Support</span></Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;
