import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, Plus, Trash2, X, Edit2 } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const WarrantyModal = ({ existing, products, onClose, onSaved }) => {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    product_id:      existing?.product_id      || '',
    duration_months: existing?.duration_months || '',
    terms:           existing?.terms           || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.product_id || !form.duration_months)
      return toast.error('Product and duration are required');
    if (Number(form.duration_months) < 1 || Number(form.duration_months) > 120)
      return toast.error('Duration must be between 1 and 120 months');
    setSaving(true);
    try {
      await api.post('/warranty/vendor', {
        product_id:      form.product_id,
        duration_months: Number(form.duration_months),
        terms:           form.terms.trim() || null,
      });
      toast.success(isEdit ? 'Warranty updated!' : 'Warranty added!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save warranty');
    } finally { setSaving(false); }
  };

  // Products that either have no warranty yet OR match the one being edited
  const available = products.filter(p => !p.has_warranty || p.product_id === existing?.product_id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Warranty' : 'Add Product Warranty'}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={save} className="modal-form">
          <div className="form-group">
            <label className="form-label">Product *</label>
            {isEdit ? (
              <input className="form-control" value={existing.product_name} disabled />
            ) : (
              <select
                className="form-control"
                value={form.product_id}
                onChange={e => set('product_id', e.target.value)}
                required
              >
                <option value="">— Select a product —</option>
                {available.map(p => (
                  <option key={p.product_id} value={p.product_id}>{p.name}</option>
                ))}
              </select>
            )}
            {!isEdit && available.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                All your products already have warranties.
              </p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Duration (months) *</label>
            <input
              className="form-control"
              type="number"
              min={1}
              max={120}
              placeholder="e.g. 12 for 1-year warranty"
              value={form.duration_months}
              onChange={e => set('duration_months', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Terms &amp; Conditions</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Describe what is and isn't covered by this warranty..."
              value={form.terms}
              onChange={e => set('terms', e.target.value)}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || (!isEdit && available.length === 0)}>
              {saving ? 'Saving…' : isEdit ? 'Update Warranty' : 'Add Warranty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const VendorWarranties = () => {
  const [warranties, setWarranties] = useState([]);
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null); // null | 'add' | warranty-object (edit)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, pRes] = await Promise.all([
        api.get('/warranty/vendor'),
        api.get('/warranty/vendor/products'),
      ]);
      setWarranties(wRes.data || []);
      setProducts(pRes.data   || []);
    } catch {
      toast.error('Failed to load warranty data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id, name) => {
    if (!window.confirm(`Remove warranty from "${name}"?`)) return;
    try {
      await api.delete(`/warranty/vendor/${id}`);
      toast.success('Warranty removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove warranty');
    }
  };

  const productsWithoutWarranty = products.filter(p => !p.has_warranty);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Product Warranties</h1>
          <p>Define warranty coverage for your products. Customers will see this automatically after purchase.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setModal('add')}
          disabled={productsWithoutWarranty.length === 0 && warranties.length > 0}
        >
          <Plus size={16} style={{ marginRight: 6 }} />
          Add Warranty
        </button>
      </div>

      {/* Summary strip */}
      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e8fdf6', color: '#2A9D8F' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="stat-value">{warranties.length}</div>
            <div className="stat-label">Products with Warranty</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fde8ea', color: '#e63946' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="stat-value">{productsWithoutWarranty.length}</div>
            <div className="stat-label">Products without Warranty</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e8f4fd', color: '#0077B6' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="stat-value">
              {warranties.reduce((s, w) => s + Number(w.registered_count || 0), 0)}
            </div>
            <div className="stat-label">Customer Activations</div>
          </div>
        </div>
      </div>

      {loading ? <div className="spinner" /> : (
        <>
          {warranties.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <ShieldCheck size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 16 }}>
                No warranties added yet. Add a warranty to a product so customers can see their coverage.
              </p>
              <button className="btn btn-primary" onClick={() => setModal('add')}>
                <Plus size={16} style={{ marginRight: 6 }} /> Add First Warranty
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Duration</th>
                      <th>Terms</th>
                      <th>Activations</th>
                      <th style={{ width: 100 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warranties.map(w => (
                      <tr key={w.warranty_id}>
                        <td style={{ fontWeight: 600 }}>{w.product_name}</td>
                        <td>
                          <span style={{
                            background: '#e8fdf6', color: '#2A9D8F',
                            padding: '3px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                          }}>
                            {w.duration_months} month{w.duration_months !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td style={{ maxWidth: 260, color: 'var(--text-muted)', fontSize: 13 }}>
                          {w.terms || <em style={{ opacity: 0.5 }}>No terms specified</em>}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{w.registered_count}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-xs btn-outline"
                              title="Edit"
                              onClick={() => setModal(w)}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="btn btn-xs btn-danger"
                              title="Remove"
                              onClick={() => remove(w.warranty_id, w.product_name)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Products without warranty notice */}
          {productsWithoutWarranty.length > 0 && (
            <div className="card" style={{ marginTop: 20, borderLeft: '4px solid #f59e0b', padding: '16px 20px' }}>
              <p style={{ fontWeight: 600, marginBottom: 8, color: '#92400e' }}>
                {productsWithoutWarranty.length} product{productsWithoutWarranty.length > 1 ? 's' : ''} without warranty:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-muted)' }}>
                {productsWithoutWarranty.map(p => <li key={p.product_id}>{p.name}</li>)}
              </ul>
            </div>
          )}
        </>
      )}

      {modal && (
        <WarrantyModal
          existing={modal === 'add' ? null : modal}
          products={products}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default VendorWarranties;
