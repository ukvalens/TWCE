import { useEffect, useState, useCallback } from 'react';
import { Eye, X, MapPin } from 'lucide-react';
import api from '../../../utils/api';
import { formatDate, statusBadge } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';
import { Pagination } from './AdminUsers';
import toast from 'react-hot-toast';

const DELIVERY_STATUSES = ['pending','assigned','in_transit','delivered','failed'];

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
        <strong style={{ fontSize: 16 }}>{title}</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
      </div>
      <div style={{ padding: 22 }}>{children}</div>
    </div>
  </div>
);

const TrackingTimeline = ({ deliveryId }) => {
  const [tracking, setTracking] = useState([]);
  useEffect(() => {
    api.get(`/deliveries/${deliveryId}/tracking`).then(r => setTracking(r.data || [])).catch(() => {});
  }, [deliveryId]);

  if (!tracking.length) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No tracking events yet.</p>;

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: '#e0e0e0' }} />
      {tracking.map((t, i) => (
        <div key={i} style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{ position: 'absolute', left: -20, width: 14, height: 14, borderRadius: '50%', background: i === 0 ? 'var(--primary)' : '#d0d0d0', border: '2px solid #fff', top: 3 }} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>{t.status?.replace('_', ' ').toUpperCase()}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <MapPin size={11} /> {t.location || '—'} · {formatDate(t.updated_at)}
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminDeliveries = () => {
  const { user }            = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [status, setStatus]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Vendors use /orders to find their deliveries; admins use /deliveries directly
      if (user?.role_id === 2) {
        const { data } = await api.get('/orders?limit=50');
        const orders = data.data || [];
        // Map orders to delivery-like shape for display
        const mapped = orders.map(o => ({
          delivery_id: o.order_id,
          customer_name: o.full_name || '—',
          delivery_person: '—',
          estimated_time: null,
          delivered_at: null,
          status: o.status,
        }));
        setDeliveries(status ? mapped.filter(d => d.status === status) : mapped);
        setTotal(mapped.length);
      } else {
        const params = new URLSearchParams({ page, limit: 15 });
        if (status) params.append('status', status);
        const { data } = await api.get(`/deliveries?${params}`);
        setDeliveries(data.data || []);
        setTotal(data.total || 0);
      }
    } catch { toast.error('Failed to load deliveries'); }
    finally { setLoading(false); }
  }, [page, status, user]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, newStatus) => {
    try { await api.put(`/deliveries/${id}/status`, { status: newStatus, location: 'Updated by admin' }); toast.success('Delivery updated'); load(); }
    catch { toast.error('Update failed'); }
  };

  const counts = DELIVERY_STATUSES.reduce((acc, s) => ({ ...acc, [s]: deliveries.filter(d => d.status === s).length }), {});

  return (
    <div>
      <div className="page-header"><h1>Delivery Monitoring</h1><p>Track and manage all deliveries</p></div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'In Transit', count: counts.in_transit, color: '#fff3e0', tc: '#f59e0b' },
          { label: 'Delivered',  count: counts.delivered,  color: '#e8fdf6', tc: '#2A9D8F' },
          { label: 'Pending',    count: counts.pending,    color: '#e8f4fd', tc: '#0077B6' },
          { label: 'Failed',     count: counts.failed,     color: '#fde8ea', tc: '#E63946' },
        ].map(c => (
          <div key={c.label} style={{ background: c.color, borderRadius: 10, padding: '12px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 110 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: c.tc }}>{c.count || 0}</span>
            <span style={{ fontSize: 12, color: c.tc, fontWeight: 600 }}>{c.label}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <select className="form-control" style={{ width: 200 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="card">
        <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>{total} deliveries</div>
        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Customer</th><th>Delivery Person</th><th>Est. Time</th><th>Delivered At</th><th>Status</th><th>Update</th><th></th></tr></thead>
              <tbody>
                {deliveries.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>No deliveries found</td></tr>}
                {deliveries.map(d => (
                  <tr key={d.delivery_id}>
                    <td><code style={{ fontSize: 11, background: '#f0f4f8', padding: '2px 7px', borderRadius: 4 }}>{d.delivery_id.slice(0,8)}…</code></td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{d.customer_name}</td>
                    <td>{d.delivery_person || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.estimated_time ? formatDate(d.estimated_time) : '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.delivered_at ? formatDate(d.delivered_at) : '—'}</td>
                    <td><span className={`badge badge-${statusBadge(d.status)}`}>{d.status}</span></td>
                    <td>
                      <select className="form-control" style={{ fontSize: 12, padding: '4px 8px', width: 130 }}
                        value={d.status} onChange={e => updateStatus(d.delivery_id, e.target.value)}>
                        {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="btn btn-sm" style={{ background: '#e8f4fd', color: '#0077B6', border: 'none', padding: '6px 10px' }}
                        onClick={() => setSelected(d)} title="Track"><Eye size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} limit={15} onPage={setPage} />
      </div>

      {selected && (
        <Modal title={`Tracking — ${selected.delivery_id.slice(0,8)}…`} onClose={() => setSelected(null)}>
          <div style={{ marginBottom: 16, padding: 14, background: '#f8f9fa', borderRadius: 10, fontSize: 14 }}>
            <div><strong>{selected.customer_name}</strong></div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Delivery by: {selected.delivery_person || 'Unassigned'}</div>
            <span className={`badge badge-${statusBadge(selected.status)}`} style={{ marginTop: 6 }}>{selected.status}</span>
          </div>
          <TrackingTimeline deliveryId={selected.delivery_id} />
        </Modal>
      )}
    </div>
  );
};

export default AdminDeliveries;
