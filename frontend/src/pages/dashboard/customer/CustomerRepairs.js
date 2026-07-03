import { useEffect, useState, useCallback } from 'react';
import {
  Wrench, Plus, X, Clock, CheckCircle, XCircle, Search,
  AlertCircle, Hammer, ChevronRight, Trash2, Package
} from 'lucide-react';
import api from '../../../utils/api';
import { formatDate } from '../../../utils/helpers';
import toast from 'react-hot-toast';

/* ── status config ─────────────────────────────────────────── */
const STATUS_META = {
  pending:   { label: 'Pending Review',  color: '#f59e0b', bg: '#fff8e1', icon: <Clock size={14} /> },
  in_review: { label: 'Under Review',    color: '#0077B6', bg: '#e8f4fd', icon: <Search size={14} /> },
  in_repair: { label: 'In Repair',       color: '#7c3aed', bg: '#f3e8fd', icon: <Hammer size={14} /> },
  completed: { label: 'Completed',       color: '#2A9D8F', bg: '#e8fdf6', icon: <CheckCircle size={14} /> },
  rejected:  { label: 'Rejected',        color: '#E63946', bg: '#fde8ea', icon: <XCircle size={14} /> },
};

const STEPS = ['pending', 'in_review', 'in_repair', 'completed'];

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, color: '#888', bg: '#f1f3f5' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: m.bg, color: m.color,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
    }}>
      {m.icon} {m.label}
    </span>
  );
};

const Timeline = ({ status }) => {
  const isRejected = status === 'rejected';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 12 }}>
      {STEPS.map((s, i) => {
        const idx   = STEPS.indexOf(status);
        const done  = i < idx || (status === 'completed' && i === STEPS.length - 1);
        const active = s === status && !isRejected;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done ? '#2A9D8F' : active ? '#0077B6' : '#e5e7eb',
                color: done || active ? '#fff' : '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                border: active ? '2px solid #0077B6' : 'none',
                boxShadow: active ? '0 0 0 3px #bfdbfe' : 'none',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 10, marginTop: 4, color: done ? '#2A9D8F' : active ? '#0077B6' : '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {STATUS_META[s]?.label || s}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#2A9D8F' : '#e5e7eb', margin: '0 4px', marginBottom: 14 }} />
            )}
          </div>
        );
      })}
      {isRejected && (
        <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#E63946', fontSize: 12, fontWeight: 600 }}>
          <XCircle size={16} /> Rejected
        </div>
      )}
    </div>
  );
};

/* ── Submit modal ───────────────────────────────────────────── */
const SubmitModal = ({ onClose, onSaved }) => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product_id: '', issue_description: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    // Load products from customer's orders
    api.get('/orders/my?limit=100').then(r => {
      const items = [];
      (r.data.data || []).forEach(o => {
        if (o.product_id) items.push({ product_id: o.product_id, name: o.product_name || `Order ${o.order_id?.slice(0,8)}` });
      });
      setProducts(items);
    }).catch(() => {});
    // Also load all products as fallback
    api.get('/products?limit=200').then(r => {
      setProducts(prev => {
        const ids = new Set(prev.map(p => p.product_id));
        const extra = (r.data.data || []).filter(p => !ids.has(p.product_id)).map(p => ({ product_id: p.product_id, name: p.name }));
        return [...prev, ...extra];
      });
    }).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!form.product_id) return toast.error('Please select a product');
    if (form.issue_description.trim().length < 10) return toast.error('Describe the issue in at least 10 characters');
    setSaving(true);
    try {
      await api.post('/warranty/repair', {
        product_id: form.product_id,
        issue_description: form.issue_description.trim(),
      });
      toast.success('Repair request submitted successfully!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Submit Repair Request</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={save} className="modal-form">
          <div className="form-group">
            <label className="form-label">Select Product *</label>
            <select className="form-control" value={form.product_id} onChange={e => set('product_id', e.target.value)} required>
              <option value="">— Choose a product —</option>
              {products.map(p => (
                <option key={p.product_id} value={p.product_id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Issue Description * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(min 10 chars)</span></label>
            <textarea
              className="form-control"
              rows={5}
              placeholder="Describe the problem in detail — e.g. 'Screen doesn't turn on after being dropped. Charging port also seems loose.'"
              value={form.issue_description}
              onChange={e => set('issue_description', e.target.value)}
              required
            />
            <div style={{ fontSize: 11, color: form.issue_description.length < 10 ? 'var(--error)' : 'var(--text-muted)', marginTop: 4 }}>
              {form.issue_description.length} characters
            </div>
          </div>
          <div style={{ background: '#fff8e1', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 4 }}>
            <AlertCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Our support team will review your request and contact you within 24 hours.
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Submitting…' : <><Wrench size={14} /> Submit Request</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Detail modal ───────────────────────────────────────────── */
const DetailModal = ({ rep, onClose, onCancelled }) => {
  const [cancelling, setCancelling] = useState(false);

  const cancel = async () => {
    if (!window.confirm('Cancel this repair request?')) return;
    setCancelling(true);
    try {
      await api.delete(`/warranty/repair/${rep.request_id}`);
      toast.success('Repair request cancelled');
      onCancelled();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel this request');
    } finally { setCancelling(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Repair Request Details</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-form">
          {/* Status + Timeline */}
          <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Request Status</span>
              <StatusBadge status={rep.status} />
            </div>
            <Timeline status={rep.status} />
          </div>

          {/* Product */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, padding: '12px', border: '1px solid var(--border)', borderRadius: 8 }}>
            {rep.product_image ? (
              <img src={rep.product_image} alt={rep.product_name} style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 6, background: '#f1f3f5' }} onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <div style={{ width: 52, height: 52, background: '#f1f3f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={22} color="#9ca3af" /></div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{rep.product_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Submitted: {formatDate(rep.created_at)}</div>
            </div>
          </div>

          {/* Issue */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Issue Description</div>
            <div style={{ background: '#f8f9fa', padding: '10px 14px', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>{rep.issue_description}</div>
          </div>

          {/* Admin notes */}
          {rep.admin_notes && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Technician Notes</div>
              <div style={{ background: '#e8f4fd', padding: '10px 14px', borderRadius: 8, fontSize: 13, lineHeight: 1.6, color: '#0077B6' }}>{rep.admin_notes}</div>
            </div>
          )}

          {/* Estimated cost */}
          {rep.estimated_cost && (
            <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, background: '#e8fdf6', padding: '10px 14px', borderRadius: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Estimated Cost:</span>
              <span style={{ color: '#2A9D8F', fontWeight: 700 }}>RWF {parseFloat(rep.estimated_cost).toLocaleString()}</span>
            </div>
          )}

          {/* Technician */}
          {rep.technician_name && (
            <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text-muted)' }}>
              Assigned Technician: <strong style={{ color: 'var(--text)' }}>{rep.technician_name}</strong>
            </div>
          )}

          <div className="modal-footer">
            {rep.status === 'pending' && (
              <button className="btn btn-danger" onClick={cancel} disabled={cancelling}>
                <Trash2 size={13} /> {cancelling ? 'Cancelling…' : 'Cancel Request'}
              </button>
            )}
            <button className="btn btn-outline" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const CustomerRepairs = () => {
  const [repairs, setRepairs]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [showSubmit, setShowSubmit] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/warranty/repair/my')
      .then(r => setRepairs(r.data || []))
      .catch(() => toast.error('Failed to load repair requests'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? repairs : repairs.filter(r => r.status === filter);

  const counts = repairs.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Repair Requests</h1>
          <p>Submit and track device repair requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowSubmit(true)}>
          <Plus size={16} /> New Request
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 14, marginBottom: 24 }}>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} className="stat-card" style={{ cursor: 'pointer', border: filter === key ? `2px solid ${meta.color}` : '2px solid transparent' }}
            onClick={() => setFilter(filter === key ? 'all' : key)}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color }}>
              {meta.icon}
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: 22, color: meta.color }}>{counts[key] || 0}</div>
              <div className="stat-label">{meta.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs" style={{ marginBottom: 20 }}>
        {['all', ...Object.keys(STATUS_META)].map(s => (
          <button key={s} className={`filter-tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All Requests' : STATUS_META[s]?.label || s}
            <span className="tab-count">{s === 'all' ? repairs.length : (counts[s] || 0)}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? <div className="spinner" /> : (
        filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Wrench size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 16 }}>
              {filter === 'all' ? "You haven't submitted any repair requests yet." : `No ${STATUS_META[filter]?.label} requests.`}
            </p>
            {filter === 'all' && (
              <button className="btn btn-primary" onClick={() => setShowSubmit(true)}>
                <Plus size={15} /> Submit First Request
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(rep => (
              <div key={rep.request_id} className="card"
                style={{ cursor: 'pointer', transition: 'box-shadow .2s', borderLeft: `4px solid ${STATUS_META[rep.status]?.color || '#e5e7eb'}` }}
                onClick={() => setSelected(rep)}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Product image */}
                  {rep.product_image ? (
                    <img src={rep.product_image} alt={rep.product_name} style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, background: '#f8f9fa', border: '1px solid var(--border)', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 56, height: 56, background: '#f1f3f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={24} color="#9ca3af" />
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{rep.product_name}</span>
                      <StatusBadge status={rep.status} />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rep.issue_description}
                    </div>
                    {/* Mini timeline */}
                    <Timeline status={rep.status} />
                  </div>

                  {/* Meta */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(rep.created_at)}</div>
                    {rep.estimated_cost && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#2A9D8F', marginTop: 4 }}>
                        Est: RWF {parseFloat(rep.estimated_cost).toLocaleString()}
                      </div>
                    )}
                    <div style={{ marginTop: 6, color: 'var(--primary)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                      View <ChevronRight size={13} />
                    </div>
                  </div>
                </div>

                {/* Admin notes preview */}
                {rep.admin_notes && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: '#0077B6', display: 'flex', gap: 6 }}>
                    <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span><strong>Technician:</strong> {rep.admin_notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Modals */}
      {showSubmit && <SubmitModal onClose={() => setShowSubmit(false)} onSaved={load} />}
      {selected && <DetailModal rep={selected} onClose={() => setSelected(null)} onCancelled={load} />}
    </div>
  );
};

export default CustomerRepairs;
