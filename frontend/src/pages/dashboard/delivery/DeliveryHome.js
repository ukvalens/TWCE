import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, CheckCircle, Clock } from 'lucide-react';
import api from '../../../utils/api';
import { formatDate, statusBadge } from '../../../utils/helpers';

const DeliveryHome = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/deliveries/my').then((r) => setDeliveries(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  const pending   = deliveries.filter(d => d.status !== 'delivered').length;
  const completed = deliveries.filter(d => d.status === 'delivered').length;

  return (
    <div>
      <div className="page-header"><h1>Delivery Dashboard</h1><p>Manage your assigned deliveries</p></div>

      <div className="stats-row">
        {[
          { label: 'Total Assigned', value: deliveries.length, icon: <Truck size={22} />,        color: '#e8f4fd', iconColor: '#0077B6' },
          { label: 'Pending',        value: pending,           icon: <Clock size={22} />,        color: '#fff3e0', iconColor: '#f59e0b' },
          { label: 'Completed',      value: completed,         icon: <CheckCircle size={22} />,  color: '#e8fdf6', iconColor: '#2A9D8F' },
        ].map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="stat-icon" style={{ background: c.color, color: c.iconColor }}>{c.icon}</div>
            <div><div className="stat-value">{c.value}</div><div className="stat-label">{c.label}</div></div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>My Deliveries</h3>
          <Link to="/dashboard/deliveries" className="btn btn-outline btn-sm">View All</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Address</th><th>Est. Time</th><th>Status</th></tr></thead>
            <tbody>
              {deliveries.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No deliveries assigned</td></tr>}
              {deliveries.slice(0, 8).map((d) => (
                <tr key={d.delivery_id}>
                  <td><code style={{ fontSize: 12 }}>{d.order_id?.slice(0, 8)}…</code></td>
                  <td>{d.customer_name}</td>
                  <td>{d.street}, {d.city}</td>
                  <td>{d.estimated_time ? formatDate(d.estimated_time) : '—'}</td>
                  <td><span className={`badge badge-${statusBadge(d.status)}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeliveryHome;
