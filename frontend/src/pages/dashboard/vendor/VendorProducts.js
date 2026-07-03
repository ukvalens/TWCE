import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, X, Upload } from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice, formatDate, imgSrc, statusBadge } from '../../../utils/helpers';
import toast from 'react-hot-toast';

const emptySpecs = { processor: '', ram: '', storage: '', battery: '' };
const empty = {
  name: '', description: '', price: '', discount_price: '', stock_quantity: '',
  category_id: '', brand_id: '', condition: 'new', is_touchscreen: false, location: '',
};

const VendorProducts = () => {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState(empty);
  const [specs, setSpecs]           = useState(emptySpecs);
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [editing, setEditing]       = useState(null);
  const [saving, setSaving]         = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    Promise.all([
      api.get('/products?limit=100'),
      api.get('/products/meta/categories'),
      api.get('/products/meta/brands'),
    ]).then(([p, c, b]) => {
      setProducts(p.data.data || []);
      setCategories(c.data || []);
      setBrands(b.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setForm(empty); setSpecs(emptySpecs);
    setImageFile(null); setImagePreview('');
    setEditing(null); setModal(true);
  };

  const openEdit = (p) => {
    setForm({
      name: p.name, description: p.description || '', price: p.price,
      discount_price: p.discount_price || '', stock_quantity: p.stock_quantity,
      category_id: p.category_id, brand_id: p.brand_id || '',
      condition: p.condition || 'new',
      is_touchscreen: p.is_touchscreen || false,
      location: p.location || '',
    });
    setSpecs({ processor: p.processor || '', ram: p.ram || '', storage: p.storage || '', battery: p.battery || '' });
    setImageFile(null);
    setImagePreview(p.primary_image || '');
    setEditing(p.product_id);
    setModal(true);
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const buildDescription = () => {
    const lines = [];
    if (specs.processor)   lines.push(`🟢 Processor: ${specs.processor}`);
    if (specs.ram)         lines.push(`🟢 RAM: ${specs.ram}`);
    if (specs.storage)     lines.push(`🟢 Storage: ${specs.storage}`);
    if (form.is_touchscreen) lines.push(`🟢 Touchscreen & Full HD`);
    if (specs.battery)     lines.push(`🔋 Battery: ${specs.battery}`);
    if (form.description)  lines.push('', form.description);
    if (form.location)     lines.push('', `📍 ${form.location}`);
    return lines.join('\n');
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim())                              return toast.error('Product name is required');
    if (!form.price || isNaN(parseFloat(form.price)))   return toast.error('Valid price is required');
    if (!form.stock_quantity || isNaN(parseInt(form.stock_quantity))) return toast.error('Stock quantity is required');
    if (!form.category_id)                              return toast.error('Please select a category');

    setSaving(true);
    try {
      const payload = {
        ...form,
        description: buildDescription(),
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock_quantity),
        discount_price: form.discount_price ? parseFloat(form.discount_price) : null,
      };

      let productId;
      if (editing) {
        const { data } = await api.put(`/products/${editing}`, payload);
        setProducts(prev => prev.map(p => p.product_id === editing ? { ...p, ...data, primary_image: imagePreview || p.primary_image } : p));
        productId = editing;
        toast.success('Product updated');
      } else {
        const { data } = await api.post('/products', payload);
        productId = data.product_id;
        setProducts(prev => [{ ...data, primary_image: '' }, ...prev]);
        toast.success('Product added — pending admin approval');
      }

      // Upload image if selected
      if (imageFile && productId) {
        const fd = new FormData();
        fd.append('images', imageFile);
        const { data: imgs } = await api.post(`/products/${productId}/images`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = imgs[0]?.image_url;
        if (url) setProducts(prev => prev.map(p => p.product_id === productId ? { ...p, primary_image: url } : p));
      }

      setModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    setProducts(prev => prev.filter(p => p.product_id !== id));
    toast.success('Product deleted');
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSpec = (k, v) => setSpecs(s => ({ ...s, [k]: v }));

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div className="page-header">
        <div><h1>My Products</h1><p>Add, edit and manage your store products</p></div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Product</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Added</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr><td colSpan={6} className="empty-row">No products yet. Add your first product!</td></tr>
              )}
              {products.map(p => (
                <tr key={p.product_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.primary_image && (
                        <img src={imgSrc(p.primary_image)}
                          alt={p.name}
                          style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 6, flexShrink: 0, background: '#f8f9fa', border: '1px solid var(--border)' }}
                          onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.category_name || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {p.discount_price ? (
                      <div>
                        <strong style={{ color: '#2A9D8F' }}>{formatPrice(p.discount_price)}</strong>
                        <s style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>{formatPrice(p.price)}</s>
                      </div>
                    ) : <strong>{formatPrice(p.price)}</strong>}
                  </td>
                  <td><span style={{ color: p.stock_quantity < 5 ? '#e63946' : 'inherit', fontWeight: 600 }}>{p.stock_quantity}</span></td>
                  <td><span className={`badge badge-${statusBadge(p.status)}`}>{p.status}</span></td>
                  <td style={{ fontSize: 12 }}>{formatDate(p.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-xs btn-outline" onClick={() => openEdit(p)}><Pencil size={12} /></button>
                      <button className="btn btn-xs btn-danger" onClick={() => remove(p.product_id)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Product' : 'Add New Product'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={save} className="modal-form">

              {/* Image upload */}
              <div className="form-group">
                <label className="form-label">Product Image</label>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
                {imagePreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={imagePreview} alt="preview"
                      style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); }}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.55)', border: 'none',
                        borderRadius: '50%', width: 26, height: 26, color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button type="button" className="img-upload-btn" onClick={() => fileRef.current.click()}>
                    <Upload size={20} />
                    <span>Click to upload product image</span>
                  </button>
                )}
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-control" placeholder="e.g. HP EliteBook x360 830 G7" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>

              {/* Specs row */}
              <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>
                  Specifications
                </div>
                <div className="form-row-2">
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="form-label">🟢 Processor</label>
                    <input className="form-control" placeholder="e.g. i7 10th Gen" value={specs.processor} onChange={e => setSpec('processor', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="form-label">🟢 RAM</label>
                    <input className="form-control" placeholder="e.g. 32 GB DDR4" value={specs.ram} onChange={e => setSpec('ram', e.target.value)} />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="form-label">🟢 Storage</label>
                    <input className="form-control" placeholder="e.g. 1 TB SSD" value={specs.storage} onChange={e => setSpec('storage', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="form-label">🔋 Battery</label>
                    <input className="form-control" placeholder="e.g. Long-lasting performance" value={specs.battery} onChange={e => setSpec('battery', e.target.value)} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={form.is_touchscreen} onChange={e => set('is_touchscreen', e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: 'var(--primary)' }} />
                  🟢 Touchscreen &amp; Full HD display
                </label>
              </div>

              {/* Description / use case */}
              <div className="form-group">
                <label className="form-label">Description / Use Case</label>
                <textarea className="form-control" rows={2}
                  placeholder="e.g. 🚀 Perfect for business, multitasking & professionals"
                  value={form.description} onChange={e => set('description', e.target.value)} />
              </div>

              {/* Price + Discount */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Price (RWF) *</label>
                  <input className="form-control" type="number" min="0" placeholder="e.g. 850000"
                    value={form.price} onChange={e => set('price', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount Price (RWF)</label>
                  <input className="form-control" type="number" min="0" placeholder="Optional"
                    value={form.discount_price} onChange={e => set('discount_price', e.target.value)} />
                </div>
              </div>

              {/* Stock + Condition */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Stock Quantity *</label>
                  <input className="form-control" type="number" min="0" placeholder="e.g. 5"
                    value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Condition</label>
                  <select className="form-control" value={form.condition} onChange={e => set('condition', e.target.value)}>
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                  </select>
                </div>
              </div>

              {/* Category + Brand */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-control" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Brand</label>
                  <select className="form-control" value={form.brand_id} onChange={e => set('brand_id', e.target.value)}>
                    <option value="">Select brand</option>
                    {brands.map(b => <option key={b.brand_id} value={b.brand_id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Location */}
              <div className="form-group">
                <label className="form-label">📍 Shop Location</label>
                <input className="form-control" placeholder="e.g. Kigali – Makuza Peace Plaza, TCB Building, 1st Floor"
                  value={form.location} onChange={e => set('location', e.target.value)} />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorProducts;
