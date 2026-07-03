import { useEffect, useState, useCallback } from 'react';
import {
  DollarSign, TrendingUp, CheckCircle, Clock,
  Eye, Search, ChevronLeft, ChevronRight, Image, X,
} from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice, formatDate, statusBadge } from '../../../utils/helpers';
import PaymentSlipModal from '../PaymentSlipModal';
import toast from 'react-hot-toast';

const UPLOADS = 'http://localhost:5000/uploads/';

/* --- Proof Modal ----------------------------------------------------------- */
const ProofModal = ({ payment, onClose, onApprove }) => {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.put(`/payments/${payment.payment_id}/complete`);
      toast.success('Payment approved! Order confirmed.');
      onApprove();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally { setApproving(false); }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await api.put(`/payments/${payment.payment_id}/reject`, { reason });
      toast.success('Payment proof rejected. Customer notified.');
      onApprove();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally { setRejecting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image size={18} /> Payment Proof
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '0 24px 16px' }}>
          {/* Info */}
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Customer</span>
              <strong>{payment.customer_name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Amount</span>
              <strong style={{ color: 'var(--primary)' }}>{formatPrice(payment.amount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Method</span>
              <span>{payment.method_name}</span>
            </div>
          </div>

          {/* Screenshot */}
          {payment.payment_proof ? (
            <img
              src={`${UPLOADS}${payment.payment_proof}`}
              alt="Payment proof"
              style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border-color)', maxHeight: 340, objectFit: 'contain', cursor: 'zoom-in' }}
              onClick={() => window.open(`${UPLOADS}${payment.payment_proof}`, '_blank')}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Image size={40} style={{ opacity: 0.2, marginBottom: 8 }} />
              <p>No proof uploaded yet</p>
            </div>
          )}

          {/* Reject reason input */}
          {showReject && (
            <div style={{ marginTop: 14 }}>
              <label className="form-label">Rejection Reason (sent to customer)</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="e.g. Screenshot is blurry, wrong amount, wrong account..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          )}

          {/* Actions */}
          {payment.status === 'pending' && payment.payment_proof && (
            <div className="modal-footer" style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={onClose}>Close</button>
              {!showReject ? (
                <>
                  <button className="btn btn-sm" style={{ background: '#fde8ea', color: '#e63946', border: '1px solid #fca5a5' }}
                    onClick={() => setShowReject(true)}>
                    Reject
                  </button>
                  <button className="btn btn-primary" disabled={approving} onClick={handleApprove}
                    style={{ background: '#2A9D8F', borderColor: '#2A9D8F' }}>
                    <CheckCircle size={14} />
                    {approving ? 'Approving…' : 'Approve Payment'}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-outline" onClick={() => setShowReject(false)}>Cancel</button>
                  <button className="btn btn-sm" style={{ background: '#e63946', color: '#fff', border: 'none' }}
                    disabled={rejecting} onClick={handleReject}>
                    {rejecting ? 'Rejecting…' : 'Confirm Reject'}
                  </button>
                </>
              )}
            </div>
          )}
          {!(payment.status === 'pending' && payment.payment_proof) && (
            <div className="modal-footer" style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={onClose}>Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* --- Main ------------------------------------------------------------------ */
const VendorPayments = () => {
  const [payments,    setPayments]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading,     setLoading]     = useState(true);
  const [slipId,      setSlipId]      = useState(null);
  const [proofPayment,setProofPayment]= useState(null);
  const [summary,     setSummary]     = useState({ totalRevenue: 0, completedCount: 0, pendingCount: 0, proofCount: 0 });

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
      setSummary({
        totalRevenue:   rows.filter(p => p.status === 'completed').reduce((s, p) => s + parseFloat(p.amount || 0), 0),
        completedCount: rows.filter(p => p.status === 'completed').length,
        pendingCount:   rows.filter(p => p.status === 'pending' && !p.payment_proof).length,
        proofCount:     rows.filter(p => p.status === 'pending' && p.payment_proof).length,
      });
    } catch {
      toast.error('Failed to load payments');
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

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
          <p>Track and approve payments for your orders</p>
        </div>
        {summary.proofCount > 0 && (
          <div style={{ background: '#fff3e0', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={14} />
            {summary.proofCount} payment{summary.proofCount > 1 ? 's' : ''} awaiting approval
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Revenue (this page)', value: formatPrice(summary.totalRevenue), icon: <DollarSign size={20} />,  bg: '#e8fdf6', ic: '#2A9D8F' },
          { label: 'Completed',           value: summary.completedCount,            icon: <CheckCircle size={20} />, bg: '#e8f4fd', ic: '#0077B6' },
          { label: 'Awaiting Proof',      value: summary.pendingCount,              icon: <Clock size={20} />,       bg: '#fff3e0', ic: '#f59e0b' },
          { label: 'Proof Uploaded',      value: summary.proofCount,                icon: <Image size={20} />,       bg: '#fde8ea', ic: '#e63946' },
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
                <th>Status</th><th>Proof</th><th>Paid At</th><th>Actions</th>
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
                  <td>
                    {p.payment_proof ? (
                      <img
                        src={`${UPLOADS}${p.payment_proof}`}
                        alt="proof"
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '2px solid #2A9D8F' }}
                        onClick={() => setProofPayment(p)}
                        title="View proof"
                      />
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.paid_at ? formatDate(p.paid_at) : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {p.status === 'completed' && (
                        <button className="btn btn-xs btn-outline" onClick={() => setSlipId(p.payment_id)} title="View Slip">
                          <Eye size={12} /> Slip
                        </button>
                      )}
                      {p.status === 'pending' && p.payment_proof && (
                        <button className="btn btn-xs btn-primary" style={{ background: '#2A9D8F', borderColor: '#2A9D8F' }}
                          onClick={() => setProofPayment(p)}>
                          <CheckCircle size={12} /> Approve
                        </button>
                      )}
                      {p.status === 'pending' && !p.payment_proof && (
                        <span style={{ fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> Awaiting
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
                return <button key={n} className={`btn btn-sm ${page === n ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(n)}>{n}</button>;
              })}
              <button className="btn btn-outline btn-sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {slipId && <PaymentSlipModal paymentId={slipId} onClose={() => setSlipId(null)} />}
      {proofPayment && <ProofModal payment={proofPayment} onClose={() => setProofPayment(null)} onApprove={load} />}
    </div>
  );
};

export default VendorPayments;
