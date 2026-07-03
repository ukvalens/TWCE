import { useEffect, useState, useRef } from 'react';
import { FileText, X, AlertCircle, Download, Printer } from 'lucide-react';
import api from '../../utils/api';
import { formatPrice, formatDate, statusBadge } from '../../utils/helpers';
import toast from 'react-hot-toast';

/* ── tiny helper ── */
const Row = ({ label, value }) => (
  <tr>
    <td style={{ padding: '6px 0', color: '#64748b', fontSize: 13, width: '40%', verticalAlign: 'top' }}>{label}</td>
    <td style={{ padding: '6px 0', fontWeight: 500, fontSize: 13, textAlign: 'right' }}>{value}</td>
  </tr>
);

/* ── printable slip content (rendered offscreen, dumped into new window) ── */
const buildPrintHTML = (slip, formatPriceFn, formatDateFn) => {
  const items = (slip.items || [])
    .map(item => `
      <tr>
        <td style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">${item.name}</td>
        <td style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;">${item.qty}</td>
        <td style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;">${formatPriceFn(item.price)}</td>
        <td style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;font-weight:600;">${formatPriceFn(item.price * item.qty)}</td>
      </tr>`)
    .join('');

  const address = slip.street
    ? `${slip.street}, ${slip.city || ''}, ${slip.country || ''}`
    : 'N/A';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Payment Slip – ${slip.invoice_number || slip.order_id?.slice(0,8).toUpperCase()}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; background: #fff; color: #1e293b; padding: 40px; max-width: 680px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .brand { font-size: 22px; font-weight: 800; color: #0077B6; letter-spacing: -0.5px; }
    .brand span { color: #2A9D8F; }
    .slip-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-top: 4px; }
    .hero { background: linear-gradient(135deg,#0077B6 0%,#2A9D8F 100%); border-radius: 12px; padding: 24px 28px; color: #fff; margin-bottom: 28px; }
    .hero-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
    .hero-amount { font-size: 32px; font-weight: 800; margin: 6px 0 4px; }
    .hero-ref { font-size: 12px; opacity: 0.85; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: rgba(255,255,255,0.25); color: #fff; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
    table.detail { width: 100%; border-collapse: collapse; }
    table.items { width: 100%; border-collapse: collapse; }
    table.items thead th { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; padding: 0 0 8px; border-bottom: 2px solid #e2e8f0; }
    table.items thead th:not(:first-child) { text-align: right; }
    table.items thead th:nth-child(2) { text-align: center; }
    .total-row td { padding-top: 10px; font-weight: 700; font-size: 15px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
    @media print {
      body { padding: 20px; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">TWCE<span>Shop</span></div>
      <div class="slip-title">Official Payment Receipt</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:13px;color:#64748b;">Date</div>
      <div style="font-weight:600;font-size:13px;">${slip.paid_at ? formatDateFn(slip.paid_at) : '—'}</div>
    </div>
  </div>

  <div class="hero">
    <div class="hero-label">Amount Paid</div>
    <div class="hero-amount">${formatPriceFn(slip.amount)}</div>
    <div class="hero-ref">
      Ref: ${slip.transaction_ref || 'N/A'}
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <span class="status-badge">${slip.status}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Payment Details</div>
    <table class="detail">
      <tr><td style="padding:5px 0;color:#64748b;font-size:13px;width:40%;">Invoice #</td><td style="padding:5px 0;font-weight:500;font-size:13px;text-align:right;">${slip.invoice_number || '—'}</td></tr>
      <tr><td style="padding:5px 0;color:#64748b;font-size:13px;">Order ID</td><td style="padding:5px 0;font-weight:500;font-size:13px;text-align:right;">${slip.order_id?.slice(0,8).toUpperCase() || '—'}</td></tr>
      <tr><td style="padding:5px 0;color:#64748b;font-size:13px;">Payment Method</td><td style="padding:5px 0;font-weight:500;font-size:13px;text-align:right;">${slip.method_name || '—'}</td></tr>
      <tr><td style="padding:5px 0;color:#64748b;font-size:13px;">Order Date</td><td style="padding:5px 0;font-weight:500;font-size:13px;text-align:right;">${slip.order_date ? formatDateFn(slip.order_date) : '—'}</td></tr>
      <tr><td style="padding:5px 0;color:#64748b;font-size:13px;">Order Status</td><td style="padding:5px 0;font-weight:500;font-size:13px;text-align:right;">${slip.order_status || '—'}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Billing Information</div>
    <table class="detail">
      <tr><td style="padding:5px 0;color:#64748b;font-size:13px;width:40%;">Customer Name</td><td style="padding:5px 0;font-weight:500;font-size:13px;text-align:right;">${slip.customer_name || '—'}</td></tr>
      <tr><td style="padding:5px 0;color:#64748b;font-size:13px;">Email</td><td style="padding:5px 0;font-weight:500;font-size:13px;text-align:right;">${slip.customer_email || '—'}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Delivery Address</div>
    <table class="detail">
      <tr><td style="padding:5px 0;color:#64748b;font-size:13px;width:40%;">Street</td><td style="padding:5px 0;font-weight:500;font-size:13px;text-align:right;">${slip.street || 'N/A'}</td></tr>
      <tr><td style="padding:5px 0;color:#64748b;font-size:13px;">City</td><td style="padding:5px 0;font-weight:500;font-size:13px;text-align:right;">${slip.city || 'N/A'}</td></tr>
      <tr><td style="padding:5px 0;color:#64748b;font-size:13px;">Country</td><td style="padding:5px 0;font-weight:500;font-size:13px;text-align:right;">${slip.country || 'N/A'}</td></tr>
      <tr><td style="padding:5px 0;color:#64748b;font-size:13px;">Full Address</td><td style="padding:5px 0;font-weight:500;font-size:13px;text-align:right;">${address}</td></tr>
    </table>
  </div>

  ${items ? `
  <div class="section">
    <div class="section-title">Items Purchased</div>
    <table class="items">
      <thead>
        <tr>
          <th style="text-align:left;">Product</th>
          <th>Qty</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${items}
        <tr class="total-row">
          <td colspan="3" style="padding-top:12px;font-size:14px;font-weight:700;">Total</td>
          <td style="padding-top:12px;font-size:14px;font-weight:800;text-align:right;color:#0077B6;">${formatPriceFn(slip.total_amount)}</td>
        </tr>
      </tbody>
    </table>
  </div>` : ''}

  <div class="footer">
    <p>Thank you for your purchase! &nbsp;·&nbsp; TWCEShop &nbsp;·&nbsp; Generated on ${new Date().toLocaleString()}</p>
    <p style="margin-top:6px;font-size:11px;">This is an official payment receipt. Keep it for your records.</p>
  </div>
</body>
</html>`;
};

/* ══════════════════════════════════════════════════════
   Main PaymentSlipModal
   ══════════════════════════════════════════════════════ */
const PaymentSlipModal = ({ paymentId, onClose }) => {
  const [slip,    setSlip]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get(`/payments/slip/${paymentId}`)
      .then(r => setSlip(r.data))
      .catch(() => toast.error('Failed to load payment slip'))
      .finally(() => setLoading(false));
  }, [paymentId]);

  const handleDownload = () => {
    if (!slip) return;
    setDownloading(true);
    try {
      const html   = buildPrintHTML(slip, formatPrice, formatDate);
      const win    = window.open('', '_blank', 'width=800,height=900');
      if (!win) { toast.error('Pop-up blocked — allow pop-ups and try again'); setDownloading(false); return; }
      win.document.write(html);
      win.document.close();
      win.focus();
      // Give fonts/styles a moment to load, then trigger print dialog (Save as PDF)
      setTimeout(() => {
        win.print();
        setDownloading(false);
      }, 600);
    } catch {
      toast.error('Failed to generate download');
      setDownloading(false);
    }
  };

  const address = slip?.street
    ? [slip.street, slip.city, slip.country].filter(Boolean).join(', ')
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="modal-header" style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 2, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <FileText size={18} /> Payment Slip
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {slip && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleDownload}
                disabled={downloading}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} />
                {downloading ? 'Opening…' : 'Download PDF'}
              </button>
            )}
            <button className="modal-close" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* ── Body ── */}
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
        ) : !slip ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={36} style={{ marginBottom: 8 }} />
            <p>Could not load slip.</p>
          </div>
        ) : (
          <div style={{ padding: '20px 24px 28px' }}>

            {/* Hero banner */}
            <div style={{
              background: 'linear-gradient(135deg,#0077B6 0%,#2A9D8F 100%)',
              color: '#fff', borderRadius: 12, padding: '22px 24px', marginBottom: 22,
            }}>
              <div style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Official Payment Receipt</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{formatPrice(slip.amount)}</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>{slip.transaction_ref || 'N/A'}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span style={{
                  background: 'rgba(255,255,255,0.25)', borderRadius: 20,
                  padding: '2px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
                }}>{slip.status}</span>
              </div>
            </div>

            {/* Payment Details */}
            <SectionTitle>Payment Details</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18 }}>
              <tbody>
                <Row label="Invoice #"       value={slip.invoice_number || '—'} />
                <Row label="Order ID"        value={<code style={{ fontSize: 12 }}>{slip.order_id?.slice(0,8).toUpperCase()}</code>} />
                <Row label="Payment Method"  value={slip.method_name || '—'} />
                <Row label="Paid At"         value={slip.paid_at ? formatDate(slip.paid_at) : '—'} />
                <Row label="Order Date"      value={slip.order_date ? formatDate(slip.order_date) : '—'} />
                <Row label="Order Status"    value={
                  <span className={`badge badge-${statusBadge(slip.order_status)}`}>{slip.order_status}</span>
                } />
              </tbody>
            </table>

            {/* Billing Info */}
            <SectionTitle>Billing Information</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18 }}>
              <tbody>
                <Row label="Customer Name" value={slip.customer_name || '—'} />
                <Row label="Email"         value={slip.customer_email || '—'} />
              </tbody>
            </table>

            {/* Delivery Address */}
            <SectionTitle>Delivery Address</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18 }}>
              <tbody>
                <Row label="Street"  value={slip.street  || <span style={{ color: 'var(--text-muted)' }}>N/A</span>} />
                <Row label="City"    value={slip.city    || <span style={{ color: 'var(--text-muted)' }}>N/A</span>} />
                <Row label="Country" value={slip.country || <span style={{ color: 'var(--text-muted)' }}>N/A</span>} />
                {address && <Row label="Full Address" value={address} />}
              </tbody>
            </table>

            {/* Items */}
            {slip.items?.length > 0 && (
              <>
                <SectionTitle>Items Purchased</SectionTitle>
                <div style={{ border: '1px solid #f1f5f9', borderRadius: 8, overflow: 'hidden', marginBottom: 4 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Product', 'Qty', 'Unit Price', 'Subtotal'].map(h => (
                          <th key={h} style={{
                            padding: '8px 12px', fontSize: 11, fontWeight: 700,
                            textTransform: 'uppercase', color: 'var(--text-muted)',
                            textAlign: h === 'Product' ? 'left' : 'right',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slip.items.map((item, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '9px 12px', fontSize: 13 }}>{item.name}</td>
                          <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right' }}>{item.qty}</td>
                          <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right' }}>{formatPrice(item.price)}</td>
                          <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{formatPrice(item.price * item.qty)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                        <td colSpan={3} style={{ padding: '10px 12px', fontWeight: 700, fontSize: 14 }}>Total</td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: 15, textAlign: 'right', color: 'var(--primary)' }}>
                          {formatPrice(slip.total_amount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Footer note */}
            <div style={{
              marginTop: 20, padding: '12px 14px',
              background: '#f8fafc', borderRadius: 8, fontSize: 12,
              color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6,
            }}>
              This is an official payment receipt. &nbsp;·&nbsp; TWCEShop
            </div>

            {/* Action row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn btn-outline" onClick={onClose}>Close</button>
              <button
                className="btn btn-primary"
                onClick={handleDownload}
                disabled={downloading}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={15} />
                {downloading ? 'Opening…' : 'Download PDF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: 'var(--text-muted)',
    marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f1f5f9',
  }}>
    {children}
  </div>
);

export default PaymentSlipModal;
