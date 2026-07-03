import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Search, Plus, Pencil, Trash2, X, Tag, Layers, Upload, PackagePlus, History, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice, formatDate, imgSrc, statusBadge } from '../../../utils/helpers';
import { Pagination } from './AdminUsers';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────
const EMPTY_PRODUCT = { name: '', description: '', price: '', discount_price: '', stock_quantity: '', category_id: '', brand_id: '', status: 'active', condition: 'new', is_touchscreen: false, location: '' };
const EMPTY_SPECS   = { processor: '', ram: '', storage: '', battery: '' };
const EMPTY_META    = { name: '', description: '', image_url: '', logo_url: '' };

// ─── Modal ────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
        <strong style={{ fontSize: 16 }}>{title}</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
      </div>
      <div style={{ padding: 22 }}>{children}</div>
    </div>
  </div>
);

// ─── Product Form (vendor-style) ──────────────────────────
const ProductForm = ({ initial, initialSpecs, initialImage, categories, brands, onSave, onClose }) => {
  const [form, setForm]         = useState(initial);
  const [specs, setSpecs]       = useState(initialSpecs || EMPTY_SPECS);
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState(initialImage || '');
  const [saving, setSaving]     = useState(false);
  const fileRef = useRef();
  const set     = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSpec = (k, v) => setSpecs(s => ({ ...s, [k]: v }));

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const buildDescription = () => {
    const lines = [];
    if (specs.processor)     lines.push(`🟢 Processor: ${specs.processor}`);
    if (specs.ram)           lines.push(`🟢 RAM: ${specs.ram}`);
    if (specs.storage)       lines.push(`🟢 Storage: ${specs.storage}`);
    if (form.is_touchscreen) lines.push(`🟢 Touchscreen & Full HD`);
    if (specs.battery)       lines.push(`🔋 Battery: ${specs.battery}`);
    if (form.description)    lines.push('', form.description);
    if (form.location)       lines.push('', `📍 ${form.location}`);
    return lines.join('\n');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())   return toast.error('Product name is required');
    if (!form.price)         return toast.error('Price is required');
    if (!form.stock_quantity) return toast.error('Stock quantity is required');
    if (!form.category_id)   return toast.error('Please select a category');
    setSaving(true);
    try {
      await onSave(form, specs, imageFile, buildDescription);
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="modal-form">
      {/* Image */}
      <div className="form-group">
        <label className="form-label">Product Image</label>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
        {imagePreview ? (
          <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} />
            <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); }}
              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%', width: 26, height: 26, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <button type="button" className="img-upload-btn" onClick={() => fileRef.current.click()}>
            <Upload size={20} /><span>Click to upload product image</span>
          </button>
        )}
      </div>

      {/* Name */}
      <div className="form-group">
        <label className="form-label">Product Name *</label>
        <input className="form-control" placeholder="e.g. Dell XPS 15" value={form.name} onChange={e => set('name', e.target.value)} />
      </div>

      {/* Specs */}
      <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>Specifications</div>
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
            <input className="form-control" placeholder="e.g. Long-lasting" value={specs.battery} onChange={e => setSpec('battery', e.target.value)} />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={form.is_touchscreen} onChange={e => set('is_touchscreen', e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--primary)' }} />
          🟢 Touchscreen &amp; Full HD display
        </label>
      </div>

      {/* Description */}
      <div className="form-group">
        <label className="form-label">Description / Use Case</label>
        <textarea className="form-control" rows={2} placeholder="e.g. Perfect for business & professionals"
          value={form.description} onChange={e => set('description', e.target.value)} />
      </div>

      {/* Price */}
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label">Price (RWF) *</label>
          <input className="form-control" type="number" min="0" placeholder="e.g. 850000" value={form.price} onChange={e => set('price', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Discount Price (RWF)</label>
          <input className="form-control" type="number" min="0" placeholder="Optional" value={form.discount_price} onChange={e => set('discount_price', e.target.value)} />
        </div>
      </div>

      {/* Stock + Condition */}
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label">Stock Quantity *</label>
          <input className="form-control" type="number" min="0" placeholder="e.g. 5" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} />
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
            <option value="">— Select —</option>
            {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Brand</label>
          <select className="form-control" value={form.brand_id} onChange={e => set('brand_id', e.target.value)}>
            <option value="">— None —</option>
            {brands.map(b => <option key={b.brand_id} value={b.brand_id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Status (admin-only) */}
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Location */}
      <div className="form-group">
        <label className="form-label">📍 Shop Location</label>
        <input className="form-control" placeholder="e.g. Kigali – Makuza Peace Plaza" value={form.location} onChange={e => set('location', e.target.value)} />
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Product'}</button>
      </div>
    </form>
  );
};

// ─── Meta Form (Category / Brand) ────────────────────────
const MetaForm = ({ type, initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || EMPTY_META);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Name is required');
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit}>
      <div className="form-group">
        <label className="form-label">Name *</label>
        <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">{type === 'brand' ? 'Logo URL' : 'Image URL'}</label>
        <input className="form-control" value={type === 'brand' ? form.logo_url : form.image_url}
          onChange={e => set(type === 'brand' ? 'logo_url' : 'image_url', e.target.value)} placeholder="https://…" />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
};

// ─── Categories Tab ───────────────────────────────────────
const CategoriesTab = () => {
  const [items, setItems]   = useState([]);
  const [modal, setModal]   = useState(null); // null | { mode:'create'|'edit', data }

  const load = useCallback(async () => {
    const { data } = await api.get('/products/meta/categories');
    setItems(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (form) => {
    if (modal.mode === 'edit') await api.put(`/products/meta/categories/${modal.data.category_id}`, form);
    else await api.post('/products/meta/categories', form);
    toast.success('Category saved');
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try { await api.delete(`/products/meta/categories/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Cannot delete — may have linked products'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'create', data: EMPTY_META })}>
          <Plus size={14} /> Add Category
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Description</th><th style={{ width: 80 }}>Actions</th></tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No categories</td></tr>}
            {items.map(c => (
              <tr key={c.category_id}>
                <td><strong>{c.name}</strong></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.description || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm" style={{ background: '#e8f0fe', color: '#3b6fd4', border: 'none' }}
                      onClick={() => setModal({ mode: 'edit', data: c })}><Pencil size={13} /></button>
                    <button className="btn btn-sm" style={{ background: '#fde8ea', color: '#E63946', border: 'none' }}
                      onClick={() => remove(c.category_id)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit Category' : 'New Category'} onClose={() => setModal(null)}>
          <MetaForm type="category" initial={modal.data} onSave={save} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
};

// ─── Brands Tab ───────────────────────────────────────────
const BrandsTab = () => {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get('/products/meta/brands');
    setItems(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (form) => {
    if (modal.mode === 'edit') await api.put(`/products/meta/brands/${modal.data.brand_id}`, form);
    else await api.post('/products/meta/brands', form);
    toast.success('Brand saved');
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this brand?')) return;
    try { await api.delete(`/products/meta/brands/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Cannot delete — may have linked products'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'create', data: EMPTY_META })}>
          <Plus size={14} /> Add Brand
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Logo</th><th>Name</th><th>Description</th><th style={{ width: 80 }}>Actions</th></tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No brands</td></tr>}
            {items.map(b => (
              <tr key={b.brand_id}>
                <td><img src={b.logo_url || 'https://placehold.co/36x36?text=B'} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4 }} /></td>
                <td><strong>{b.name}</strong></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{b.description || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm" style={{ background: '#e8f0fe', color: '#3b6fd4', border: 'none' }}
                      onClick={() => setModal({ mode: 'edit', data: b })}><Pencil size={13} /></button>
                    <button className="btn btn-sm" style={{ background: '#fde8ea', color: '#E63946', border: 'none' }}
                      onClick={() => remove(b.brand_id)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit Brand' : 'New Brand'} onClose={() => setModal(null)}>
          <MetaForm type="brand" initial={modal.data} onSave={save} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
};

// ─── Products Tab ─────────────────────────────────────────
const ProductsTab = ({ categories, brands }) => {
  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | { mode, data }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.append('search', search);
      params.append('status', status || 'all');
      const { data } = await api.get(`/products?${params}`);
      setProducts(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const saveProduct = async (form, specs, imageFile, buildDescription) => {
    const payload = {
      ...form,
      description: buildDescription(),
      price: parseFloat(form.price),
      discount_price: form.discount_price ? parseFloat(form.discount_price) : null,
      stock_quantity: parseInt(form.stock_quantity),
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
    };
    let productId;
    if (modal.mode === 'edit') {
      await api.put(`/products/${modal.data.product_id}`, payload);
      productId = modal.data.product_id;
      toast.success('Product updated');
    } else {
      const { data } = await api.post('/products', payload);
      productId = data.product_id;
      toast.success('Product created');
    }
    if (imageFile && productId) {
      const fd = new FormData();
      fd.append('images', imageFile);
      await api.post(`/products/${productId}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    load();
  };

  const approve = async (id, newStatus) => {
    try { await api.put(`/products/${id}/approve`, { status: newStatus }); toast.success(`Product ${newStatus}`); load(); }
    catch { toast.error('Failed'); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete product'); }
  };

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: 34 }} placeholder="Search products…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" style={{ width: 160 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'create', data: { ...EMPTY_PRODUCT }, specs: EMPTY_SPECS, image: '' })}>
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>{total} products found</div>
        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>Vendor</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {products.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No products found</td></tr>}
                {products.map(p => (
                  <tr key={p.product_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={imgSrc(p.primary_image) || 'https://placehold.co/40x40?text=P'} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                      </div>
                    </td>
                    <td>{p.vendor_name || '—'}</td>
                    <td>{p.category_name || '—'}</td>
                    <td><strong>{formatPrice(p.discount_price || p.price)}</strong></td>
                    <td>{p.stock_quantity}</td>
                    <td><span className={`badge badge-${statusBadge(p.status)}`}>{p.status}</span></td>
                    <td>{formatDate(p.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {p.status !== 'active'   && <button className="btn btn-sm" style={{ background: '#e8fdf6', color: '#2A9D8F', border: 'none' }} title="Approve" onClick={() => approve(p.product_id, 'active')}><CheckCircle size={13} /></button>}
                        {p.status !== 'rejected' && <button className="btn btn-sm" style={{ background: '#fff3cd', color: '#856404', border: 'none' }} title="Reject"  onClick={() => approve(p.product_id, 'rejected')}><XCircle size={13} /></button>}
                        <button className="btn btn-sm" style={{ background: '#e8f0fe', color: '#3b6fd4', border: 'none' }} title="Edit"
                          onClick={() => setModal({ mode: 'edit', data: { ...EMPTY_PRODUCT, ...p, category_id: p.category_id || '', brand_id: p.brand_id || '', discount_price: p.discount_price || '', condition: p.condition || 'new', is_touchscreen: p.is_touchscreen || false, location: p.location || '' }, specs: { processor: p.processor || '', ram: p.ram || '', storage: p.storage || '', battery: p.battery || '' }, image: p.primary_image || '' })}>
                          <Pencil size={13} />
                        </button>
                        <button className="btn btn-sm" style={{ background: '#fde8ea', color: '#E63946', border: 'none' }} title="Delete"
                          onClick={() => remove(p.product_id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} limit={10} onPage={setPage} />
      </div>

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit Product' : 'New Product'} onClose={() => setModal(null)}>
          <ProductForm initial={modal.data} initialSpecs={modal.specs} initialImage={modal.image} categories={categories} brands={brands} onSave={saveProduct} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
};

// ─── Stock Tab ────────────────────────────────────────────
const CHANGE_TYPES = ['restock', 'adjustment', 'correction', 'return'];

const stockColor = (qty) => qty === 0 ? '#e63946' : qty <= 5 ? '#f4a261' : '#2A9D8F';
const changeBadge = (qty) => qty > 0
  ? { color: '#2A9D8F', icon: <TrendingUp size={13} /> }
  : { color: '#e63946', icon: <TrendingDown size={13} /> };

const StockAdjustModal = ({ product, onClose, onDone }) => {
  const [form, setForm] = useState({ change_type: 'restock', quantity_change: '', note: '' });
  const [saving, setSaving] = useState(false);
  const qty = parseInt(form.quantity_change) || 0;
  const preview = Math.max(0, product.stock_quantity + qty);

  const submit = async (e) => {
    e.preventDefault();
    if (!qty) return toast.error('Enter a non-zero quantity');
    setSaving(true);
    try {
      await api.post(`/products/${product.product_id}/stock`, { ...form, quantity_change: qty });
      toast.success('Stock updated');
      onDone();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`Adjust Stock — ${product.name}`} onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        {/* Current → Preview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, background: '#f8f9fa', borderRadius: 10, padding: '14px 18px', marginBottom: 18 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>Current</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: stockColor(product.stock_quantity) }}>{product.stock_quantity}</div>
          </div>
          <div style={{ fontSize: 20, color: 'var(--text-muted)' }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>After</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: stockColor(preview) }}>{qty ? preview : '—'}</div>
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">Change Type</label>
            <select className="form-control" value={form.change_type} onChange={e => setForm(f => ({ ...f, change_type: e.target.value }))}>
              {CHANGE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Quantity <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(− to reduce)</span></label>
            <input className="form-control" type="number" placeholder="e.g. 10 or -3"
              value={form.quantity_change} onChange={e => setForm(f => ({ ...f, quantity_change: e.target.value }))} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Note <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(optional)</span></label>
          <input className="form-control" placeholder="e.g. Received new shipment from supplier"
            value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Update Stock'}</button>
        </div>
      </form>
    </Modal>
  );
};

const StockHistoryModal = ({ product, onClose }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/products/${product.product_id}/stock?limit=50`)
      .then(r => setRows(r.data.data || []))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, [product.product_id]);

  return (
    <Modal title={`Stock History — ${product.name}`} onClose={onClose}>
      {loading ? <div className="spinner" /> : rows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No adjustments recorded yet</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Change</th><th>Before</th><th>After</th><th>By</th><th>Note</th></tr></thead>
            <tbody>
              {rows.map(r => {
                const b = changeBadge(r.quantity_change);
                return (
                  <tr key={r.history_id}>
                    <td style={{ fontSize: 12 }}>{formatDate(r.created_at)}</td>
                    <td><span style={{ textTransform: 'capitalize', fontSize: 12, background: '#f0f4ff', color: '#3b6fd4', borderRadius: 4, padding: '2px 7px' }}>{r.change_type}</span></td>
                    <td><span style={{ color: b.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>{b.icon}{r.quantity_change > 0 ? `+${r.quantity_change}` : r.quantity_change}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.quantity_before}</td>
                    <td><strong style={{ color: stockColor(r.quantity_after) }}>{r.quantity_after}</strong></td>
                    <td style={{ fontSize: 12 }}>{r.changed_by_name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.note || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};

const StockTab = () => {
  const [products, setProducts]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all'); // all | low | out
  const [loading, setLoading]     = useState(true);
  const [adjusting, setAdjusting] = useState(null);
  const [viewing, setViewing]     = useState(null);
  const [stats, setStats]         = useState({ total: 0, low: 0, out: 0, healthy: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load all products for stats + filtered view
      const params = new URLSearchParams({ page, limit: 15, status: 'all' });
      if (search) params.append('search', search);
      const { data } = await api.get(`/products?${params}`);
      const all = data.data || [];

      // Summary stats from low-stock endpoint
      const [lowRes, outRes] = await Promise.all([
        api.get('/products/low-stock?threshold=5&limit=1'),
        api.get('/products/low-stock?threshold=0&limit=1'),
      ]);

      setStats({
        total: data.total || 0,
        low: lowRes.data.total || 0,
        out: outRes.data.total || 0,
        healthy: Math.max(0, (data.total || 0) - (lowRes.data.total || 0)),
      });

      // Client-side filter by stock level
      const filtered = filter === 'out'  ? all.filter(p => p.stock_quantity === 0)
                     : filter === 'low'  ? all.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5)
                     : all;
      setProducts(filtered);
      setTotal(filter === 'all' ? data.total : filtered.length);
    } catch { toast.error('Failed to load stock data'); }
    finally { setLoading(false); }
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);

  const statCard = (label, value, color, bg) => (
    <div style={{ flex: 1, background: bg, borderRadius: 10, padding: '14px 18px', minWidth: 110 }}>
      <div style={{ fontSize: 11, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
    </div>
  );

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        {statCard('Total Products', stats.total,   '#3b6fd4', '#eef2ff')}
        {statCard('Healthy Stock',  stats.healthy,  '#2A9D8F', '#e8fdf6')}
        {statCard('Low Stock (≤5)', stats.low,      '#f4a261', '#fff8f0')}
        {statCard('Out of Stock',   stats.out,      '#e63946', '#fde8ea')}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: 34 }} placeholder="Search products…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          {['all', 'low', 'out'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}>
              {f === 'all' ? 'All Products' : f === 'low' ? '⚠ Low Stock' : '🔴 Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>{total} product(s)</div>
        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>Vendor</th><th>Category</th><th>Stock Level</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No products found</td></tr>
                )}
                {products.map(p => (
                  <tr key={p.product_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={imgSrc(p.primary_image) || 'https://placehold.co/36x36?text=P'} alt=""
                          style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.vendor_name || '—'}</td>
                    <td style={{ fontSize: 13 }}>{p.category_name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Mini stock bar */}
                        <div style={{ width: 60, height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, (p.stock_quantity / 20) * 100)}%`, height: '100%', background: stockColor(p.stock_quantity), borderRadius: 3, transition: 'width .3s' }} />
                        </div>
                        <span style={{ fontWeight: 700, color: stockColor(p.stock_quantity), minWidth: 28 }}>{p.stock_quantity}</span>
                        {p.stock_quantity === 0 && <span style={{ fontSize: 10, background: '#fde8ea', color: '#e63946', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>OUT</span>}
                        {p.stock_quantity > 0 && p.stock_quantity <= 5 && <span style={{ fontSize: 10, background: '#fff3cd', color: '#856404', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>LOW</span>}
                      </div>
                    </td>
                    <td><span className={`badge badge-${p.status === 'active' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}`}>{p.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-sm" style={{ background: '#e8fdf6', color: '#2A9D8F', border: 'none' }}
                          title="Adjust stock" onClick={() => setAdjusting(p)}>
                          <PackagePlus size={13} />
                        </button>
                        <button className="btn btn-sm" style={{ background: '#e8f0fe', color: '#3b6fd4', border: 'none' }}
                          title="View history" onClick={() => setViewing(p)}>
                          <History size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} limit={15} onPage={setPage} />
      </div>

      {adjusting && <StockAdjustModal product={adjusting} onClose={() => setAdjusting(null)} onDone={load} />}
      {viewing   && <StockHistoryModal product={viewing}  onClose={() => setViewing(null)} />}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────
const TABS = [
  { key: 'products',   label: 'Products',   icon: <Layers size={15} /> },
  { key: 'stock',      label: 'Stock',      icon: <PackagePlus size={15} /> },
  { key: 'categories', label: 'Categories', icon: <Tag size={15} /> },
  { key: 'brands',     label: 'Brands',     icon: <Tag size={15} /> },
];

const AdminProducts = () => {
  const [tab, setTab]             = useState('products');
  const [categories, setCategories] = useState([]);
  const [brands, setBrands]         = useState([]);

  useEffect(() => {
    api.get('/products/meta/categories').then(r => setCategories(r.data)).catch(() => {});
    api.get('/products/meta/brands').then(r => setBrands(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-header"><h1>Product Management</h1><p>Manage products, categories and brands</p></div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'none', border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -2, color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: tab === t.key ? 700 : 500, fontSize: 13, cursor: 'pointer', transition: 'all .2s' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'products'   && <ProductsTab categories={categories} brands={brands} />}
      {tab === 'stock'      && <StockTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'brands'     && <BrandsTab />}
    </div>
  );
};

export default AdminProducts;
