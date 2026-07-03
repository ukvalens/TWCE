import { useEffect, useState, useCallback } from 'react';
import { RotateCcw, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice, formatDate } from '../../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  pending:   { bg: '#fff3e0', color: '#f59e0b' },
  approved:  { bg: '#e8fdf6', color: '#2A9D8F' },
  rejected:  { bg: '#fde8ea', color: '#e63946' },
  completed: { bg: '#e8f0fe', color: '#3b6fd4' },
};

const ReturnRow = ({ ret }) => {
  const [open, setOpen] = useState(false);
  const sc = STATUS_STYLE[ret.status] || { bg: '#f0f0f0', color: '#6b7280' };
  const items = Array.isArray(ret.items) ? ret.items.filter(i => i.name) : [];

  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <td style={{ fontWeight: 600, fontSize: 13 }}>
          {ret.invoice_number || `#${ret.order_id?.slice(0, 8).toUpperCase()}`}
        </td>
        <td>
          <div style={{ fontWeight: 600 }}>{ret.customer_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ret.customer_email}</div>
        </td>
        <td style={{ maxWidth: 240, fontSize: 13 }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ret.reason}>
            {ret.reason}
          </div>
        </td>
        <td><strong>{formatPrice(ret.total_amount)}</strong></td>
        <td>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>
            {ret.status.charAt(0).toUpperCase() + ret.status.slice(1)}
          </span>
        </td>
        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(ret.created_at)}</td>
        <td>
          <button className="btn btn-xs btn-outline" onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} style={{ background: '#f8f9fa', padding: '12px 20px' }}>
            <div style={{ fontSize: 13, marginBottom: 8, fontWeight: 600 }}>Your products in this order:</div>
            {items.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No product details available</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>{item.name} × {item.quantity}</span>
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              ℹ️ Return status is managed by admin. You will be notified of any updates.
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const VendorReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/warranty/returns/vendor');
      setReturns(data || []);
    } catch { toast.error('Failed to load return requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? returns : returns.filter(r => r.status === filter);

  const counts = returns.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Return Requests</h1>
          <p>Customer returns for orders containing your products</p>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'all',      label: 'Total',     color: '#3b6fd4', bg: '#eef2ff' },
          { key: 'pending',  label: 'Pending',   color: '#f59e0b', bg: '#fff3e0' },
          { key: 'approved', label: 'Approved',  color: '#2A9D8F', bg: '#e8fdf6' },
          { key: 'rejected', label: 'Rejected',  color: '#e63946', bg: '#fde8ea' },
          { key: 'completed',label: 'Completed', color: '#3b6fd4', bg: '#e8f0fe' },
        ].map(s => (
          <div key={s.key}
            onClick={() => setFilter(s.key)}
            style={{ flex: 1, minWidth: 100, background: filter === s.key ? s.bg : '#fff',
              border: `2px solid ${filter === s.key ? s.color : 'var(--border)'}`,
              borderRadius: 10, padding: '12px 16px', cursor: 'pointer', transition: 'all .15s' }}>
            <div style={{ fontSize: 11, color: s.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>
              {s.key === 'all' ? returns.length : (counts[s.key] || 0)}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <RotateCcw size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
            {filter === 'all' ? 'No return requests yet' : `No ${filter} returns`}
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Reason</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => <ReturnRow key={r.return_id} ret={r} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorReturns;
