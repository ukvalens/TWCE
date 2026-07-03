import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Store, Package, ShoppingBag, DollarSign, Star,
  Ticket, TrendingUp, Clock, CheckCircle, AlertCircle, ArrowRight
} from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice, formatDate, imgSrc, statusBadge } from '../../../utils/helpers';

const StatCard = ({ label, value, icon, color, iconColor, sub }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: color, color: iconColor }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div className="stat-value">{value ?? <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>—</span>}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: 11, marginTop: 3, color: iconColor, fontWeight: 600 }}>{sub}</div>}
    </div>
  </div>
);

const QuickAction = ({ to, icon, label, color }) => (
  <Link to={to} style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 12px',
    background: color, borderRadius: 12, textDecoration: 'none', transition: 'transform .15s, box-shadow .15s',
    flex: 1, minWidth: 90
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,.12)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
    {icon}
    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'center' }}>{label}</span>
  </Link>
);

const AdminHome = () => {
  const [stats, setStats]     = useState(null);
  const [orders, setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/orders?limit=6'),
      api.get('/products?status=pending&limit=5'),
    ]).then(([s, o, p]) => {
      setStats(s.data);
      setOrders(o.data.data || []);
      setProducts(p.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  const cards = [
    { label: 'Total Users',       value: stats?.total_users,                       icon: <Users size={22} />,       color: '#e8f4fd', iconColor: '#0077B6', sub: 'registered accounts' },
    { label: 'Verified Vendors',  value: stats?.verified_vendors,                  icon: <Store size={22} />,       color: '#e8fdf6', iconColor: '#2A9D8F', sub: 'active sellers' },
    { label: 'Total Orders',      value: stats?.total_orders,                      icon: <ShoppingBag size={22} />, color: '#fff3e0', iconColor: '#f59e0b', sub: `${stats?.pending_orders} pending` },
    { label: 'Total Revenue',     value: formatPrice(stats?.total_revenue || 0),   icon: <DollarSign size={22} />,  color: '#e8fdf6', iconColor: '#2A9D8F', sub: 'from paid orders' },
    { label: 'Pending Products',  value: stats?.pending_products,                  icon: <Package size={22} />,     color: '#fde8ea', iconColor: '#E63946', sub: 'awaiting approval' },
    { label: 'Open Tickets',      value: stats?.open_tickets,                      icon: <Ticket size={22} />,      color: '#e8f4fd', iconColor: '#0077B6', sub: 'need attention' },
    { label: 'Total Products',    value: stats?.total_products,                    icon: <Star size={22} />,        color: '#f3e8fd', iconColor: '#7c3aed', sub: 'in catalogue' },
    { label: 'Pending Orders',    value: stats?.pending_orders,                    icon: <Clock size={22} />,       color: '#fff3e0', iconColor: '#f59e0b', sub: 'not yet confirmed' },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Admin Dashboard</h1>
          <p>System overview and key metrics</p>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', background: '#f0f4f8', padding: '6px 14px', borderRadius: 20 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 24 }}>
        {cards.slice(0, 4).map(c => <StatCard key={c.label} {...c} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 28 }}>
        {cards.slice(4).map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <QuickAction to="/dashboard/users"     icon={<Users size={22} color="#0077B6" />}     label="Manage Users"     color="#e8f4fd" />
          <QuickAction to="/dashboard/vendors"   icon={<Store size={22} color="#2A9D8F" />}     label="Vendors"          color="#e8fdf6" />
          <QuickAction to="/dashboard/products"  icon={<Package size={22} color="#7c3aed" />}   label="Products"         color="#f3e8fd" />
          <QuickAction to="/dashboard/orders"    icon={<ShoppingBag size={22} color="#f59e0b" />} label="Orders"         color="#fff3e0" />
          <QuickAction to="/dashboard/payments"  icon={<DollarSign size={22} color="#2A9D8F" />} label="Payments"        color="#e8fdf6" />
          <QuickAction to="/dashboard/tickets"   icon={<Ticket size={22} color="#0077B6" />}    label="Tickets"          color="#e8f4fd" />
          <QuickAction to="/dashboard/coupons"   icon={<TrendingUp size={22} color="#E63946" />} label="Coupons"         color="#fde8ea" />
          <QuickAction to="/dashboard/analytics" icon={<TrendingUp size={22} color="#7c3aed" />} label="Analytics"       color="#f3e8fd" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Recent Orders */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Recent Orders</h3>
            <Link to="/dashboard/orders" style={{ fontSize: 12, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              View All <ArrowRight size={13} />
            </Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>No orders yet</td></tr>}
                {orders.map(o => (
                  <tr key={o.order_id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{o.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(o.created_at)}</div>
                    </td>
                    <td><strong>{formatPrice(o.total_amount)}</strong></td>
                    <td><span className={`badge badge-${statusBadge(o.status)}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Products */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Pending Approvals</h3>
            <Link to="/dashboard/products" style={{ fontSize: 12, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              View All <ArrowRight size={13} />
            </Link>
          </div>
          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <CheckCircle size={36} style={{ opacity: .3, marginBottom: 10 }} />
              <p style={{ fontSize: 13 }}>All products reviewed!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {products.map(p => (
                <div key={p.product_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <img src={imgSrc(p.primary_image) || 'https://placehold.co/40x40?text=P'} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.vendor_name} · {formatPrice(p.price)}</div>
                  </div>
                  <span className="badge badge-warning">pending</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Revenue bar indicator */}
      {stats?.total_revenue > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Revenue Progress</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Target: {formatPrice(10000)}</span>
          </div>
          <div style={{ background: '#f0f4f8', borderRadius: 8, height: 12, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 8,
              background: 'linear-gradient(90deg, var(--primary), var(--accent))',
              width: `${Math.min((stats.total_revenue / 10000) * 100, 100).toFixed(1)}%`,
              transition: 'width 1s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>{formatPrice(stats.total_revenue)} earned</span>
            <span>{Math.min((stats.total_revenue / 10000) * 100, 100).toFixed(1)}% of goal</span>
          </div>
        </div>
      )}

      {stats?.pending_products > 0 && (
        <div style={{ marginTop: 20, padding: '14px 18px', background: '#fff3cd', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertCircle size={18} color="#856404" />
          <span style={{ fontSize: 13, color: '#856404', fontWeight: 500 }}>
            {stats.pending_products} product{stats.pending_products > 1 ? 's' : ''} waiting for approval.{' '}
            <Link to="/dashboard/products" style={{ color: '#856404', fontWeight: 700, textDecoration: 'underline' }}>Review now</Link>
          </span>
        </div>
      )}
    </div>
  );
};

export default AdminHome;
