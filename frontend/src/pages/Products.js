import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';
import './Products.css';

const Products = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);

  useEffect(() => {
    const params = new URLSearchParams(Object.fromEntries(searchParams.entries()));
    params.set('page', page);
    params.set('limit', limit);

    setLoading(true);
    api.get(`/products?${params.toString()}`)
      .then((res) => {
        setProducts(res.data.data || []);
        setTotal(res.data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [searchParams, page, limit]);

  const category = searchParams.get('category');
  const featured = searchParams.get('featured');

  return (
    <div className="page products-page">
      <div className="page-header">
        <div>
          <h1>All Products</h1>
          <p>{featured ? 'Featured products' : category ? 'Filtered by category' : 'Browse all available products'}</p>
        </div>
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={16} />
          <span>Products</span>
        </div>
      </div>

      <div className="products-toolbar">
        <div>{loading ? 'Loading products…' : ''}</div>
        <div className="products-filter">
          <Link to="/products?featured=true" className="btn btn-outline btn-sm">Featured</Link>
          <Link to="/products?limit=20" className="btn btn-outline btn-sm">All</Link>
        </div>
      </div>

      {loading ? (
        <div className="page-empty">Loading products…</div>
      ) : products.length === 0 ? (
        <div className="page-empty">No products found.</div>
      ) : (
        <div className="products-grid">
          {products.map((product) => <ProductCard key={product.product_id} product={product} />)}
        </div>
      )}

      {total > limit && (
        <div className="pagination">
          <button className="btn btn-outline" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page === 1}>Prev</button>
          <span>Page {page}</span>
          <button className="btn btn-outline" onClick={() => setPage((prev) => prev + 1)} disabled={page * limit >= total}>Next</button>
        </div>
      )}
    </div>
  );
};

export default Products;
