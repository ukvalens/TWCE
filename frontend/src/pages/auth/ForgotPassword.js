import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent if email exists');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><Monitor size={32} /><span>TWCE</span></div>
        <h2>Forgot Password</h2>
        <p className="auth-sub">Enter your email to receive a reset link</p>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: 'var(--success)', marginBottom: 16 }}>
              ✓ If that email is registered, a reset link has been sent.
            </p>
            <Link to="/login" className="btn btn-primary btn-full">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-icon">
                <Mail size={16} />
                <input
                  className="form-control"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="auth-footer"><Link to="/login" className="auth-link">← Back to Login</Link></p>
      </div>
    </div>
  );
};

export default ForgotPassword;
