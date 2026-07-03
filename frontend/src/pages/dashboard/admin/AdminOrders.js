import { useEffect, useState, useCallback } from 'react';
import { Search, Eye, X } from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice, formatDate, statusBadge } from '../../../utils/helpers';
import { Pagination } from './AdminUsers';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['pending','confirmed','processing','shipped','delivered','cancelled','returned'];

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
        <strong style={{ fontSize: 16 }}>{title}</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
      </div>
      <div style={{ padding: 22 }}>{children}</div>
    </div>
  </div>
);

const OrderDetail = ({ order }) => {
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    api.get(`/orders/${order.order_id}`).then(r => setDetail(r.data)).catch(() => {});
  }, [order.order_id]);

  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );

  if (!detail) return <div className="spinner" />;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Customer</div>
          <div style={{ fontWeight: 700 }}>{detail.full_name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{detail.email}</div>
        </div>
        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Order Info</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {detail.order_id?.slice(0,16)}…</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(detail.created_at)}</div>
        </div>
      </div>

      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Items</h4>
      <div style={{ marginBottom: 16 }}>
        {(detail.items || []).map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{item.product_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qty: {item.quantity}</div>
            </div>
            <strong>{formatPrice(item.price * item.quantity)}</strong>
          </div>
        ))}
      </div>

      <Row label="Subtotal"         value={formatPrice(detail.total_amount)} />
      <Row label="Discount"         value={`- ${formatPrice(detail.discount_amount || 0)}`} />
      <Row label="Total"            value={formatPrice(detail.total_amount)} />
      <Row label="Payment Status"   value={<span className={`badge badge-${statusBadge(detail.payment_status)}`}>{detail.payment_status}</span>} />
      <Row label="Order Status"     value={<span className={`badge badge-${statusBadge(detail.status)}`}>{detail.status}</span>} />

      {detail.history?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status History</h4>
          {detail.history.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, padding: '6px 0', color: 'var(--text-muted)' }}>
              <span className={`badge badge-${statusBadge(h.status)}`} style={{ flexShrink: 0 }}>{h.status}</span>
              <span>{h.note}</span>
              <span style={{ marginLeft: 'auto' }}>{formatDate(h.changed_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminOrders = () => {
  const [orders, setOrders]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [status, setStatus]   = useState('');
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      const { data } = await api.get(`/orders?${params}`);
      setOrders(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, newStatus) => {
    try { await api.put(`/orders/${id}/status`, { status: newStatus }); toast.success('Order updated'); load(); }
    catch { toast.error('Update failed'); }
  };

  const statusColor = { pending: '#fff3e0', confirmed: '#e8f4fd', processing: '#f3e8fd', shipped: '#e8fdf6', delivered: '#d4f4f0', cancelled: '#fde8ea', returned: '#f0f0f0' };

  return (
    <div>
      <div className="page-header"><h1>Order Management</h1><p>View and manage all customer orders</p></div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: 34 }} placeholder="Search by customer name or email…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" style={{ width: 180 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Orders</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ background: statusColor[s] }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>{total} orders found</div>
        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th><th>Update Status</th><th></th></tr>
              </thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>No orders found</td></tr>}
                {orders.map(o => (
                  <tr key={o.order_id}>
                    <td><code style={{ fontSize: 11, background: '#f0f4f8', padding: '2px 7px', borderRadius: 4 }}>{o.order_id.slice(0,8)}…</code></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{o.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.email}</div>
                    </td>
                    <td><strong>{formatPrice(o.total_amount)}</strong></td>
                    <td><span className={`badge badge-${statusBadge(o.payment_status)}`}>{o.payment_status}</span></td>
                    <td><span className={`badge badge-${statusBadge(o.status)}`}>{o.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(o.created_at)}</td>
                    <td>
                      <select className="form-control" style={{ fontSize: 12, padding: '4px 8px', width: 140 }}
                        value={o.status} onChange={e => updateStatus(o.order_id, e.target.value)}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="btn btn-sm" style={{ background: '#e8f4fd', color: '#0077B6', border: 'none', padding: '6px 10px' }}
                        onClick={() => setSelected(o)} title="View Details"><Eye size={13} /></button>
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
        <Modal title={`Order Details — ${selected.order_id.slice(0,8)}…`} onClose={() => setSelected(null)}>
          <OrderDetail order={selected} />
        </Modal>
      )}
    </div>
  );
};

export default AdminOrders;
