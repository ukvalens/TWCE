import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Monitor, Mail, Lock, User, Phone, Eye, EyeOff, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import './Auth.css';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '', role_id: 3 });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.full_name.trim())        e.full_name = 'Full name is required';
    if (!form.email)                   e.email     = 'Email is required';
    if (form.password.length < 8)      e.password  = 'Password must be at least 8 characters';
    if (form.password !== form.confirm) e.confirm   = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role_id: parseInt(form.role_id, 10),
      };
      if (form.phone.trim()) payload.phone = form.phone.trim();

      await register(payload);
      toast.success('Account created! Please check your email to verify.');
      navigate('/login');
    } catch (err) {
      if (err.response?.data?.errors && typeof err.response.data.errors === 'object') {
        const fieldErrorMessages = Object.values(err.response.data.errors).join(', ');
        setErrors(err.response.data.errors);
        toast.error(fieldErrorMessages);
      } else {
        toast.error(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo"><Monitor size={32} /><span>TWCE</span></div>
        <h2>Create Account</h2>
        <p className="auth-sub">Join thousands of happy shoppers</p>

        <form onSubmit={handleSubmit}>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-icon">
                <User size={16} />
                <input className={`form-control ${errors.full_name?'error':''}`}
                  placeholder="John Doe" value={form.full_name}
                  onChange={e => set('full_name', e.target.value)} />
              </div>
              {errors.full_name && <p className="form-error">{errors.full_name}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <div className="input-icon">
                <Phone size={16} />
                <input className="form-control" placeholder="+1 234 567 8900"
                  value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-icon">
              <Mail size={16} />
              <input className={`form-control ${errors.email?'error':''}`}
                type="email" placeholder="you@example.com"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Account Type</label>
            <select className="form-control" value={form.role_id} onChange={e => set('role_id', e.target.value)}>
              <option value={3}>Customer — I want to shop</option>
              <option value={2}>Vendor   — I want to sell</option>
            </select>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-icon">
                <Lock size={16} />
                <input className={`form-control ${errors.password?'error':''}`}
                  type={showPw?'text':'password'} placeholder="Min. 8 characters"
                  value={form.password} onChange={e => set('password', e.target.value)} />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-icon">
                <Lock size={16} />
                <input className={`form-control ${errors.confirm?'error':''}`}
                  type={showPw?'text':'password'} placeholder="Re-enter password"
                  value={form.confirm} onChange={e => set('confirm', e.target.value)} />
              </div>
              {errors.confirm && <p className="form-error">{errors.confirm}</p>}
            </div>
          </div>

          <label className="checkbox-label mb-3">
            <input type="checkbox" required /> I agree to the <Link to="/terms" className="auth-link">Terms of Service</Link> and <Link to="/privacy" className="auth-link">Privacy Policy</Link>
          </label>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Creating account…' : <><UserPlus size={18} /> Create Account</>}
          </button>
        </form>

        <p className="auth-footer">Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
      </div>
    </div>
  );
};

export default Register;
