import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status') || 'pending';

  const config = {
    completed: { icon: <CheckCircle size={56} color="#2A9D8F" />, title: 'Payment Successful!', msg: 'Your payment was confirmed and your order is now active.', btn: 'View My Orders', path: '/dashboard/my-orders' },
    paid:      { icon: <CheckCircle size={56} color="#2A9D8F" />, title: 'Payment Successful!', msg: 'Your payment was confirmed and your order is now active.', btn: 'View My Orders', path: '/dashboard/my-orders' },
    failed:    { icon: <XCircle    size={56} color="#e63946" />, title: 'Payment Failed',      msg: 'Your payment could not be processed. Please try again.',  btn: 'Try Again',      path: '/dashboard/payments' },
    pending:   { icon: <Clock      size={56} color="#f59e0b" />, title: 'Payment Pending',     msg: 'Your payment is being processed. We will notify you once confirmed.', btn: 'View Payments', path: '/dashboard/payments' },
  };

  const c = config[status] || config.pending;

  useEffect(() => {
    const t = setTimeout(() => navigate(c.path, { replace: true }), 5000);
    return () => clearTimeout(t);
  }, [c.path, navigate]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
        <div style={{ marginBottom: 20 }}>{c.icon}</div>
        <h2 style={{ marginBottom: 8 }}>{c.title}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{c.msg}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Redirecting in 5 seconds…</p>
        <button className="btn btn-primary" onClick={() => navigate(c.path, { replace: true })}>
          {c.btn}
        </button>
      </div>
    </div>
  );
};

export default PaymentCallback;
