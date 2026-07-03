import { useEffect, useState, useCallback } from 'react';
import { PackagePlus, History, X, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../../utils/api';
import { formatDate } from '../../../utils/helpers';
import toast from 'react-hot-toast';

const CHANGE_TYPES = ['restock', 'adjustment', 'correction', 'return'];

const badge = (qty) => {
  if (qty > 0) return { color: '#2A9D8F', icon: <TrendingUp size={13} /> };
  return { color: '#e63946', icon: <TrendingDown size={13} /> };
};

const AdjustModal = ({ product, onClose, onDone }) => {
  const [form, setForm] = useState({ change_type: 'restock', quantity_change: '', note: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const qty = parseInt(form.quantity_change);
    if (!qty) return toast.error('Enter a non-zero quantity');
    setSaving(true);
    try {
      await api.post(`/products/${product.product_id}/stock`, { ...form, quantity_change: qty });
      toast.success('Stock updated');
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Adjust Stock — {product.name}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="modal-form">
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
            Current stock: <strong style={{ fontSize: 16 }}>{product.stock_quantity}</strong>
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-control" value={form.change_type} onChange={e => setForm(f => ({ ...f, change_type: e.target.value }))}>
              {CHANGE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Quantity Change <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(use negative to reduce)</span></label>
            <input className="form-control" type="number" placeholder="e.g. 10 or -3"
              value={form.quantity_change} onChange={e => setForm(f => ({ ...f, quantity_change: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input className="form-control" placeholder="e.g. Received new shipment"
              value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Update Stock'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const HistoryModal = ({ product, onClose }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/products/${product.product_id}/stock?limit=50`)
      .then(r => setRows(r.data.data || []))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, [product.product_id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Stock History — {product.name}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '0 22px 22px' }}>
          {loading ? <div className="spinner" /> : rows.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No history yet</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Date</th><th>Type</th><th>Change</th><th>Before</th><th>After</th><th>By</th><th>Note</th></tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const b = badge(r.quantity_change);
                    return (
                      <tr key={r.history_id}>
                        <td style={{ fontSize: 12 }}>{formatDate(r.created_at)}</td>
                        <td><span style={{ textTransform: 'capitalize', fontSize: 12 }}>{r.change_type}</span></td>
                        <td>
                          <span style={{ color: b.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {b.icon}{r.quantity_change > 0 ? `+${r.quantity_change}` : r.quantity_change}
                          </span>
                        </td>
                        <td>{r.quantity_before}</td>
                        <td><strong>{r.quantity_after}</strong></td>
                        <td style={{ fontSize: 12 }}>{r.changed_by_name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.note || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const VendorStock = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/products?limit=100&status=all')
      .then(r => setProducts(r.data.data || []))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div className="page-header">
        <div><h1>Stock Management</h1><p>Monitor and adjust inventory for your products</p></div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Product</th><th>Category</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr><td colSpan={5} className="empty-row">No products found</td></tr>
              )}
              {products.map(p => (
                <tr key={p.product_id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.category_name || '—'}</td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      color: p.stock_quantity === 0 ? '#e63946' : p.stock_quantity <= 5 ? '#f4a261' : '#2A9D8F'
                    }}>
                      {p.stock_quantity}
                      {p.stock_quantity === 0 && <span style={{ fontSize: 11, marginLeft: 6, background: '#fde8ea', color: '#e63946', borderRadius: 4, padding: '1px 6px' }}>Out of stock</span>}
                      {p.stock_quantity > 0 && p.stock_quantity <= 5 && <span style={{ fontSize: 11, marginLeft: 6, background: '#fff3cd', color: '#856404', borderRadius: 4, padding: '1px 6px' }}>Low</span>}
                    </span>
                  </td>
                  <td><span className={`badge badge-${p.status === 'active' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}`}>{p.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-xs btn-primary" onClick={() => setAdjusting(p)} title="Adjust stock">
                        <PackagePlus size={13} />
                      </button>
                      <button className="btn btn-xs btn-outline" onClick={() => setViewing(p)} title="View history">
                        <History size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {adjusting && <AdjustModal product={adjusting} onClose={() => setAdjusting(null)} onDone={load} />}
      {viewing  && <HistoryModal product={viewing}  onClose={() => setViewing(null)} />}
    </div>
  );
};

export default VendorStock;
