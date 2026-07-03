import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Bell, User, LogOut, Monitor, Menu, X } from 'lucide-react';
import { useState } from 'react';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cartCount }    = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <Monitor size={26} />
          <span>TWCE</span>
        </Link>

        <button className="navbar-toggle" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className={`navbar-links ${open ? 'open' : ''}`}>
          <Link to="/products">Products</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/deals">Deals</Link>
          <Link to="/about">About</Link>
        </div>

        <div className={`navbar-actions ${open ? 'open' : ''}`}>
          {/* Cart icon — visible to guests & logged-in users */}
          <Link to="/checkout" className="icon-btn" style={{ position: 'relative' }}>
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: '#e63946', color: '#fff',
                borderRadius: '50%', width: 18, height: 18,
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{cartCount}</span>
            )}
          </Link>

          {user ? (
            <>
              <Link to="/notifications" className="icon-btn"><Bell size={20} /></Link>
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                <User size={15} /> Dashboard
              </Link>
              <button onClick={handleLogout} className="icon-btn text-danger">
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    className="btn btn-outline btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
