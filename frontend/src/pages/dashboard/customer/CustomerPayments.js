import { useEffect, useState, useCallback } from 'react';
import {
  CreditCard, Clock, CheckCircle, XCircle, Eye, X,
  DollarSign, FileText, RefreshCw, AlertCircle,
} from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice, formatDate, statusBadge } from '../../../utils/helpers';
import PaymentSlipModal from '../PaymentSlipModal';
import toast from 'react-hot-toast';

/* --- USSD / Bank info per method ------------------------------------------ */
const getPaymentInfo = (methodName, amount) => {
  const amt = Math.round(amount);
  const name = (methodName || '').toLowerCase();
  if (name.includes('mtn') || (name.includes('mobile') && !name.includes('airtel'))) {
    return {
      type: 'ussd',
      title: 'MTN Mobile Money',
      code: `*182*8*1*522467*${amt}#`,
      steps: [
        `Dial  *182*8*1*522467*${amt}#  on your MTN line`,
        'Enter your MoMo PIN to confirm',
        'Take a screenshot of the confirmation SMS',
        'Upload the screenshot below',
      ],
    };
  }
  if (name.includes('airtel')) {
    return {
      type: 'ussd',
      title: 'Airtel Money',
      code: `*185*8*1*522467*${amt}#`,
      steps: [
        `Dial  *185*8*1*522467*${amt}#  on your Airtel line`,
        'Enter your Airtel Money PIN to confirm',
        'Take a screenshot of the confirmation SMS',
        'Upload the screenshot below',
      ],
    };
  }
  if (name.includes('bank')) {
    return {
      type: 'bank',
      title: 'Bank Transfer',
      steps: [
        'Transfer to: Bank of Kigali',
        'Account Name: TWCE Ltd',
        'Account No: 00040-06178600-18',
        `Amount: RWF ${amt.toLocaleString()}`,
        'Take a screenshot / photo of the transfer receipt',
        'Upload the screenshot below',
      ],
    };
  }
  // Generic mobile money fallback
  return {
    type: 'ussd',
    title: 'Mobile Money',
    code: `*182*8*1*522467*${amt}#`,
    steps: [
      `Dial  *182*8*1*522467*${amt}#`,
      'Confirm with your PIN',
      'Take a screenshot of the confirmation',
      'Upload the screenshot below',
    ],
  };
};

/* --- Pay Now Modal --------------------------------------------------------- */
const PayNowModal = ({ order, onClose, onSuccess }) => {
  const [methods,   setMethods]  = useState([]);
  const [methodId,  setMethodId] = useState('');
  const [loading,   setLoading]  = useState(true);
  const [step,      setStep]     = useState('select'); // select | instructions | upload
  const [paymentId, setPaymentId]= useState(null);
  const [proof,     setProof]    = useState(null);
  const [uploading, setUploading]= useState(false);
  const fileRef = useState(null);

  useEffect(() => {
    api.get('/payments/methods')
      .then(r => {
        setMethods(r.data || []);
        setMethodId(r.data?.[0]?.method_id?.toString() || '');
      })
      .catch(() => toast.error('Failed to load payment methods'))
      .finally(() => setLoading(false));
  }, []);

  const selectedMethod = methods.find(m => m.method_id?.toString() === methodId);
  const info = selectedMethod ? getPaymentInfo(selectedMethod.method_name, order.total_amount) : null;

  // Step 1: initiate payment record and show instructions
  const handleContinue = async (e) => {
    e.preventDefault();
    if (!methodId) return toast.error('Select a payment method');
    try {
      const initRes = await api.post('/payments/initiate', {
        order_id: order.order_id,
        method_id: parseInt(methodId),
      });
      setPaymentId(initRes.data.payment.payment_id);
      setStep('instructions');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
    }
  };

  // Step 2: upload screenshot
  const handleUpload = async () => {
    if (!proof) return toast.error('Please select a screenshot to upload');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('proof', proof);
      fd.append('payment_id', paymentId);
      await api.post('/payments/upload-proof', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Payment proof submitted! Vendor will verify shortly.');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} />
            {step === 'select' ? 'Complete Payment' : step === 'instructions' ? 'Payment Instructions' : 'Upload Proof'}
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : step === 'select' ? (
          <form onSubmit={handleContinue} className="modal-form">
            {/* Order summary */}
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
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={!methodId}>Continue</button>
            </div>
          </form>

        ) : step === 'instructions' ? (
          <div className="modal-form">
            {/* USSD code box */}
            {info?.code && (
              <div style={{
                background: '#0077B6', color: '#fff', borderRadius: 10,
                padding: '16px 20px', textAlign: 'center', marginBottom: 20,
              }}>
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>Dial this USSD code</div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, fontFamily: 'monospace' }}>
                  {info.code}
                </div>
                <button
                  type="button"
                  style={{ marginTop: 10, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: 12 }}
                  onClick={() => { navigator.clipboard.writeText(info.code); toast.success('Copied!'); }}
                >
                  Copy
                </button>
              </div>
            )}
            {/* Steps */}
            <ol style={{ paddingLeft: 20, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {info?.steps.map((s, i) => (
                <li key={i} style={{ fontSize: 13, color: i === 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === 0 ? 600 : 400 }}>{s}</li>
              ))}
            </ol>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setStep('select')}>Back</button>
              <button type="button" className="btn btn-primary" onClick={() => setStep('upload')}>I've Paid — Upload Proof</button>
            </div>
          </div>

        ) : (
          <div className="modal-form">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Upload a screenshot or photo of your payment confirmation.
            </p>
            <div
              style={{
                border: '2px dashed var(--border-color, #e5e7eb)', borderRadius: 10,
                padding: '30px 20px', textAlign: 'center', cursor: 'pointer',
                background: proof ? '#f0fdf4' : '#fafafa',
              }}
              onClick={() => document.getElementById('proof-input').click()}
            >
              {proof ? (
                <>
                  <CheckCircle size={32} color="#2A9D8F" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{proof.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(proof.size / 1024).toFixed(1)} KB</div>
                </>
              ) : (
                <>
                  <DollarSign size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click to select screenshot</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG up to 5MB</div>
                </>
              )}
            </div>
            <input
              id="proof-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => setProof(e.target.files[0] || null)}
            />
            {proof && (
              <img
                src={URL.createObjectURL(proof)}
                alt="preview"
                style={{ width: '100%', borderRadius: 8, marginTop: 12, maxHeight: 200, objectFit: 'contain', border: '1px solid var(--border-color)' }}
              />
            )}
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setStep('instructions')}>Back</button>
              <button type="button" className="btn btn-primary" disabled={!proof || uploading} onClick={handleUpload}>
                {uploading ? 'Uploading…' : 'Submit Proof'}
              </button>
            </div>
          </div>
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
