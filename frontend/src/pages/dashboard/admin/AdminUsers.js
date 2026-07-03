import { useEffect, useState, useCallback } from 'react';
import { Search, UserCheck, UserX, Shield, Trash2, X, UserPlus, KeyRound, Check, Pencil } from 'lucide-react';
import api from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import { formatDate, statusBadge, getRoleName } from '../../../utils/helpers';
import { RolesTab, PermissionsTab } from './AdminRoles';
import toast from 'react-hot-toast';

const ROLES = [
  { id: 1, name: 'Admin',    desc: 'Full system access — manage users, products, orders, settings' },
  { id: 2, name: 'Vendor',   desc: 'Manage own products, view orders, chat with customers' },
  { id: 3, name: 'Customer', desc: 'Browse & purchase products, track orders' },
  { id: 4, name: 'Support',  desc: 'Handle tickets, assist customers' },
  { id: 5, name: 'Delivery', desc: 'View and update assigned delivery status' },
];

const ROLE_COLORS = { 1: '#e63946', 2: '#0077B6', 3: '#2A9D8F', 4: '#7c3aed', 5: '#f59e0b' };

const AddUserModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', role_id: 3, shop_name: '', business_email: '', business_phone: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isVendor = parseInt(form.role_id) === 2;

  const save = async () => {
    if (!form.full_name || !form.email || !form.password) return toast.error('Name, email and password are required');
    if (isVendor && !form.shop_name) return toast.error('Shop name is required for vendors');
    setSaving(true);
    try {
      if (isVendor) {
        await api.post('/vendors/admin', {
          full_name: form.full_name, email: form.email, phone: form.phone || undefined,
          password: form.password, shop_name: form.shop_name,
          business_email: form.business_email || undefined,
          business_phone: form.business_phone || undefined,
        });
      } else {
        await api.post('/users', {
          full_name: form.full_name, email: form.email, phone: form.phone || undefined,
          password: form.password, role_id: form.role_id,
        });
      }
      toast.success('User created successfully');
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New User</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Role</label>
            <select className="form-control" value={form.role_id} onChange={e => set('role_id', parseInt(e.target.value))}>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Full Name *</label>
              <input className="form-control" placeholder="John Doe" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Phone</label>
              <input className="form-control" placeholder="+1 234 567 8900" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Email *</label>
            <input className="form-control" type="email" placeholder="user@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Password *</label>
            <input className="form-control" type="password" placeholder="Min. 8 characters" value={form.password} onChange={e => set('password', e.target.value)} />
          </div>
          {isVendor && (
            <>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, fontWeight: 700, fontSize: 13, color: ROLE_COLORS[2] }}>Vendor Details</div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Shop Name *</label>
                <input className="form-control" placeholder="My Electronics Store" value={form.shop_name} onChange={e => set('shop_name', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Business Email</label>
                  <input className="form-control" type="email" placeholder="shop@example.com" value={form.business_email} onChange={e => set('business_email', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Business Phone</label>
                  <input className="form-control" placeholder="+1 234 567 8900" value={form.business_phone} onChange={e => set('business_phone', e.target.value)} />
                </div>
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Creating…' : <><UserPlus size={15} /> Create User</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditUserModal = ({ user: u, onClose, onSave }) => {
  const [form, setForm] = useState({ full_name: u.full_name, email: u.email, phone: u.phone || '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.full_name || !form.email) return toast.error('Name and email are required');
    setSaving(true);
    try {
      await api.put(`/users/${u.user_id}`, form);
      toast.success('User updated');
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit User — {u.full_name}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Full Name *</label>
            <input className="form-control" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Email *</label>
            <input className="form-control" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Phone</label>
            <input className="form-control" placeholder="+1 234 567 8900" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : <><Pencil size={14} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RolesModal = ({ user: u, onClose, onSave }) => {
  const [roleId, setRoleId] = useState(u.role_id);
  const [status, setStatus] = useState(u.status);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const ps = [];
      if (roleId !== u.role_id) ps.push(api.put(`/users/${u.user_id}/role`,   { role_id: roleId }));
      if (status !== u.status)  ps.push(api.put(`/users/${u.user_id}/status`, { status }));
      await Promise.all(ps);
      toast.success('User updated');
      onSave();
      onClose();
    } catch { toast.error('Failed to update user'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Roles &amp; Permissions — {u.full_name}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, display: 'block' }}>Assign Role</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROLES.map(r => (
                <label key={r.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px',
                  borderRadius: 8, border: `2px solid ${roleId === r.id ? ROLE_COLORS[r.id] : 'var(--border)'}`,
                  background: roleId === r.id ? ROLE_COLORS[r.id] + '10' : 'var(--bg)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <input type="radio" name="role" value={r.id} checked={roleId === r.id}
                    onChange={() => setRoleId(r.id)} style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: roleId === r.id ? ROLE_COLORS[r.id] : 'inherit' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: 'block' }}>Account Status</label>
            <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TABS = [
  { id: 'users',       label: 'Users',       icon: <UserPlus size={15} /> },
  { id: 'roles',       label: 'Roles',       icon: <KeyRound size={15} /> },
  { id: 'permissions', label: 'Permissions', icon: <Check size={15} /> },
];

const AdminUsers = () => {
  const [tab, setTab]           = useState('users');
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [role, setRole]         = useState('');
  const [status, setStatus]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing]   = useState(null);
  const [showAdd, setShowAdd]   = useState(false);

  const { user: me } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.append('search', search);
      if (role)   params.append('role', role);
      if (status) params.append('status', status);
      const { data } = await api.get(`/users?${params}`);
      setUsers(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search, role, status]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, newStatus) => {
    if (id === me?.user_id) return toast.error('You cannot change your own status');
    try {
      await api.put(`/users/${id}/status`, { status: newStatus });
      toast.success('User status updated');
      load();
    } catch { toast.error('Failed to update status'); }
  };

  const deleteUser = async (u) => {
    if (u.user_id === me?.user_id) return toast.error('You cannot delete your own account');
    if (!window.confirm(`Delete "${u.full_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u.user_id}`);
      toast.success('User deleted');
      load();
    } catch { toast.error('Failed to delete user'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>User Management</h1><p>Manage users, roles and permissions</p></div>
        {tab === 'users' && <button className="btn btn-primary" onClick={() => setShowAdd(true)}><UserPlus size={16} /> Add User</button>}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f1f3f5', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 18px', border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 500, transition: 'all .15s',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'roles' && <RolesTab />}
      {tab === 'permissions' && <PermissionsTab />}
      {tab === 'users' && <>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: 34 }} placeholder="Search name or email…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" style={{ width: 140 }} value={role} onChange={e => { setRole(e.target.value); setPage(1); }}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="form-control" style={{ width: 140 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>{total} users found</div>
        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No users found</td></tr>}
                {users.map(u => (
                  <tr key={u.user_id}>
                    <td><strong>{u.full_name}</strong></td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span className="badge" style={{ background: ROLE_COLORS[u.role_id] + '20', color: ROLE_COLORS[u.role_id] }}>
                        {u.role_name || getRoleName(u.role_id)}
                      </span>
                    </td>
                    <td><span className={`badge badge-${statusBadge(u.status)}`}>{u.status}</span></td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" style={{ background: '#e8f4fd', color: '#0077B6', border: 'none' }}
                          title="Edit user" onClick={() => setEditing(u)}>
                          <Pencil size={13} />
                        </button>
                        <button className="btn btn-sm" style={{ background: '#f3e8fd', color: '#7c3aed', border: 'none' }}
                          title="Roles & Permissions" onClick={() => setSelected(u)}>
                          <Shield size={13} />
                        </button>
                        {u.status !== 'active' && (
                          <button className="btn btn-sm" style={{ background: '#e8fdf6', color: '#2A9D8F', border: 'none' }}
                            title="Activate" onClick={() => updateStatus(u.user_id, 'active')}><UserCheck size={13} /></button>
                        )}
                        {u.status !== 'banned' && (
                          <button className="btn btn-sm" style={{ background: '#fde8ea', color: '#E63946', border: 'none' }}
                            title="Ban" onClick={() => updateStatus(u.user_id, 'banned')}><UserX size={13} /></button>
                        )}
                        {u.user_id !== me?.user_id && (
                          <button className="btn btn-sm" style={{ background: '#fff3e0', color: '#f59e0b', border: 'none' }}
                            title="Delete user" onClick={() => deleteUser(u)}><Trash2 size={13} /></button>
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

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onSave={load} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onSave={load} />}
      {selected && <RolesModal user={selected} onClose={() => setSelected(null)} onSave={load} />}
      </>}
    </div>
  );
};

export const Pagination = ({ page, total, limit, onPage }) => {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20 }}>
      {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onPage(p)}
          className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`}>{p}</button>
      ))}
    </div>
  );
};

export default AdminUsers;
