import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatPrice, imgSrc } from '../utils/helpers';
import './ProductDetails.css';

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
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

  if (loading) return <div className="page page-empty">Loading product…</div>;
  if (!product) return <div className="page page-empty">Product not found.</div>;

  return (
    <div className="page product-details-page">
      <div className="page-header">
        <div>
          <h1>{product.name}</h1>
          <p>{product.category_name || 'Product details'}</p>
        </div>
        <Link to="/products" className="btn btn-outline btn-sm">
          <ArrowLeft size={14} /> Back to products
        </Link>
      </div>

      <div className="details-grid">
        <div className="details-image">
          <img src={imgSrc(product.primary_image || product.images?.[0]?.image_url) || 'https://placehold.co/500x400/edf2f7/64748b'} alt={product.name} />
        </div>
        <div className="details-info">
          <div className="product-price-row">
            <div>
              <span className="price-current">{formatPrice(product.discount_price || product.price)}</span>
              {product.discount_price && <span className="price-old">{formatPrice(product.price)}</span>}
            </div>
          </div>

          <p className="details-description">{product.description || 'No product description available.'}</p>
          <div className="details-meta">
            <div><strong>Brand:</strong> {product.brand_name || 'Unknown'}</div>
            <div><strong>Vendor:</strong> {product.vendor_name || 'Unknown'}</div>
            <div><strong>Stock:</strong> {product.stock_quantity ?? 'N/A'}</div>
            <div><strong>Status:</strong> {product.status}</div>
          </div>
          <button type="button" className="btn btn-primary" onClick={handleAddToCart}>
            <ShoppingCart size={16} /> Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
