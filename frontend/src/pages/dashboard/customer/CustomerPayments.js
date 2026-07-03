import { useEffect, useState, useCallback } from 'react';
import {
  CreditCard, Clock, CheckCircle, XCircle, Eye, X,
  DollarSign, FileText, RefreshCw, AlertCircle,
} from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice, formatDate, statusBadge } from '../../../utils/helpers';
import PaymentSlipModal from '../PaymentSlipModal';
import toast from 'react-hot-toast';

/* --- Pay Now Modal --------------------------------------------------------- */
const PayNowModal = ({ order, onClose, onSuccess }) => {
  const [methods,  setMethods]  = useState([]);
  const [methodId, setMethodId] = useState('');
  const [loading,  setLoading]  = useState(true);
  const [paying,   setPaying]   = useState(false);

  useEffect(() => {
    api.get('/payments/methods')
      .then(r => {
        setMethods(r.data || []);
        setMethodId(r.data?.[0]?.method_id?.toString() || '');
      })
      .catch(() => toast.error('Failed to load payment methods'))
      .finally(() => setLoading(false));
  }, []);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!methodId) return toast.error('Select a payment method');
    setPaying(true);
    try {
      const initRes = await api.post('/payments/initiate', {
        order_id: order.order_id,
        method_id: parseInt(methodId),
      });
      const { transaction_ref } = initRes.data;
      await api.post('/payments/verify', { transaction_ref });
      toast.success('Payment successful! Order confirmed.');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally { setPaying(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} /> Complete Payment
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : (
          <form onSubmit={handlePay} className="modal-form">
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Invoice</span>
                <code style={{ fontSize: 12 }}>{order.invoice_number || order.order_id.slice(0, 8)}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                <span>Amount Due</span>
                <span style={{ color: 'var(--primary)' }}>{formatPrice(order.total_amount)}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method *</label>
              <select className="form-control" value={methodId} onChange={e => setMethodId(e.target.value)} required>
                <option value="">Select method…</option>
                {methods.map(m => (
                  <option key={m.method_id} value={m.method_id}>{m.method_name}</option>
                ))}
              </select>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 4 }}>
              <AlertCircle size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              Payment will be processed and your order will be confirmed immediately.
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={paying || !methodId}>
                {paying ? 'Processing…' : `Pay ${formatPrice(order.total_amount)}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* --- Main Component -------------------------------------------------------- */
const CustomerPayments = () => {
  const [payments,     setPayments]  = useState([]);
  const [unpaidOrders, setUnpaid]    = useState([]);
  const [loading,      setLoading]   = useState(true);
  const [tab,          setTab]       = useState('history');
  const [slipId,       setSlipId]    = useState(null);
  const [payOrder,     setPayOrder]  = useState(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const [histRes, ordRes] = await Promise.all([
        api.get('/payments/history?limit=50'),
        api.get('/orders/my?limit=100'),
      ]);
      setPayments(histRes.data || []);
      const unpaid = (ordRes.data?.data || []).filter(
        o => o.payment_status !== 'paid' && o.status !== 'cancelled'
      );
      setUnpaid(unpaid);
    } catch {
      toast.error('Failed to load payment data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const totalPaid     = payments.filter(p => p.status === 'completed').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const totalPending  = unpaidOrders.length;
  const totalRefunded = payments.filter(p => p.status === 'refunded').reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  const STATUS_ICON = {
    completed: <CheckCircle size={14} style={{ color: '#2A9D8F' }} />,
    pending:   <Clock       size={14} style={{ color: '#f59e0b' }} />,
    refunded:  <RefreshCw   size={14} style={{ color: '#7c3aed' }} />,
    failed:    <XCircle     size={14} style={{ color: '#e63946' }} />,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Payments</h1>
          <p>View your payment history and complete pending payments</p>
        </div>
        {totalPending > 0 && (
          <button className="btn btn-primary" onClick={() => setTab('pending')}>
            <AlertCircle size={15} />
            {totalPending} Pending Payment{totalPending > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Spent',     value: formatPrice(totalPaid),     icon: <CheckCircle size={20} />, bg: '#e8fdf6', ic: '#2A9D8F' },
          { label: 'Pending Payments',value: totalPending,               icon: <Clock size={20} />,       bg: '#fff3e0', ic: '#f59e0b' },
          { label: 'Total Refunded',  value: formatPrice(totalRefunded), icon: <RefreshCw size={20} />,   bg: '#f3e8fd', ic: '#7c3aed' },
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

      {/* Tabs */}
      <div className="filter-tabs" style={{ marginBottom: 20 }}>
        <button className={`filter-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <FileText size={14} /> Payment History
          <span className="tab-count">{payments.length}</span>
        </button>
        <button className={`filter-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          <Clock size={14} /> Pending Orders
          <span className="tab-count">{totalPending}</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <>
          {/* Payment History */}
          {tab === 'history' && (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice</th><th>Amount</th><th>Method</th>
                      <th>Status</th><th>Ref #</th><th>Date</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!payments.length && (
                      <tr><td colSpan={7} className="empty-row">
                        <DollarSign size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 8px' }} />
                        No payment history yet
                      </td></tr>
                    )}
                    {payments.map(p => (
                      <tr key={p.payment_id}>
                        <td><code className="code-sm">{p.invoice_number || p.order_id?.slice(0, 8) || '—'}</code></td>
                        <td><strong style={{ fontSize: 14 }}>{formatPrice(p.amount)}</strong></td>
                        <td style={{ fontSize: 13 }}>{p.method_name || '—'}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                            className={`badge badge-${statusBadge(p.status)}`}>
                            {STATUS_ICON[p.status]} {p.status}
                          </span>
                        </td>
                        <td><code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.transaction_ref ? p.transaction_ref.slice(0, 20) + '…' : '—'}</code></td>
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
            </div>
          )}

          {/* Pending Orders */}
          {tab === 'pending' && (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice</th><th>Amount</th><th>Order Status</th>
                      <th>Payment</th><th>Date</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!unpaidOrders.length && (
                      <tr><td colSpan={6} className="empty-row">
                        <CheckCircle size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 8px' }} />
                        All orders are paid!
                      </td></tr>
                    )}
                    {unpaidOrders.map(o => (
                      <tr key={o.order_id}>
                        <td><code className="code-sm">{o.invoice_number || o.order_id.slice(0, 8)}</code></td>
                        <td><strong style={{ fontSize: 14 }}>{formatPrice(o.total_amount)}</strong></td>
                        <td><span className={`badge badge-${statusBadge(o.status)}`}>{o.status}</span></td>
                        <td><span className={`badge badge-${statusBadge(o.payment_status)}`}>{o.payment_status}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(o.created_at)}</td>
                        <td>
                          <button className="btn btn-xs btn-primary" onClick={() => setPayOrder(o)}>
                            <CreditCard size={12} /> Pay Now
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {slipId && <PaymentSlipModal paymentId={slipId} onClose={() => setSlipId(null)} />}

      {payOrder && (
        <PayNowModal
          order={payOrder}
          onClose={() => setPayOrder(null)}
          onSuccess={loadPayments}
        />
      )}
    </div>
  );
};

export default CustomerPayments;
