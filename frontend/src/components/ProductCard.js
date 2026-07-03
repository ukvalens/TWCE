import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { formatPrice, imgSrc } from '../utils/helpers';
import './ProductCard.css';

const ProductCard = ({ product, isFlash }) => {
  const { cart, addToCart } = useCart();
  const navigate = useNavigate();
  const image = imgSrc(product.primary_image || product.image || product.images?.[0]?.image_url)
    || 'https://placehold.co/300x220/edf2f7/64748b';

  const inCart = cart.find(i => i.product_id === product.product_id);
  const outOfStock = product.stock_quantity < 1;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addToCart(product, 1);
    toast.success(`${product.name} added to cart`, { duration: 1500 });
  };

  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addToCart(product, 1);
    navigate('/checkout');
  };

  return (
    <div className="product-card">
      {isFlash && <span className="flash-badge">⚡ Flash</span>}
      {outOfStock && <span className="sold-out-badge">Sold Out</span>}
      <Link to={`/products/${product.product_id}`} className="product-card-link">
        <div className="product-img" style={{ opacity: outOfStock ? 0.5 : 1 }}>
          <img src={image} alt={product.name} />
        </div>
        <div className="product-info">
          <p className="product-brand">{product.brand_name || product.category_name || ''}</p>
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
          {!outOfStock && product.stock_quantity <= 5 && (
            <p style={{ fontSize: 11, color: '#e63946', fontWeight: 600, marginTop: 4 }}>
              Only {product.stock_quantity} left!
            </p>
          )}
        </div>
      </Link>
      <div className="product-actions">
        <Link to={`/products/${product.product_id}`} className="btn btn-outline btn-sm">View</Link>
        {outOfStock ? (
          <button className="btn btn-sm" disabled style={{ background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }}>
            Out of Stock
          </button>
        ) : inCart ? (
          <button className="btn btn-sm btn-success" onClick={() => navigate('/checkout')}
            style={{ background: '#2A9D8F', color: '#fff', border: 'none' }}>
            <CheckCircle size={14} /> In Cart
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={handleAddToCart}>
            <ShoppingCart size={14} /> Add to Cart
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
