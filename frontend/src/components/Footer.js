import { Monitor, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="brand-logo"><Monitor size={24} /><span>TWCE</span></div>
          <p>The World of Computers &amp; Electronics — your trusted destination for the latest tech.</p>
          <div className="footer-socials">
            <a href="#!">f</a>
            <a href="#!">𝕏</a>
            <a href="#!">in</a>
            <a href="#!">▶</a>
          </div>
        </div>
        <div className="footer-col">
          <h4>Shop</h4>
          <Link to="/products">All Products</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/deals">Flash Deals</Link>
          <Link to="/new-arrivals">New Arrivals</Link>
          <Link to="/best-selling">Best Sellers</Link>
        </div>
        <div className="footer-col">
          <h4>Account</h4>
          <Link to="/register">Register</Link>
          <Link to="/login">Login</Link>
          <Link to="/dashboard">My Dashboard</Link>
          <Link to="/dashboard/orders">My Orders</Link>
          <Link to="/dashboard/wishlist">Wishlist</Link>
        </div>
        <div className="footer-col">
          <h4>Support</h4>
          <Link to="/faq">FAQ</Link>
          <Link to="/contact">Contact Us</Link>
          <Link to="/warranty">Warranty</Link>
          <Link to="/returns">Returns</Link>
          <div className="footer-contact">
            <span><Mail size={14} /> support@twce.com</span>
            <span><Phone size={14} /> +1 (800) 123-4567</span>
            <span><MapPin size={14} /> New York, USA</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} TWCE — The World of Computers &amp; Electronics. All rights reserved.</p>
        <div className="footer-bottom-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
