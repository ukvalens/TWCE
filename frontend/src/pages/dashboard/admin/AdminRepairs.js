import { useEffect, useState, useCallback } from 'react';
import {
  Wrench, Search, X, Clock, CheckCircle, XCircle,
  Hammer, ChevronDown, Package,
  User, Mail, Phone, DollarSign, UserCheck
} from 'lucide-react';
import api from '../../../utils/api';
import { formatDate } from '../../../utils/helpers';
import { Pagination } from './AdminUsers';
import toast from 'react-hot-toast';

/* ── Status config ─────────────────────────────────────────── */
const STATUS_META = {
  pending:   { label: 'Pending',      color: '#f59e0b', bg: '#fff8e1', icon: <Clock size={13} /> },
  in_review: { label: 'In Review',    color: '#0077B6', bg: '#e8f4fd', icon: <Search size={13} /> },
  in_repair: { label: 'In Repair',    color: '#7c3aed', bg: '#f3e8fd', icon: <Hammer size={13} /> },
  completed: { label: 'Completed',    color: '#2A9D8F', bg: '#e8fdf6', icon: <CheckCircle size={13} /> },
  rejected:  { label: 'Rejected',     color: '#E63946', bg: '#fde8ea', icon: <XCircle size={13} /> },
};

const SBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, color: '#888', bg: '#f1f3f5', icon: null };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: m.bg, color: m.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      {m.icon} {m.label}
    </span>
  );
};

/* ── Update Modal ───────────────────────────────────────────── */
const UpdateModal = ({ rep, technicians, onClose, onSaved }) => {
  const [form, setForm] = useState({
    status:         rep.status,
    admin_notes:    rep.admin_notes    || '',
    estimated_cost: rep.estimated_cost || '',
    assigned_to:    rep.assigned_to    || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/warranty/repair/${rep.request_id}/status`, {
        status:         form.status,
        admin_notes:    form.admin_notes    || undefined,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : undefined,
        assigned_to:    form.assigned_to   || undefined,
      });
      toast.success('Repair request updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Update Repair — {rep.product_name}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={save} className="modal-form">
          {/* Customer info */}
          <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <User size={13} color="var(--text-muted)" />
                <strong>{rep.full_name}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                <Mail size={13} /> {rep.email}
              </div>
              {rep.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                  <Phone size={13} /> {rep.phone}
                </div>
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
              <strong>Issue: </strong>{rep.issue_description}
            </div>
          </div>

          {/* Status */}
          <div className="form-group">
            <label className="form-label">Status *</label>
            <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Assign Technician */}
          <div className="form-group">
            <label className="form-label">Assign Technician</label>
            <select className="form-control" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
              <option value="">— Unassigned —</option>
              {technicians.map(t => (
                <option key={t.user_id} value={t.user_id}>{t.full_name} ({t.email})</option>
              ))}
            </select>
          </div>

          {/* Estimated cost */}
          <div className="form-group">
            <label className="form-label">Estimated Repair Cost (RWF)</label>
            <div style={{ position: 'relative' }}>
              <DollarSign size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-control" type="number" min="0" step="100"
                style={{ paddingLeft: 30 }}
                placeholder="e.g. 15000"
                value={form.estimated_cost}
                onChange={e => set('estimated_cost', e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Technician Notes</label>
            <textarea
              className="form-control" rows={4}
              placeholder="Describe findings, repair steps, parts needed, or rejection reason…"
              value={form.admin_notes}
              onChange={e => set('admin_notes', e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const AdminRepairs = () => {
  const [repairs, setRepairs]         = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats]             = useState({});
  const [selected, setSelected]       = useState(null);
  const [technicians, setTechnicians] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (statusFilter) params.append('status', statusFilter);
      if (search)       params.append('search', search);
      const { data } = await api.get(`/warranty/repair?${params}`);
      setRepairs(data.data || []);
      setTotal(data.total || 0);
      // Build stats from returned rows stats array
      const s = {};
      (data.stats || []).forEach(r => { s[r.status] = parseInt(r.count); });
      setStats(s);
    } catch { toast.error('Failed to load repair requests'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  // Load technicians (admin + support users)
  useEffect(() => {
    api.get('/users?role=4&limit=100').then(r => {
      setTechnicians(r.data.data || []);
    }).catch(() => {});
  }, []);

  const totalAll = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Repair Requests</h1>
          <p>Manage customer device repair requests</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f3f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
            <Wrench size={18} />
          </div>
          <div><div className="stat-value">{totalAll}</div><div className="stat-label">Total Requests</div></div>
        </div>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} className="stat-card"
            style={{ cursor: 'pointer', border: statusFilter === key ? `2px solid ${meta.color}` : '2px solid transparent' }}
            onClick={() => { setStatusFilter(s => s === key ? '' : key); setPage(1); }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color }}>
              {meta.icon}
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: 20, color: meta.color }}>{stats[key] || 0}</div>
              <div className="stat-label">{meta.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search customer, email, or product…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" style={{ width: 170 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>{total} request{total !== 1 ? 's' : ''} found</div>
        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Issue</th>
                  <th>Technician</th>
                  <th>Est. Cost</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {repairs.length === 0 && (
                  <tr><td colSpan={8} className="empty-row">No repair requests found</td></tr>
                )}
                {repairs.map(rep => (
                  <tr key={rep.request_id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{rep.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rep.email}</div>
                      {rep.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rep.phone}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {rep.product_image ? (
                          <img src={rep.product_image} alt={rep.product_name} style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, background: '#f8f9fa', border: '1px solid var(--border)' }} onError={e => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div style={{ width: 36, height: 36, background: '#f1f3f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="#9ca3af" /></div>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{rep.product_name}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rep.issue_description}>
                        {rep.issue_description}
                      </div>
                      {rep.admin_notes && (
                        <div style={{ fontSize: 11, color: '#0077B6', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📝 {rep.admin_notes}
                        </div>
                      )}
                    </td>
                    <td>
                      {rep.technician_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                          <UserCheck size={13} color="#2A9D8F" />
                          {rep.technician_name}
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Unassigned</span>}
                    </td>
                    <td>
                      {rep.estimated_cost
                        ? <span style={{ fontWeight: 600, color: '#2A9D8F', fontSize: 13 }}>RWF {parseFloat(rep.estimated_cost).toLocaleString()}</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td><SBadge status={rep.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(rep.created_at)}</td>
                    <td>
                      <button className="btn btn-xs btn-primary" onClick={() => setSelected(rep)}>
                        <ChevronDown size={12} /> Update
                      </button>
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
        <UpdateModal
          rep={selected}
          technicians={technicians}
          onClose={() => setSelected(null)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default AdminRepairs;
