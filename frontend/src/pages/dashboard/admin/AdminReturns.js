import { useEffect, useState, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice, formatDate } from '../../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending:    { bg: '#fff3e0', color: '#f59e0b' },
  approved:   { bg: '#e8fdf6', color: '#2A9D8F' },
  rejected:   { bg: '#fde8ea', color: '#e63946' },
  processing: { bg: '#e8f4fd', color: '#0077B6' },
};

const AdminReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/warranty/returns');
      setReturns(data || []);
    } catch { toast.error('Failed to load return requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/warranty/returns/${id}/status`, { status });
      toast.success(`Return ${status}`);
      load();
    } catch { toast.error('Failed to update status'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Return Requests</h1>
        <p>Review and manage all customer return requests</p>
      </div>

      {loading ? <div className="spinner" /> : (
        returns.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <RotateCcw size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>No return requests found</p>
          </div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Reason / Items</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map(r => {
                    const sc = STATUS_COLORS[r.status] || { bg: '#f0f0f0', color: '#6b7280' };
                    const items = Array.isArray(r.items) ? r.items.filter(i => i.name) : [];
                    return (
                      <tr key={r.return_id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.invoice_number || `#${r.order_id?.slice(0, 8).toUpperCase()}`}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatPrice(r.total_amount)}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>{r.customer_name || r.customer_email || '—'}</td>
                        <td style={{ maxWidth: 260, fontSize: 13 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason}>
                            {r.reason}
                          </div>
                          {items.length > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                              {items.map(i => i.name).join(', ')}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(r.created_at)}</td>
                        <td>
                          {r.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-sm btn-primary" onClick={() => updateStatus(r.return_id, 'approved')}>Approve</button>
                              <button className="btn btn-sm btn-outline" style={{ color: '#e63946', borderColor: '#e63946' }} onClick={() => updateStatus(r.return_id, 'rejected')}>Reject</button>
                            </div>
                          )}
                          {r.status === 'approved' && (
                            <button className="btn btn-sm btn-outline" onClick={() => updateStatus(r.return_id, 'processing')}>Mark Processing</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default AdminReturns;
