import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, ShieldOff, Clock } from 'lucide-react';
import api from '../../utils/api';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const statusInfo = (expiryDate) => {
  if (!expiryDate) return { label: 'Unknown', color: '#6c757d', bg: '#f1f3f5', icon: <ShieldOff size={20} /> };
  const now  = new Date();
  const exp  = new Date(expiryDate);
  const diff = exp - now;
  if (diff < 0)
    return { label: 'Expired', color: '#e63946', bg: '#fde8ea', icon: <ShieldOff size={20} /> };
  if (diff < 30 * 24 * 60 * 60 * 1000)
    return { label: 'Expiring Soon', color: '#f59e0b', bg: '#fff3e0', icon: <Clock size={20} /> };
  return { label: 'Active', color: '#2A9D8F', bg: '#e8fdf6', icon: <ShieldCheck size={20} /> };
};

const Warranties = () => {
  const [warranties, setWarranties] = useState([]);
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/warranty/my');
      setWarranties(data || []);
    } catch {
      toast.error('Failed to load warranties');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Deduplicate: one warranty card per product (customer may have ordered same product twice)
  const unique = Object.values(
    warranties.reduce((acc, w) => {
      if (!acc[w.warranty_id]) acc[w.warranty_id] = w;
      return acc;
    }, {})
  );

  const active      = unique.filter(w => statusInfo(w.expiry_date).label === 'Active').length;
  const expiringSoon = unique.filter(w => statusInfo(w.expiry_date).label === 'Expiring Soon').length;
  const expired     = unique.filter(w => statusInfo(w.expiry_date).label === 'Expired').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Warranties</h1>
          <p>Warranties are automatically applied to products you purchased. No registration needed.</p>
        </div>
      </div>

      {/* Summary */}
      {!loading && unique.length > 0 && (
        <div className="stats-row" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#e8fdf6', color: '#2A9D8F' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="stat-value">{active}</div>
              <div className="stat-label">Active</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fff3e0', color: '#f59e0b' }}>
              <Clock size={22} />
            </div>
            <div>
              <div className="stat-value">{expiringSoon}</div>
              <div className="stat-label">Expiring Soon</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fde8ea', color: '#e63946' }}>
              <ShieldOff size={22} />
            </div>
            <div>
              <div className="stat-value">{expired}</div>
              <div className="stat-label">Expired</div>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="spinner" /> : (
        unique.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <ShieldCheck size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 8 }}>
              No warranties found
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Warranties appear here automatically once you purchase a product that has warranty coverage.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {unique.map(w => {
              const { label, color, bg, icon } = statusInfo(w.expiry_date);
              return (
                <div
                  key={w.warranty_id}
                  className="card"
                  style={{ borderLeft: `4px solid ${color}` }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    {/* Icon */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                      background: bg, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color,
                    }}>
                      {icon}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                        {w.product_name}
                      </div>
                      <div style={{
                        display: 'flex', gap: 20, flexWrap: 'wrap',
                        fontSize: 13, color: 'var(--text-muted)',
                      }}>
                        <span>
                          <strong>Duration:</strong> {w.duration_months} month{w.duration_months !== 1 ? 's' : ''}
                        </span>
                        <span>
                          <strong>Purchased:</strong> {formatDate(w.purchase_date)}
                        </span>
                        <span style={{
                          color: label === 'Expired' ? '#e63946' : label === 'Expiring Soon' ? '#f59e0b' : 'inherit',
                          fontWeight: label !== 'Active' ? 700 : 400,
                        }}>
                          <strong>Expires:</strong> {formatDate(w.expiry_date)}
                          {label === 'Expired'       && ' — Expired'}
                          {label === 'Expiring Soon' && ' — Expiring soon!'}
                        </span>
                      </div>

                      {w.terms && (
                        <div style={{
                          marginTop: 10, padding: '8px 12px',
                          background: 'var(--bg-secondary, #f8f9fa)',
                          borderRadius: 6, fontSize: 12,
                          color: 'var(--text-muted)', fontStyle: 'italic',
                        }}>
                          <strong style={{ fontStyle: 'normal' }}>Coverage terms:</strong> {w.terms}
                        </div>
                      )}
                    </div>

                    {/* Badge */}
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px',
                      borderRadius: 20, background: bg, color, flexShrink: 0,
                    }}>
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default Warranties;
