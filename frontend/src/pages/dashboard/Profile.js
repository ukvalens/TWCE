import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Save } from 'lucide-react';

const Profile = () => {
  const { user, fetchProfile } = useAuth();
  const [form, setForm]     = useState({ full_name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (user) setForm({ full_name: user.full_name || '', phone: user.phone || '' });
  }, [user]);

  const handleProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/users/profile', form);
      await fetchProfile();
      toast.success('Profile updated');
    } catch { toast.error('Update failed'); }
    finally { setLoading(false); }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setPwLoading(false); }
  };

  return (
    <div>
      <div className="page-header"><h1>My Profile</h1><p>Manage your account details</p></div>
      <div className="dash-grid-2">
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Personal Information</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700 }}>
              {user?.full_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <strong style={{ fontSize: 17 }}>{user?.full_name}</strong>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.role_name}</p>
            </div>
          </div>
          <form onSubmit={handleProfile}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-icon" style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-control" style={{ paddingLeft: 40 }} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-control" style={{ paddingLeft: 40 }} value={user?.email || ''} disabled />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-control" style={{ paddingLeft: 40 }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={15} /> {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Change Password</h3>
          <form onSubmit={handlePassword}>
            {[['Current Password', 'current_password'], ['New Password', 'new_password'], ['Confirm New Password', 'confirm']].map(([label, key]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input type="password" className="form-control" value={pwForm[key]} onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })} />
              </div>
            ))}
            <button type="submit" className="btn btn-secondary" disabled={pwLoading}>
              {pwLoading ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
