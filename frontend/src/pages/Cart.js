import { useNavigate, Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice, imgSrc } from '../utils/helpers';
import toast from 'react-hot-toast';

const Cart = () => {
  const { cart, cartTotal, cartCount, changeQty, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please log in to proceed to checkout');
      navigate('/login');
      return;
    }
    navigate('/checkout');
  };

  if (cart.length === 0) {
    return (
      <div className="page" style={{ maxWidth: 600, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <ShoppingCart size={64} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: 20 }} />
        <h2 style={{ marginBottom: 8 }}>Your cart is empty</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Browse our products and add items to get started.</p>
        <Link to="/products" className="btn btn-primary">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Shopping Cart</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>{cartCount} item{cartCount !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/products" className="btn btn-outline btn-sm"><ArrowLeft size={14} /> Continue Shopping</Link>
          <button className="btn btn-sm" style={{ background: '#fde8ea', color: '#e63946', border: 'none' }} onClick={() => { clearCart(); toast.success('Cart cleared'); }}>
            <Trash2 size={14} /> Clear Cart
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Cart Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {cart.map(item => {
            const price = parseFloat(item.discount_price || item.price);
            return (
              <div key={item.product_id} style={{
                background: 'var(--white)', borderRadius: 12, padding: '16px 20px',
                boxShadow: 'var(--shadow)', display: 'flex', gap: 16, alignItems: 'center'
              }}>
                {/* Image */}
                <Link to={`/products/${item.product_id}`}>
                  <img
                    src={imgSrc(item.primary_image || item.image || item.images?.[0]?.image_url) || 'https://placehold.co/80x80/edf2f7/999'}
                    alt={item.name}
                    style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8, background: '#f8f9fa', border: '1px solid var(--border)', flexShrink: 0 }}
                    onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/80x80/edf2f7/999'; }}
                  />
                </Link>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/products/${item.product_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 16 }}>{formatPrice(price)}</span>
                    {item.discount_price && <s style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatPrice(item.price)}</s>}
                  </div>
                  {item.brand_name && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.brand_name}</div>}
                </div>

                {/* Qty controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-sm btn-outline" style={{ padding: '4px 8px' }} onClick={() => changeQty(item.product_id, -1)}><Minus size={13} /></button>
                  <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center', fontSize: 15 }}>{item.qty}</span>
                  <button className="btn btn-sm btn-outline" style={{ padding: '4px 8px' }} onClick={() => changeQty(item.product_id, 1)}><Plus size={13} /></button>
                </div>

                {/* Line total */}
                <div style={{ fontWeight: 800, fontSize: 15, minWidth: 90, textAlign: 'right', flexShrink: 0 }}>
                  {formatPrice(price * item.qty)}
                </div>

                {/* Remove */}
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e63946', padding: 4, flexShrink: 0 }}
                  onClick={() => { removeFromCart(item.product_id); toast.success('Item removed'); }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div style={{ background: 'var(--white)', borderRadius: 12, padding: '24px', boxShadow: 'var(--shadow)', position: 'sticky', top: 90 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 18 }}>Order Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cart.map(item => (
              <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{item.name} × {item.qty}</span>
                <span style={{ fontWeight: 600, flexShrink: 0 }}>{formatPrice(parseFloat(item.discount_price || item.price) * item.qty)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 17, marginBottom: 20 }}>
            <span>Subtotal</span>
            <span style={{ color: 'var(--primary)' }}>{formatPrice(cartTotal)}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Shipping and taxes calculated at checkout.
          </p>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '12px' }} onClick={handleCheckout}>
            Proceed to Checkout <ArrowRight size={16} />
          </button>
          {!user && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
              <Link to="/login" style={{ color: 'var(--primary)' }}>Sign in</Link> to checkout
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;
