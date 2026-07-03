import { useEffect, useState, useCallback } from 'react';
import {
  DollarSign, TrendingUp, CheckCircle, Clock,
  Eye, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice, formatDate, statusBadge } from '../../../utils/helpers';
import PaymentSlipModal from '../PaymentSlipModal';
import toast from 'react-hot-toast';

const VendorPayments = () => {
  const [payments,    setPayments]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading,     setLoading]     = useState(true);
  const [slipId,      setSlipId]      = useState(null);
  const [summary,     setSummary]     = useState({ totalRevenue: 0, completedCount: 0, pendingCount: 0 });

  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.append('search', search);
      const { data } = await api.get(`/payments/vendor?${params}`);
      const rows = data.data || [];
      setPayments(rows);
      setTotal(data.total || 0);
      const completed = rows.filter(p => p.status === 'completed');
      setSummary({
        totalRevenue:   completed.reduce((s, p) => s + parseFloat(p.amount || 0), 0),
        completedCount: completed.length,
        pendingCount:   rows.filter(p => p.status === 'pending').length,
      });
    } catch {
      toast.error('Failed to load payments');
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  /* debounced search */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const pages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p>Track payments received for your products</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Revenue (this page)', value: formatPrice(summary.totalRevenue), icon: <DollarSign size={20} />,   bg: '#e8fdf6', ic: '#2A9D8F' },
          { label: 'Completed',           value: summary.completedCount,            icon: <CheckCircle size={20} />,  bg: '#e8f4fd', ic: '#0077B6' },
          { label: 'Pending',             value: summary.pendingCount,              icon: <Clock size={20} />,        bg: '#fff3e0', ic: '#f59e0b' },
          { label: 'Total Payments',      value: total,                             icon: <TrendingUp size={20} />,   bg: '#f3e8fd', ic: '#7c3aed' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ background: c.bg, color: c.ic }}>{c.icon}</div>
            <div>
              <div className="stat-value" style={{ fontSize: 20 }}>{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" style={{ paddingLeft: 34, margin: 0 }}
            placeholder="Search by customer name or email…"
            value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th><th>Customer</th><th>Amount</th><th>Method</th>
                <th>Status</th><th>Ref #</th><th>Paid At</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></td></tr>
              ) : !payments.length ? (
                <tr><td colSpan={8} className="empty-row">
                  <DollarSign size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 8px' }} />
                  No payments found
                </td></tr>
              ) : payments.map(p => (
                <tr key={p.payment_id}>
                  <td><code className="code-sm">{p.invoice_number || p.order_id?.slice(0, 8) || '—'}</code></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.customer_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.customer_email}</div>
                  </td>
                  <td><strong style={{ fontSize: 14 }}>{formatPrice(p.amount)}</strong></td>
                  <td style={{ fontSize: 13 }}>{p.method_name || '—'}</td>
                  <td><span className={`badge badge-${statusBadge(p.status)}`}>{p.status}</span></td>
                  <td><code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.transaction_ref ? p.transaction_ref.slice(0, 18) + '…' : '—'}</code></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.paid_at ? formatDate(p.paid_at) : '—'}</td>
                  <td>
                    {p.status === 'completed' && (
                      <button className="btn btn-xs btn-outline" onClick={() => setSlipId(p.payment_id)} title="View & Download Slip">
                        <Eye size={12} /> Slip
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} payments
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, pages - 4));
                const n = start + i;
                return (
                  <button key={n} className={`btn btn-sm ${page === n ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(n)}>{n}</button>
                );
              })}
              <button className="btn btn-outline btn-sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {slipId && <PaymentSlipModal paymentId={slipId} onClose={() => setSlipId(null)} />}
    </div>
  );
};

export default VendorPayments;
