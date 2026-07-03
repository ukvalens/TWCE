import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Monitor, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fill = (email) => setForm({ email, password: 'Password123!' });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><Monitor size={32} /><span>TWCE</span></div>
        <h2>Welcome Back</h2>
        <p className="auth-sub">Sign in to your account</p>

        {/* Quick fill for testing */}
        <div className="quick-fill">
          <span>Quick login:</span>
          {[['admin@twce.com','Admin'],['carol@twce.com','Customer'],['alice@twce.com','Vendor'],['frank@twce.com','Delivery']].map(([e,l])=>(
            <button key={e} type="button" onClick={()=>fill(e)} className="qf-btn">{l}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-icon">
              <Mail size={16} />
              <input className={`form-control ${errors.email ? 'error' : ''}`}
                type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-icon">
              <Lock size={16} />
              <input className={`form-control ${errors.password ? 'error' : ''}`}
                type={showPw ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>

          <div className="auth-row">
            <label className="checkbox-label"><input type="checkbox" /> Remember me</label>
            <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Signing in…' : <><LogIn size={18} /> Sign In</>}
          </button>
        </form>

        <p className="auth-footer">Don't have an account? <Link to="/register" className="auth-link">Register</Link></p>
      </div>
    </div>
  );
};

export default Login;
