import { useEffect, useState, useCallback } from 'react';
import {
  Save, Plus, Settings, X, Mail, MessageSquare, Shield,
  Database, Users, BarChart2, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'dashboard',  label: 'Dashboard Settings',    icon: <Settings size={15} /> },
  { id: 'reports',    label: 'Reports & Analytics',   icon: <BarChart2 size={15} /> },
  { id: 'email',      label: 'Email Settings',        icon: <Mail size={15} /> },
  { id: 'sms',        label: 'SMS Settings',          icon: <MessageSquare size={15} /> },
  { id: 'security',   label: 'Security Settings',     icon: <Shield size={15} /> },
  { id: 'backup',     label: 'Backup & Recovery',     icon: <Database size={15} /> },
  { id: 'auth',       label: 'User & Authentication', icon: <Users size={15} /> },
];

const DEFAULT_SETTINGS = {
  // Dashboard
  site_name:            { value: 'TWCE Store',       description: 'Name displayed across the site',              tab: 'dashboard' },
  site_email:           { value: 'support@twce.com', description: 'Contact email shown to customers',            tab: 'dashboard' },
  currency:             { value: 'USD',              description: 'Default store currency',                      tab: 'dashboard' },
  tax_rate:             { value: '0',                description: 'Tax percentage applied to orders',            tab: 'dashboard' },
  free_shipping_above:  { value: '100',              description: 'Free shipping for orders above this amount',  tab: 'dashboard' },
  max_items_per_order:  { value: '50',               description: 'Maximum items a customer can order at once',  tab: 'dashboard' },
  maintenance_mode:     { value: 'false',            description: 'Put the store in maintenance mode',           tab: 'dashboard', type: 'boolean' },
  new_vendor_approval:  { value: 'true',             description: 'Require admin approval for new vendors',      tab: 'dashboard', type: 'boolean' },
  // Reports
  report_auto_export:   { value: 'false',            description: 'Automatically export reports daily',          tab: 'reports',   type: 'boolean' },
  report_export_email:  { value: '',                 description: 'Email to send auto-exported reports',         tab: 'reports' },
  report_retention_days:{ value: '90',               description: 'Days to retain report data',                  tab: 'reports' },
  analytics_tracking:   { value: 'true',             description: 'Enable analytics tracking',                   tab: 'reports',   type: 'boolean' },
  // Email
  email_host:           { value: '',                 description: 'SMTP host (e.g. smtp.gmail.com)',             tab: 'email' },
  email_port:           { value: '587',              description: 'SMTP port',                                   tab: 'email' },
  email_user:           { value: '',                 description: 'SMTP username / email address',               tab: 'email' },
  email_from_name:      { value: 'TWCE Store',       description: 'Sender display name',                        tab: 'email' },
  email_notifications:  { value: 'true',             description: 'Send email notifications to customers',       tab: 'email',     type: 'boolean' },
  // SMS
  sms_provider:         { value: 'twilio',           description: 'SMS provider (twilio / nexmo)',               tab: 'sms' },
  sms_from_number:      { value: '',                 description: 'Sender phone number',                        tab: 'sms' },
  sms_notifications:    { value: 'false',            description: 'Send SMS notifications to customers',         tab: 'sms',       type: 'boolean' },
  sms_order_updates:    { value: 'false',            description: 'Send SMS on order status changes',            tab: 'sms',       type: 'boolean' },
  // Security
  max_login_attempts:   { value: '5',                description: 'Max failed login attempts before lockout',    tab: 'security' },
  lockout_duration_min: { value: '30',               description: 'Account lockout duration (minutes)',          tab: 'security' },
  session_timeout_min:  { value: '60',               description: 'Session timeout (minutes)',                   tab: 'security' },
  require_2fa_admin:    { value: 'false',            description: 'Require 2FA for admin accounts',              tab: 'security',  type: 'boolean' },
  password_min_length:  { value: '8',                description: 'Minimum password length',                     tab: 'security' },
  // Backup
  backup_auto:          { value: 'false',            description: 'Enable automatic database backups',           tab: 'backup',    type: 'boolean' },
  backup_frequency:     { value: 'daily',            description: 'Backup frequency (daily / weekly / monthly)', tab: 'backup' },
  backup_retention_days:{ value: '30',               description: 'Days to keep backup files',                   tab: 'backup' },
  backup_storage:       { value: 'local',            description: 'Backup storage location (local / s3)',        tab: 'backup' },
};

// ── Reusable row ──────────────────────────────────────────────────────────────
const SettingRow = ({ s, onSave }) => {
  const [val, setVal]     = useState(s.value || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setVal(s.value || ''); }, [s.value]);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(s.key, val); toast.success('Saved'); }
    catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const label = s.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #f5f5f5' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          <code style={{ fontSize: 11, background: '#f0f4f8', padding: '1px 6px', borderRadius: 4 }}>{s.key}</code>
          {s.description && ` — ${s.description}`}
        </div>
      </div>
      {s.type === 'boolean'
        ? <select className="form-control" style={{ width: 120 }} value={val} onChange={e => setVal(e.target.value)}>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        : <input className="form-control" style={{ width: 220 }} value={val} onChange={e => setVal(e.target.value)} />
      }
      <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleSave}>
        <Save size={13} /> {saving ? '…' : 'Save'}
      </button>
    </div>
  );
};

// ── User & Auth tab ───────────────────────────────────────────────────────────
const UserAuthTab = ({ settings, onSave }) => {
  const [users, setUsers]         = useState([]);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);
  const [newPass, setNewPass]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadUsers = useCallback(async (q) => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get(`/admin/users?search=${encodeURIComponent(q)}&limit=20`);
      setUsers(data.data || data || []);
    } catch { toast.error('Failed to load users'); }
    finally { setLoadingUsers(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (search.length >= 2) loadUsers(search); else setUsers([]); }, 400);
    return () => clearTimeout(t);
  }, [search, loadUsers]);

  const handleReset = async () => {
    if (!selected) return toast.error('Select a user first');
    if (newPass.length < 8) return toast.error('Password must be at least 8 characters');
    setResetting(true);
    try {
      await api.post(`/admin/users/${selected.user_id}/reset-password`, { new_password: newPass });
      toast.success(`Password reset for ${selected.full_name}`);
      setNewPass(''); setSelected(null); setSearch(''); setUsers([]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reset password');
    } finally { setResetting(false); }
  };

  const authSettings = settings.filter(s => s.tab === 'security' &&
    ['max_login_attempts','lockout_duration_min','session_timeout_min','password_min_length'].includes(s.key));

  return (
    <div>
      {/* Auth settings */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
          <Shield size={16} color="var(--primary)" />
          <strong style={{ fontSize: 15 }}>Authentication Settings</strong>
        </div>
        {authSettings.map(s => <SettingRow key={s.key} s={s} onSave={onSave} />)}
      </div>

      {/* Admin password reset */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
          <RefreshCw size={16} color="var(--primary)" />
          <strong style={{ fontSize: 15 }}>Reset User Password</strong>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>Admin override — no email required</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Search User</label>
            <input
              className="form-control"
              placeholder="Type name or email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null); }}
            />
            {loadingUsers && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Searching…</div>}
            {users.length > 0 && !selected && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,.1)', maxHeight: 200, overflowY: 'auto', position: 'absolute', zIndex: 10, width: 'calc(50% - 36px)' }}>
                {users.map(u => (
                  <div key={u.user_id}
                    onClick={() => { setSelected(u); setSearch(u.full_name); setUsers([]); }}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <strong>{u.full_name}</strong>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{u.email}</span>
                    <span style={{ fontSize: 11, background: '#e8f4fd', color: 'var(--primary)', borderRadius: 4, padding: '1px 6px', marginLeft: 8 }}>{u.role_name || `role ${u.role_id}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showPass ? 'text' : 'password'}
                placeholder="Min 8 characters"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                style={{ paddingRight: 40 }}
              />
              <button onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {selected && (
          <div style={{ background: '#e8f4fd', border: '1px solid #bee3f8', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
            Selected: <strong>{selected.full_name}</strong> — {selected.email}
          </div>
        )}

        <button className="btn btn-primary btn-sm" disabled={resetting || !selected || newPass.length < 8} onClick={handleReset}>
          <RefreshCw size={13} /> {resetting ? 'Resetting…' : 'Reset Password'}
        </button>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [newKey, setNewKey]       = useState('');
  const [newVal, setNewVal]       = useState('');
  const [newDesc, setNewDesc]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/settings');
      const dbMap = {};
      (data || []).forEach(s => { dbMap[s.key] = s.value; });

      const merged = Object.entries(DEFAULT_SETTINGS).map(([key, meta]) => ({
        key,
        value: dbMap[key] ?? meta.value,
        description: meta.description,
        tab: meta.tab,
        type: meta.type || 'text',
      }));

      // Append any extra keys from DB not in defaults
      (data || []).forEach(s => {
        if (!DEFAULT_SETTINGS[s.key]) {
          merged.push({ key: s.key, value: s.value, description: s.description || '', tab: 'dashboard', type: 'text' });
        }
      });

      setSettings(merged);
    } catch { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSetting = async (key, value) => {
    await api.post('/admin/settings', { key, value });
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const addSetting = async () => {
    if (!newKey.trim()) return toast.error('Key is required');
    try {
      await api.post('/admin/settings', { key: newKey.trim(), value: newVal });
      setSettings(prev => [...prev, { key: newKey.trim(), value: newVal, description: newDesc, tab: activeTab, type: 'text' }]);
      setNewKey(''); setNewVal(''); setNewDesc(''); setShowAdd(false);
      toast.success('Setting added');
    } catch { toast.error('Failed to add setting'); }
  };

  const tabSettings = settings.filter(s => s.tab === activeTab);

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>System Settings</h1><p>Configure site-wide behaviour and preferences</p></div>
        {activeTab !== 'auth' && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={14} /> Add Setting
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap', background: '#f1f3f5', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 500, transition: 'all .15s',
              background: activeTab === t.id ? '#fff' : 'transparent',
              color: activeTab === t.id ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Add setting form */}
      {showAdd && activeTab !== 'auth' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <strong>New Setting</strong>
            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Key</label>
              <input className="form-control" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="setting_key" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Value</label>
              <input className="form-control" value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="value" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description</label>
              <input className="form-control" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What this setting controls" />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={addSetting}>Add Setting</button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'auth'
        ? <UserAuthTab settings={settings} onSave={saveSetting} />
        : (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              {TABS.find(t => t.id === activeTab)?.icon}
              <strong style={{ fontSize: 15 }}>{TABS.find(t => t.id === activeTab)?.label}</strong>
            </div>
            {tabSettings.length === 0
              ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>No settings in this section yet.</p>
              : tabSettings.map(s => <SettingRow key={s.key} s={s} onSave={saveSetting} />)
            }
          </div>
        )
      }
    </div>
  );
};

export default AdminSettings;
