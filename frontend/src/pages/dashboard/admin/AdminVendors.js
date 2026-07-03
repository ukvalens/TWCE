import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Search, Eye, X, Star } from 'lucide-react';
import api from '../../../utils/api';
import { formatDate, statusBadge } from '../../../utils/helpers';
import { Pagination } from './AdminUsers';
import toast from 'react-hot-toast';

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
        <strong style={{ fontSize: 16 }}>{title}</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
      </div>
      <div style={{ padding: 22 }}>{children}</div>
    </div>
  </div>
);

const VendorDetail = ({ vendor }) => {
  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value ?? '—'}</span>
    </div>
  );
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: '#f8f9fa', borderRadius: 10 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
          {vendor.shop_name?.[0]?.toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{vendor.shop_name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{vendor.full_name}</div>
          <span className={`badge badge-${statusBadge(vendor.verification_status)}`} style={{ marginTop: 4 }}>{vendor.verification_status}</span>
        </div>
      </div>
      <Row label="Business Email"  value={vendor.business_email} />
      <Row label="Business Phone"  value={vendor.business_phone} />
      <Row label="Owner Email"     value={vendor.email} />
      <Row label="Rating"          value={<span style={{ color: '#f59e0b', fontWeight: 700 }}>{vendor.rating} ★</span>} />
      <Row label="Member Since"    value={formatDate(vendor.created_at)} />
      {vendor.description && <div style={{ marginTop: 14, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{vendor.description}</div>}
    </div>
  );
};

const AdminVendors = () => {
  const [vendors, setVendors] = useState([]);
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
      const { data } = await api.get(`/vendors?${params}`);
      setVendors(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load vendors'); }
    finally { setLoading(false); }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, verification_status) => {
    try { await api.put(`/vendors/${id}/status`, { verification_status }); toast.success('Vendor status updated'); load(); }
    catch { toast.error('Update failed'); }
  };

  const counts = { total, verified: vendors.filter(v => v.verification_status === 'verified').length, pending: vendors.filter(v => v.verification_status === 'pending').length };

  return (
    <div>
      <div className="page-header"><h1>Vendor Management</h1><p>Approve and manage seller accounts</p></div>

      {/* Mini stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Vendors',    value: total,             color: '#e8f4fd', iconColor: '#0077B6' },
          { label: 'Verified',         value: counts.verified,   color: '#e8fdf6', iconColor: '#2A9D8F' },
          { label: 'Pending Review',   value: counts.pending,    color: '#fff3e0', iconColor: '#f59e0b' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={20} color={c.iconColor} />
            </div>
            <div><div className="stat-value" style={{ fontSize: 22 }}>{c.value}</div><div className="stat-label">{c.label}</div></div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: 34 }} placeholder="Search shop or owner name…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" style={{ width: 180 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>{total} vendors found</div>
        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Shop</th><th>Owner</th><th>Contact</th><th>Rating</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {vendors.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>No vendors found</td></tr>}
                {vendors.map(v => (
                  <tr key={v.vendor_id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{v.shop_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.business_email}</div>
                    </td>
                    <td>{v.full_name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.business_phone}</td>
                    <td><span style={{ color: '#f59e0b', fontWeight: 700 }}>{v.rating} ★</span></td>
                    <td><span className={`badge badge-${statusBadge(v.verification_status)}`}>{v.verification_status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(v.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" style={{ background: '#e8f4fd', color: '#0077B6', border: 'none', padding: '6px 10px' }}
                          onClick={() => setSelected(v)} title="View"><Eye size={13} /></button>
                        {v.verification_status !== 'verified' && (
                          <button className="btn btn-sm" style={{ background: '#e8fdf6', color: '#2A9D8F', border: 'none' }}
                            onClick={() => updateStatus(v.vendor_id, 'verified')} title="Approve"><CheckCircle size={13} /></button>
                        )}
                        {v.verification_status !== 'rejected' && (
                          <button className="btn btn-sm" style={{ background: '#fde8ea', color: '#E63946', border: 'none' }}
                            onClick={() => updateStatus(v.vendor_id, 'rejected')} title="Reject"><XCircle size={13} /></button>
                        )}
                      </div>
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
        <Modal title="Vendor Details" onClose={() => setSelected(null)}>
          <VendorDetail vendor={selected} />
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            {selected.verification_status !== 'verified' && (
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { updateStatus(selected.vendor_id, 'verified'); setSelected(null); }}>
                <CheckCircle size={15} /> Approve Vendor
              </button>
            )}
            {selected.verification_status !== 'rejected' && (
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { updateStatus(selected.vendor_id, 'rejected'); setSelected(null); }}>
                <XCircle size={15} /> Reject Vendor
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminVendors;
