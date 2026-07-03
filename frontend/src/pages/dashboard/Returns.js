import { useEffect, useState, useCallback } from 'react';
import { RotateCcw, Plus, X } from 'lucide-react';
import api from '../../utils/api';
import { formatPrice, formatDate, statusBadge } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ReturnModal = ({ onClose, onSaved }) => {
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ order_id: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get('/orders/my?limit=100').then(r => {
      const deliveredOrders = (r.data.data || []).filter(o => o.status === 'delivered');
      setOrders(deliveredOrders);
    }).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!form.order_id) return toast.error('Please select an order');
    if (!form.reason.trim()) return toast.error('Please provide a reason');
    setSaving(true);
    try {
      await api.post('/warranty/returns', form);
      toast.success('Return request submitted!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit return request');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Submit Return Request</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={save} className="modal-form">
          <div className="form-group">
            <label className="form-label">Order *</label>
            {orders.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                No delivered orders found. Only delivered orders can be returned.
              </p>
            ) : (
              <select className="form-control" value={form.order_id} onChange={e => set('order_id', e.target.value)} required>
                <option value="">— Select a delivered order —</option>
                {orders.map(o => (
                  <option key={o.order_id} value={o.order_id}>
                    {o.invoice_number || o.order_id.slice(0, 8)} — {formatPrice(o.total_amount)} — {formatDate(o.created_at)}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Reason for Return *</label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Describe why you want to return this order (e.g. damaged item, wrong product received, defective…)"
              value={form.reason}
              onChange={e => set('reason', e.target.value)}
              required
            />
          </div>
          <div style={{ background: '#fff8e1', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 4 }}>
            ⚠️ Returns are subject to review. Our team will contact you within 2–3 business days.
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || orders.length === 0}>
              {saving ? 'Submitting…' : 'Submit Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/warranty/returns/my');
      setReturns(data || []);
    } catch { toast.error('Failed to load return requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusColor = {
    pending: { bg: '#fff3e0', color: '#f59e0b' },
    approved: { bg: '#e8fdf6', color: '#2A9D8F' },
    rejected: { bg: '#fde8ea', color: '#e63946' },
    processing: { bg: '#e8f4fd', color: '#0077B6' },
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Return Requests</h1>
          <p>Submit and track your order return requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Return
        </button>
      </div>

      {loading ? <div className="spinner" /> : (
        returns.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <RotateCcw size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 16 }}>No return requests yet</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Request a Return</button>
          </div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Order</th><th>Reason / Items</th><th>Status</th><th>Submitted</th></tr>
                </thead>
                <tbody>
                  {returns.map(r => {
                    const sc = statusColor[r.status] || { bg: '#f0f0f0', color: '#6b7280' };
                    const items = Array.isArray(r.items) ? r.items.filter(i => i.name) : [];
                    return (
                      <tr key={r.return_id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.invoice_number || `#${r.order_id?.slice(0,8).toUpperCase()}`}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatPrice(r.total_amount)}</div>
                        </td>
                        <td style={{ maxWidth: 280, fontSize: 13 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason}>
                            {r.reason}
                          </div>
                          {items.length > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                              {items.map(i => i.name).join(', ')}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{
                            fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                            background: sc.bg, color: sc.color,
                          }}>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(r.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {showModal && <ReturnModal onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  );
};

export default Returns;
