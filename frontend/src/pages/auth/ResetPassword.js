import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Monitor, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import './Auth.css';

const ResetPassword = () => {
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const token                   = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    if (!token) return toast.error('Invalid or missing reset token');

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><Monitor size={32} /><span>TWCE</span></div>
        <h2>Reset Password</h2>
        <p className="auth-sub">Enter your new password below</p>

        {!token ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: 'var(--error)', marginBottom: 16 }}>Invalid or missing reset token.</p>
            <Link to="/forgot-password" className="btn btn-primary btn-full">Request New Link</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-icon">
                <Lock size={16} />
                <input
                  className="form-control"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-icon">
                <Lock size={16} />
                <input
                  className="form-control"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="auth-footer"><Link to="/login" className="auth-link">← Back to Login</Link></p>
      </div>
    </div>
  );
};

export default ResetPassword;
