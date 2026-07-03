import { useEffect, useState, useCallback } from 'react';
import { Heart, Trash2, ShoppingCart, Eye, Search, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { formatPrice, imgSrc } from '../../utils/helpers';
import toast from 'react-hot-toast';

// ─── Stock badge ───────────────────────────────────────────────────────────────
const StockBadge = ({ qty, status }) => {
  if (status !== 'active' || qty <= 0)
    return <span style={{ fontSize: 11, fontWeight: 700, color: '#e63946' }}>Out of Stock</span>;
  if (qty <= 5)
    return <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>Only {qty} left</span>;
  return <span style={{ fontSize: 11, fontWeight: 700, color: '#2A9D8F' }}>In Stock</span>;
};

// ─── Single Wishlist Card ──────────────────────────────────────────────────────
const WishlistCard = ({ item, onRemove, onAddToCart, adding }) => {
  const available = item.status === 'active' && item.stock_quantity > 0;
  const price     = parseFloat(item.discount_price || item.price);

  return (
    <div className="card" style={{
      padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      opacity: available ? 1 : 0.75,
      transition: 'box-shadow .15s, transform .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 190, background: '#f8f9fa', overflow: 'hidden' }}>
        <Link to={`/products/${item.product_id}`}>
          <img
            src={imgSrc(item.image) || 'https://placehold.co/300x190/f1f3f5/999'}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }}
            onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x190/f1f3f5/999'; }}
          />
        </Link>
        {/* Unavailable overlay */}
        {!available && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              background: '#e63946', color: '#fff', fontSize: 12, fontWeight: 700,
              padding: '4px 12px', borderRadius: 20,
            }}>
              {item.status !== 'active' ? 'Unavailable' : 'Out of Stock'}
            </span>
          </div>
        )}
        {/* Remove button */}
        <button
          onClick={() => onRemove(item.product_id)}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#e63946',
            boxShadow: '0 2px 6px rgba(0,0,0,.15)',
          }}
          title="Remove from wishlist"
        >
          <Heart size={14} fill="#e63946" />
        </button>
        {/* Discount badge */}
        {item.discount_price && (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            background: '#e63946', color: '#fff',
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
          }}>
            -{Math.round((1 - item.discount_price / item.price) * 100)}%
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Category / Brand */}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
          {item.brand_name || item.category_name || ''}
        </div>

        {/* Name */}
        <div style={{
          fontWeight: 700, fontSize: 14, lineHeight: 1.4,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {item.name}
        </div>

        {/* Vendor */}
        {item.vendor_name && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            by {item.vendor_name}
          </div>
        )}

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 16 }}>
            {formatPrice(price)}
          </span>
          {item.discount_price && (
            <s style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatPrice(item.price)}</s>
          )}
        </div>

        {/* Stock */}
        <StockBadge qty={item.stock_quantity} status={item.status} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
          <Link
            to={`/products/${item.product_id}`}
            className="btn btn-outline btn-sm"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Eye size={13} /> View
          </Link>
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1, justifyContent: 'center' }}
            disabled={!available || adding === item.product_id}
            onClick={() => onAddToCart(item.product_id)}
            title={!available ? 'Not available' : 'Add to cart'}
          >
            <ShoppingCart size={13} />
            {adding === item.product_id ? '…' : 'Add'}
          </button>
          <button
            className="btn btn-sm"
            style={{ background: '#fde8ea', color: '#e63946', border: 'none', padding: '7px 10px' }}
            onClick={() => onRemove(item.product_id)}
            title="Remove"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const Wishlist = () => {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all'); // all | available | unavailable
  const [adding,   setAdding]   = useState(null);  // productId being added
  const [bulkBusy, setBulkBusy] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/cart/wishlist');
      setItems(data || []);
    } catch { toast.error('Failed to load wishlist'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (productId) => {
    try {
      await api.delete(`/cart/wishlist/${productId}`);
      setItems(prev => prev.filter(i => i.product_id !== productId));
      toast.success('Removed from wishlist');
    } catch { toast.error('Failed to remove'); }
  };

  const addToCart = async (productId) => {
    setAdding(productId);
    try {
      await api.post('/cart/items', { product_id: productId, quantity: 1 });
      toast.success('Added to cart!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    } finally { setAdding(null); }
  };

  const moveToCart = async (productId) => {
    setAdding(productId);
    try {
      await api.post('/cart/items', { product_id: productId, quantity: 1 });
      await api.delete(`/cart/wishlist/${productId}`);
      setItems(prev => prev.filter(i => i.product_id !== productId));
      toast.success('Moved to cart!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to move to cart');
    } finally { setAdding(null); }
  };

  const addAllToCart = async () => {
    const available = items.filter(i => i.status === 'active' && i.stock_quantity > 0);
    if (!available.length) return toast.error('No available items to add');
    setBulkBusy(true);
    let added = 0;
    for (const item of available) {
      try {
        await api.post('/cart/items', { product_id: item.product_id, quantity: 1 });
        added++;
      } catch { /* skip unavailable */ }
    }
    toast.success(`${added} item${added !== 1 ? 's' : ''} added to cart`);
    setBulkBusy(false);
  };

  // Filter + search
  const displayed = items.filter(item => {
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.brand_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.category_name || '').toLowerCase().includes(search.toLowerCase());
    const isAvailable = item.status === 'active' && item.stock_quantity > 0;
    const matchFilter =
      filter === 'all'         ? true :
      filter === 'available'   ? isAvailable :
      filter === 'unavailable' ? !isAvailable : true;
    return matchSearch && matchFilter;
  });

  const availableCount   = items.filter(i => i.status === 'active' && i.stock_quantity > 0).length;
  const unavailableCount = items.length - availableCount;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>My Wishlist</h1>
          <p>{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
        </div>
        {items.length > 0 && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={addAllToCart}
              disabled={bulkBusy || availableCount === 0}
            >
              <ShoppingBag size={15} />
              {bulkBusy ? 'Adding…' : `Add All to Cart (${availableCount})`}
            </button>
            <Link to="/products" className="btn btn-primary btn-sm">
              Browse More
            </Link>
          </div>
        )}
      </div>

      {/* Stats row */}
      {items.length > 0 && (
        <div className="stats-row" style={{ marginBottom: 20 }}>
          {[
            { key: 'all',         label: 'Total Saved',   value: items.length,        color: '#e8f4fd', ic: '#0077B6' },
            { key: 'available',   label: 'Available',     value: availableCount,       color: '#e8fdf6', ic: '#2A9D8F' },
            { key: 'unavailable', label: 'Out of Stock',  value: unavailableCount,     color: '#fde8ea', ic: '#e63946' },
          ].map(s => (
            <div
              key={s.key}
              className="stat-card"
              style={{ cursor: 'pointer', outline: filter === s.key ? `2px solid ${s.ic}` : 'none' }}
              onClick={() => setFilter(s.key)}
            >
              <div className="stat-icon" style={{ background: s.color, color: s.ic }}>
                <Heart size={20} />
              </div>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filter */}
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{
              position: 'absolute', left: 11, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-muted)',
            }} />
            <input
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="Search wishlist…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-tabs" style={{ margin: 0 }}>
            {[
              { key: 'all',         label: 'All',          count: items.length },
              { key: 'available',   label: 'Available',    count: availableCount },
              { key: 'unavailable', label: 'Out of Stock', count: unavailableCount },
            ].map(f => (
              <button
                key={f.key}
                className={`filter-tab ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="tab-count">{f.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? <div className="spinner" /> : items.length === 0 ? (
        /* Empty state */
        <div className="card" style={{ textAlign: 'center', padding: '70px 24px' }}>
          <Heart
            size={56}
            color="var(--text-muted)"
            style={{ margin: '0 auto 16px', opacity: 0.25, display: 'block' }}
          />
          <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Your wishlist is empty</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
            Save products you love and come back to them any time.
          </p>
          <Link to="/products" className="btn btn-primary">
            <ShoppingCart size={15} /> Browse Products
          </Link>
        </div>
      ) : displayed.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            No items match your search or filter.
          </p>
          <button
            className="btn btn-outline btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => { setSearch(''); setFilter('all'); }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Out-of-stock notice */}
          {unavailableCount > 0 && filter === 'all' && (
            <div style={{
              marginBottom: 16, padding: '10px 16px', borderRadius: 8,
              background: '#fff3e0', borderLeft: '4px solid #f59e0b',
              fontSize: 13, color: '#92400e',
            }}>
              <strong>{unavailableCount}</strong> item{unavailableCount !== 1 ? 's are' : ' is'} currently out of stock or unavailable.
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 18,
          }}>
            {displayed.map(item => (
              <WishlistCard
                key={item.wishlist_item_id}
                item={item}
                onRemove={remove}
                onAddToCart={addToCart}
                adding={adding}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Wishlist;
