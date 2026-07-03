import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, ArrowRight, Zap, Shield, Truck, Headphones, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatPrice, imgSrc } from '../utils/helpers';
import './Home.css';

const Home = () => {
  const [featured, setFeatured]     = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [flashSales, setFlashSales]   = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/products/featured'),
      api.get('/products/new-arrivals'),
      api.get('/promotions/flash-sales'),
      api.get('/products/meta/categories'),
    ]).then(([f, n, fs, c]) => {
      setFeatured(f.data.slice(0, 4));
      setNewArrivals(n.data.slice(0, 4));
      setFlashSales(fs.data.slice(0, 3));
      setCategories(c.data.slice(0, 6));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="home">
      {/* ── Hero ── */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-text">
            <span className="hero-badge">🔥 New Arrivals Just Dropped</span>
            <h1>The World of<br /><span>Computers &amp;</span><br />Electronics</h1>
            <p>Discover the latest laptops, smartphones, monitors and accessories at unbeatable prices. Fast delivery, genuine warranty.</p>
            <div className="hero-btns">
              <Link to="/products" className="btn btn-primary btn-lg">Shop Now <ArrowRight size={18} /></Link>
              <Link to="/deals"    className="btn btn-outline btn-lg" style={{color:'#fff',borderColor:'rgba(255,255,255,.5)'}}>View Deals</Link>
            </div>
          </div>
          <div className="hero-img">
            <img src="https://placehold.co/520x400/023E8A/ffffff?text=Latest+Tech" alt="hero" />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features">
        <div className="container features-grid">
          {[
            { icon: <Truck size={24} />,       title: 'Free Shipping',    desc: 'On orders over $100' },
            { icon: <Shield size={24} />,      title: 'Genuine Warranty', desc: 'All products verified' },
            { icon: <Zap size={24} />,         title: 'Flash Deals',      desc: 'Up to 40% off daily' },
            { icon: <Headphones size={24} />,  title: '24/7 Support',     desc: 'Always here for you' },
          ].map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <div><strong>{f.title}</strong><p>{f.desc}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Shop by Category</h2>
            <Link to="/categories" className="see-all">See all <ChevronRight size={16} /></Link>
          </div>
          <div className="categories-grid">
            {categories.map((c) => (
              <Link to={`/products?category=${c.category_id}`} key={c.category_id} className="category-card">
                <div className="category-icon">💻</div>
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Flash Sales ── */}
      {flashSales.length > 0 && (
        <section className="section flash-section">
          <div className="container">
            <div className="section-header">
              <h2>⚡ Flash Sales</h2>
              <Link to="/deals" className="see-all">See all <ChevronRight size={16} /></Link>
            </div>
            <div className="products-grid">
              {flashSales.map((fs) => (
                <ProductCard key={fs.flash_sale_id} product={{ ...fs, discount_price: fs.sale_price }} isFlash />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured ── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Featured Products</h2>
            <Link to="/products?featured=true" className="see-all">See all <ChevronRight size={16} /></Link>
          </div>
          {loading ? <div className="spinner" /> : (
            <div className="products-grid">
              {featured.map((p) => <ProductCard key={p.product_id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── New Arrivals ── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>New Arrivals</h2>
            <Link to="/new-arrivals" className="see-all">See all <ChevronRight size={16} /></Link>
          </div>
          {loading ? <div className="spinner" /> : (
            <div className="products-grid">
              {newArrivals.map((p) => <ProductCard key={p.product_id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── Banner ── */}
      <section className="promo-banner">
        <div className="container">
          <div className="banner-inner">
            <div>
              <h2>Get 15% off your first order</h2>
              <p>Use code <strong>TWCE2025</strong> at checkout</p>
            </div>
            <Link to="/register" className="btn btn-accent btn-lg">Get Started</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

const ProductCard = ({ product, isFlash }) => {
  const image = imgSrc(product.primary_image || product.image || product.images?.[0]?.image_url) || 'https://placehold.co/300x220/edf2f7/64748b';

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!localStorage.getItem('accessToken')) {
      toast.error('Please log in to add items to cart');
      return;
    }
    try {
      await api.post('/cart/items', { product_id: product.product_id, quantity: 1 });
      toast.success(`${product.name} added to cart`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    }
  };

  return (
    <div className="product-card">
      {isFlash && <span className="flash-badge">⚡ Flash</span>}
      <Link to={`/products/${product.product_id}`} className="product-card-link">
        <div className="product-img">
          <img src={image} alt={product.name} />
        </div>
        <div className="product-info">
          <p className="product-brand">{product.brand_name || product.name}</p>
          <h3 className="product-name">{product.name}</h3>
          <div className="product-rating">
            <Star size={13} fill="#f59e0b" stroke="none" />
            <span>{parseFloat(product.avg_rating || 0).toFixed(1)}</span>
          </div>
          <div className="product-price">
            <span className="price-current">
              {formatPrice(product.discount_price || product.sale_price || product.price)}
            </span>
            {(product.discount_price || product.sale_price) && (
              <span className="price-old">{formatPrice(product.price)}</span>
            )}
          </div>
        </div>
      </Link>
      <div className="product-actions">
        <Link to={`/products/${product.product_id}`} className="btn btn-outline btn-sm">View</Link>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleAddToCart}>
          <ShoppingCart size={14} /> Add to Cart
        </button>
      </div>
    </div>
  );
};

export default Home;
export { ProductCard };
