import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Tag } from 'lucide-react';
import api from '../../../utils/api';
import { formatDate } from '../../../utils/helpers';
import toast from 'react-hot-toast';

const EMPTY = { code: '', discount_type: 'percentage', value: '', min_order_amount: 0, max_uses: '', expiry_date: '' };

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
        <strong style={{ fontSize: 16 }}>{title}</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
      </div>
      <div style={{ padding: 22 }}>{children}</div>
    </div>
  </div>
);

const CouponForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.value) return toast.error('Code and value are required');
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Coupon Code *</label>
          <input className="form-control" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="e.g. SAVE20" />
        </div>
        <div className="form-group">
          <label className="form-label">Discount Type</label>
          <select className="form-control" value={form.discount_type} onChange={e => set('discount_type', e.target.value)}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed ($)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Value *</label>
          <input className="form-control" type="number" min="0" value={form.value} onChange={e => set('value', e.target.value)} placeholder={form.discount_type === 'percentage' ? '10' : '5.00'} />
        </div>
        <div className="form-group">
          <label className="form-label">Min Order Amount ($)</label>
          <input className="form-control" type="number" min="0" value={form.min_order_amount} onChange={e => set('min_order_amount', e.target.value)} placeholder="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Max Uses</label>
          <input className="form-control" type="number" min="0" value={form.max_uses} onChange={e => set('max_uses', e.target.value)} placeholder="Unlimited" />
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Expiry Date</label>
          <input className="form-control" type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Coupon'}</button>
      </div>
    </form>
  );
};

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | { mode, data }

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/promotions/coupons'); setCoupons(data || []); }
    catch { toast.error('Failed to load coupons'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (form) => {
    if (modal.mode === 'edit') await api.put(`/promotions/coupons/${modal.data.coupon_id}`, form);
    else await api.post('/promotions/coupons', form);
    toast.success(modal.mode === 'edit' ? 'Coupon updated' : 'Coupon created');
    load();
  };

  const toggle = async (id, is_active) => {
    try { await api.put(`/promotions/coupons/${id}`, { is_active: !is_active }); load(); }
    catch { toast.error('Failed'); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    try { await api.delete(`/promotions/coupons/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const isExpired = (date) => date && new Date(date) < new Date();

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>Coupon Management</h1><p>Create and manage discount coupons</p></div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: 'create', data: { ...EMPTY } })}>
          <Plus size={15} /> New Coupon
        </button>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total',   value: coupons.length,                              color: '#e8f4fd' },
          { label: 'Active',  value: coupons.filter(c => c.is_active).length,     color: '#e8fdf6' },
          { label: 'Expired', value: coupons.filter(c => isExpired(c.expiry_date)).length, color: '#fde8ea' },
        ].map(c => (
          <div key={c.label} style={{ background: c.color, borderRadius: 10, padding: '12px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{c.value}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>Type / Value</th><th>Min Order</th><th>Usage</th><th>Expiry</th><th>Active</th><th>Actions</th></tr></thead>
              <tbody>
                {coupons.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>No coupons yet</td></tr>}
                {coupons.map(c => {
                  const usagePct = c.max_uses ? Math.min((c.used_count / c.max_uses) * 100, 100) : 0;
                  return (
                    <tr key={c.coupon_id} style={{ opacity: isExpired(c.expiry_date) ? .55 : 1 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Tag size={14} color="var(--primary)" />
                          <code style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 14 }}>{c.code}</code>
                        </div>
                        {isExpired(c.expiry_date) && <span style={{ fontSize: 10, color: '#E63946', fontWeight: 600 }}>EXPIRED</span>}
                      </td>
                      <td>
                        <span className="badge badge-info">{c.discount_type}</span>
                        <strong style={{ marginLeft: 8 }}>{c.discount_type === 'percentage' ? `${c.value}%` : `$${c.value}`}</strong>
                      </td>
                      <td>${c.min_order_amount}</td>
                      <td>
                        <div style={{ fontSize: 12, marginBottom: 4 }}>{c.used_count} / {c.max_uses || '∞'}</div>
                        {c.max_uses > 0 && (
                          <div style={{ background: '#f0f0f0', borderRadius: 4, height: 5, width: 80 }}>
                            <div style={{ height: '100%', borderRadius: 4, background: usagePct > 80 ? '#E63946' : 'var(--primary)', width: `${usagePct}%` }} />
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.expiry_date ? formatDate(c.expiry_date) : 'No expiry'}</td>
                      <td>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.is_active ? 'var(--success)' : 'var(--text-muted)' }}
                          onClick={() => toggle(c.coupon_id, c.is_active)}>
                          {c.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm" style={{ background: '#e8f0fe', color: '#3b6fd4', border: 'none' }}
                            onClick={() => setModal({ mode: 'edit', data: { ...c, expiry_date: c.expiry_date ? c.expiry_date.slice(0,10) : '' } })}>
                            <Pencil size={13} />
                          </button>
                          <button className="btn btn-sm" style={{ background: '#fde8ea', color: '#E63946', border: 'none' }}
                            onClick={() => remove(c.coupon_id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit Coupon' : 'New Coupon'} onClose={() => setModal(null)}>
          <CouponForm initial={modal.data} onSave={save} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
};

export default AdminCoupons;
