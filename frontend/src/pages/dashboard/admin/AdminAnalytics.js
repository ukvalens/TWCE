import { useEffect, useState } from 'react';
import { TrendingUp, Users, ShoppingBag, DollarSign, Package, Star } from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

const BarChart = ({ data, valueKey, labelKey, color = 'var(--primary)', formatValue = v => v }) => {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 110, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d[labelKey]}
          </div>
          <div style={{ flex: 1, background: '#f0f4f8', borderRadius: 6, height: 22, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%', borderRadius: 6, background: color,
              width: `${(d[valueKey] / max) * 100}%`,
              transition: 'width .6s ease', minWidth: d[valueKey] > 0 ? 4 : 0
            }} />
          </div>
          <div style={{ width: 80, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{formatValue(d[valueKey])}</div>
        </div>
      ))}
    </div>
  );
};

const DonutSegment = ({ pct, color, offset }) => {
  const r = 40, circ = 2 * Math.PI * r;
  return (
    <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="18"
      strokeDasharray={`${pct * circ} ${circ}`}
      strokeDashoffset={-offset * circ}
      style={{ transition: 'stroke-dasharray .6s ease' }} />
  );
};

const AdminAnalytics = () => {
  const { user }      = useAuth();
  const [data, setData]       = useState(null);
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const analyticsEndpoint = user?.role_id === 2 ? '/ai/vendor-analytics' : '/ai/analytics';
    Promise.all([
      api.get(analyticsEndpoint),
      user?.role_id !== 2 ? api.get('/orders?limit=100') : api.get('/orders?limit=100'),
    ]).then(([a, o]) => {
      setData(a.data);
      setOrders(o.data.data || []);
    }).catch(() => toast.error('Failed to load analytics')).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="spinner" />;

  const orderStatuses = ['pending','confirmed','processing','shipped','delivered','cancelled'];
  const statusCounts  = orderStatuses.map(s => ({ status: s, count: orders.filter(o => o.status === s).length }));
  const totalOrders   = orders.length || 1;
  const statusColors  = { pending:'#f59e0b', confirmed:'#0077B6', processing:'#7c3aed', shipped:'#00BFA6', delivered:'#2A9D8F', cancelled:'#E63946' };

  let offset = 0;
  const segments = statusCounts.filter(s => s.count > 0).map(s => {
    const pct = s.count / totalOrders;
    const seg = { ...s, pct, offset, color: statusColors[s.status] };
    offset += pct;
    return seg;
  });

  return (
    <div>
      <div className="page-header"><h1>Analytics</h1><p>Sales performance and platform insights</p></div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 28 }}>
        {[
          { label: 'Total Users',    value: data?.total_users,                     icon: <Users size={20} />,       color: '#e8f4fd', ic: '#0077B6' },
          { label: 'Total Orders',   value: data?.total_orders,                    icon: <ShoppingBag size={20} />, color: '#fff3e0', ic: '#f59e0b' },
          { label: 'Total Revenue',  value: formatPrice(data?.total_revenue || 0), icon: <DollarSign size={20} />,  color: '#e8fdf6', ic: '#2A9D8F' },
          { label: 'Total Products', value: data?.total_products,                  icon: <Package size={20} />,     color: '#f3e8fd', ic: '#7c3aed' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div style={{ width: 46, height: 46, borderRadius: 10, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.ic, flexShrink: 0 }}>{c.icon}</div>
            <div><div className="stat-value" style={{ fontSize: 22 }}>{c.value ?? '—'}</div><div className="stat-label">{c.label}</div></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Monthly Revenue */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <TrendingUp size={18} color="var(--primary)" />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Monthly Revenue</h3>
          </div>
          {(data?.monthly_revenue || []).length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No revenue data yet</p>
            : <BarChart
                data={[...(data.monthly_revenue || [])].reverse()}
                labelKey="month"
                valueKey="revenue"
                color="var(--primary)"
                formatValue={v => formatPrice(v)}
              />
          }
        </div>

        {/* Top Products */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Star size={18} color="#f59e0b" />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Top Selling Products</h3>
          </div>
          {(data?.top_products || []).length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No sales data yet</p>
            : <BarChart
                data={data.top_products}
                labelKey="name"
                valueKey="total_sold"
                color="var(--accent)"
                formatValue={v => `${v} sold`}
              />
          }
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Order Status Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Order Status Breakdown</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <svg viewBox="0 0 100 100" style={{ width: 120, height: 120, transform: 'rotate(-90deg)', flexShrink: 0 }}>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f0f0f0" strokeWidth="18" />
              {segments.map((s, i) => <DonutSegment key={i} pct={s.pct} color={s.color} offset={s.offset} />)}
            </svg>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {statusCounts.map(s => (
                <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColors[s.status], flexShrink: 0 }} />
                  <span style={{ flex: 1, textTransform: 'capitalize' }}>{s.status}</span>
                  <strong>{s.count}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({((s.count / totalOrders) * 100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue by product table */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Product Revenue</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
              <tbody>
                {(data?.top_products || []).length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data</td></tr>
                )}
                {(data?.top_products || []).map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 13 }}>{p.name}</td>
                    <td><strong>{p.total_sold}</strong></td>
                    <td style={{ color: '#2A9D8F', fontWeight: 700 }}>{formatPrice(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
