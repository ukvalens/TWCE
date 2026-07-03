import { useEffect, useState, useCallback } from 'react';
import { Shield, Users, Save, Pencil, X, Check } from 'lucide-react';
import api from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

const ROLE_COLORS = { 1: '#e63946', 2: '#0077B6', 3: '#2A9D8F', 4: '#7c3aed', 5: '#f59e0b' };

// All modules and what actions each can have
const MODULES = [
  { key: 'dashboard',   label: 'Dashboard',         actions: ['view'] },
  { key: 'users',       label: 'Users',              actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'vendors',     label: 'Vendors',            actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { key: 'products',    label: 'Products',           actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { key: 'orders',      label: 'Orders',             actions: ['view', 'edit', 'cancel'] },
  { key: 'payments',    label: 'Payments',           actions: ['view', 'refund'] },
  { key: 'deliveries',  label: 'Deliveries',         actions: ['view', 'edit'] },
  { key: 'repairs',     label: 'Repairs',            actions: ['view', 'create', 'edit'] },
  { key: 'tickets',     label: 'Support Tickets',    actions: ['view', 'create', 'edit', 'close'] },
  { key: 'coupons',     label: 'Coupons',            actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'analytics',   label: 'Analytics',          actions: ['view'] },
  { key: 'audit',       label: 'Audit Logs',         actions: ['view'] },
  { key: 'settings',    label: 'Settings',           actions: ['view', 'edit'] },
  { key: 'messages',    label: 'Messages',           actions: ['view', 'send'] },
  { key: 'notifications', label: 'Notifications',   actions: ['view'] },
  { key: 'warranties',  label: 'Warranties',         actions: ['view', 'create'] },
  { key: 'returns',     label: 'Returns',            actions: ['view', 'create', 'approve'] },
];

// Default permission matrix per role
const DEFAULT_PERMISSIONS = {
  1: { // Admin — full access
    dashboard: ['view'],
    users: ['view','create','edit','delete'],
    vendors: ['view','create','edit','delete','approve'],
    products: ['view','create','edit','delete','approve'],
    orders: ['view','edit','cancel'],
    payments: ['view','refund'],
    deliveries: ['view','edit'],
    repairs: ['view','create','edit'],
    tickets: ['view','create','edit','close'],
    coupons: ['view','create','edit','delete'],
    analytics: ['view'],
    audit: ['view'],
    settings: ['view','edit'],
    messages: ['view','send'],
    notifications: ['view'],
    warranties: ['view','create'],
    returns: ['view','create','approve'],
    loyalty: ['view'],
  },
  2: { // Vendor
    dashboard: ['view'],
    products: ['view','create','edit'],
    orders: ['view'],
    payments: ['view'],
    deliveries: ['view'],
    warranties: ['view','create'],
    returns: ['view'],
    messages: ['view','send'],
    notifications: ['view'],
    analytics: ['view'],
  },
  3: { // Customer
    dashboard: ['view'],
    orders: ['view','cancel'],
    payments: ['view'],
    messages: ['view','send'],
    notifications: ['view'],
    warranties: ['view','create'],
    repairs: ['view','create'],
    returns: ['view','create'],
    tickets: ['view','create'],
    loyalty: ['view'],
  },
  4: { // Support
    dashboard: ['view'],
    tickets: ['view','create','edit','close'],
    repairs: ['view','edit'],
    returns: ['view','approve'],
    messages: ['view','send'],
    notifications: ['view'],
  },
  5: { // Delivery
    dashboard: ['view'],
    deliveries: ['view','edit'],
    messages: ['view','send'],
    notifications: ['view'],
  },
};

// ── Edit Role Modal ───────────────────────────────────────
const EditRoleModal = ({ role, onClose, onSave }) => {
  const [name, setName]   = useState(role.role_name);
  const [desc, setDesc]   = useState(role.description || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error('Role name is required');
    setSaving(true);
    try {
      await api.put(`/admin/roles/${role.role_id}`, { role_name: name.trim(), description: desc.trim() });
      toast.success('Role updated');
      onSave();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update role'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Role</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Role Name</label>
            <input className="form-control" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={saving} onClick={save}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Roles Tab ─────────────────────────────────────────────
export const RolesTab = () => {
  const [roles, setRoles]     = useState([]);
  const [counts, setCounts]   = useState({});
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        api.get('/admin/roles'),
        api.get('/users?limit=1000'),
      ]);
      setRoles(rolesRes.data);
      const c = {};
      (usersRes.data.data || []).forEach(u => { c[u.role_id] = (c[u.role_id] || 0) + 1; });
      setCounts(c);
    } catch { toast.error('Failed to load roles'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {roles.map(r => (
          <div key={r.role_id} className="card" style={{ borderTop: `4px solid ${ROLE_COLORS[r.role_id] || '#ccc'}`, marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: (ROLE_COLORS[r.role_id] || '#ccc') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} color={ROLE_COLORS[r.role_id] || '#ccc'} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.role_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Role ID: {r.role_id}</div>
                </div>
              </div>
              {r.role_id !== 1 && (
                <button className="btn btn-sm" style={{ background: '#e8f0fe', color: '#3b6fd4', border: 'none' }}
                  onClick={() => setEditing(r)}><Pencil size={13} /></button>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '12px 0 10px' }}>{r.description || '—'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} color="var(--text-muted)" />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text)' }}>{counts[r.role_id] || 0}</strong> users</span>
            </div>
          </div>
        ))}
      </div>
      {editing && <EditRoleModal role={editing} onClose={() => setEditing(null)} onSave={load} />}
    </div>
  );
};

// ── Permissions Tab ───────────────────────────────────────
export const PermissionsTab = () => {
  const { fetchProfile } = useAuth();
  const [roles, setRoles]       = useState([]);
  const [perms, setPerms]       = useState({});   // { roleId: { module: [actions] } }
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [changed, setChanged]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rolesRes = await api.get('/admin/roles');
      setRoles(rolesRes.data);

      // Try to load saved permissions from system_settings
      const settingsRes = await api.get('/admin/settings');
      const permSetting = (settingsRes.data || []).find(s => s.key === 'role_permissions');
      if (permSetting?.value) {
        try { setPerms(JSON.parse(permSetting.value)); return; } catch {}
      }
      // Fall back to defaults
      setPerms(JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)));
    } catch { toast.error('Failed to load permissions'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (roleId, module, action) => {
    if (roleId === 1) return; // Admin always has full access
    setPerms(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[roleId]) next[roleId] = {};
      if (!next[roleId][module]) next[roleId][module] = [];
      const arr = next[roleId][module];
      const idx = arr.indexOf(action);
      if (idx === -1) arr.push(action);
      else arr.splice(idx, 1);
      return next;
    });
    setChanged(true);
  };

  const hasPermission = (roleId, module, action) =>
    (perms[roleId]?.[module] || []).includes(action);

  const savePermissions = async () => {
    setSaving(true);
    try {
      await api.post('/admin/settings', { key: 'role_permissions', value: JSON.stringify(perms) });
      await fetchProfile(); // re-fetch so admin's own can() updates immediately
      toast.success('Permissions saved and applied');
      setChanged(false);
    } catch { toast.error('Failed to save permissions'); }
    finally { setSaving(false); }
  };

  const resetToDefaults = () => {
    setPerms(JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)));
    setChanged(true);
    toast.success('Reset to defaults — click Save to apply');
  };

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
          Define what each role can do across all modules. Admin always has full access.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={resetToDefaults}>Reset Defaults</button>
          <button className="btn btn-primary btn-sm" disabled={saving || !changed} onClick={savePermissions}>
            <Save size={13} /> {saving ? 'Saving…' : 'Save Permissions'}
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid var(--border)', minWidth: 160 }}>Module / Action</th>
              {roles.map(r => (
                <th key={r.role_id} style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '2px solid var(--border)', minWidth: 100 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: (ROLE_COLORS[r.role_id] || '#ccc') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={14} color={ROLE_COLORS[r.role_id] || '#ccc'} />
                    </div>
                    <span style={{ fontWeight: 700, color: ROLE_COLORS[r.role_id] || '#333' }}>{r.role_name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((mod, mi) => (
              mod.actions.map((action, ai) => (
                <tr key={`${mod.key}-${action}`} style={{ background: ai === 0 && mi % 2 === 0 ? '#fafbfc' : ai === 0 ? '#fff' : 'inherit', borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid #f0f0f0' }}>
                    {ai === 0
                      ? <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{mod.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>{action}</div>
                        </div>
                      : <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, paddingLeft: 12 }}>{action}</div>
                    }
                  </td>
                  {roles.map(r => {
                    const has = hasPermission(r.role_id, mod.key, action);
                    const isAdmin = r.role_id === 1;
                    return (
                      <td key={r.role_id} style={{ padding: '8px 14px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
                        <button
                          onClick={() => toggle(r.role_id, mod.key, action)}
                          disabled={isAdmin}
                          title={isAdmin ? 'Admin always has full access' : (has ? 'Click to revoke' : 'Click to grant')}
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: 'none', cursor: isAdmin ? 'default' : 'pointer',
                            background: has ? (ROLE_COLORS[r.role_id] || '#2A9D8F') + '20' : '#f1f3f5',
                            color: has ? (ROLE_COLORS[r.role_id] || '#2A9D8F') : '#ccc',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all .15s',
                          }}
                        >
                          {has ? <Check size={14} /> : <X size={14} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────
const TABS = [
  { id: 'roles',       label: 'Roles',       icon: <Shield size={15} /> },
  { id: 'permissions', label: 'Permissions', icon: <Check size={15} /> },
];

const AdminRoles = () => {
  const [tab, setTab] = useState('roles');

  return (
    <div>
      <div className="page-header">
        <div><h1>Role Management</h1><p>Manage roles and configure permissions across the system</p></div>
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

      {tab === 'roles'       && <RolesTab />}
      {tab === 'permissions' && <PermissionsTab />}
    </div>
  );
};

export default AdminRoles;
