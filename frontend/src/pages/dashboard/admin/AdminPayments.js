import { useEffect, useState, useCallback } from 'react';
import {
  Search, DollarSign, CheckCircle, XCircle, Clock,
  TrendingUp, Eye, RefreshCw, BarChart2,
} from 'lucide-react';
import api from '../../../utils/api';
import { formatPrice, formatDate, statusBadge } from '../../../utils/helpers';
import { Pagination } from './AdminUsers';
import PaymentSlipModal from '../PaymentSlipModal';
import toast from 'react-hot-toast';

/* --- Mini bar for payment-method breakdown --------------------------------- */
const MethodBar = ({ method_name, revenue, count, maxRevenue }) => {
  const pct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{method_name}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{count} txns · {formatPrice(revenue)}</span>
      </div>
      <div style={{ background: '#f1f3f5', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: 'linear-gradient(90deg, #0077B6, #2A9D8F)',
          borderRadius: 4, transition: 'width 0.4s',
        }} />
      </div>
    </div>
  );
};

/* --- Main ------------------------------------------------------------------ */
const AdminPayments = () => {
  const [payments,     setPayments]     = useState([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [status,       setStatus]       = useState('');
  const [search,       setSearch]       = useState('');
  const [loading,      setLoading]      = useState(true);
  const [stats,        setStats]        = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsTab,     setStatsTab]     = useState('overview');
  const [slipId,       setSlipId]       = useState(null);

  /* load list */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      const { data } = await api.get(`/payments?${params}`);
      setPayments(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  }, [page, status, search]);

  /* load revenue stats */
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get('/payments/revenue');
      setStats(data);
    } catch { /* supplementary */ }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { load(); },      [load]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const refund = async (id) => {
    if (!window.confirm('Mark this payment as refunded? This cannot be undone.')) return;
    try {
      await api.put(`/payments/${id}/refund`);
      toast.success('Payment refunded');
      load();
      loadStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Refund failed'); }
  };

  /* simple CSS bar chart */
  const DailyChart = ({ data = [] }) => {
    if (!data.length) return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No data</p>;
    const maxRev = Math.max(...data.map(d => parseFloat(d.revenue)));
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, overflowX: 'auto', paddingBottom: 4 }}>
        {data.map((d, i) => {
          const h = maxRev > 0 ? (parseFloat(d.revenue) / maxRev) * 90 : 2;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}
              title={`${d.day}: ${formatPrice(d.revenue)}`}>
              <div style={{
                width: 14, height: `${h}px`,
                background: 'linear-gradient(180deg,#0077B6,#2A9D8F)',
                borderRadius: '3px 3px 0 0',
              }} />
            </div>
          );
        })}
      </div>
    );
  };

  const maxMethodRevenue = Math.max(...(stats?.by_method || []).map(m => parseFloat(m.revenue || 0)), 1);

  return (
    <div>
      <div className="page-header">
        <h1>Payment Monitoring</h1>
        <p>Track all transactions, revenue and refunds</p>
      </div>

      {/* Revenue stats */}
      {statsLoading ? (
        <div style={{ textAlign: 'center', padding: 30 }}><div className="spinner" /></div>
      ) : stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Revenue', value: formatPrice(stats.total_revenue), icon: <TrendingUp size={20} />, bg: '#e8fdf6', ic: '#2A9D8F' },
              { label: 'This Month',    value: formatPrice(stats.month_revenue), icon: <BarChart2 size={20} />,  bg: '#e8f4fd', ic: '#0077B6' },
              { label: 'Today',         value: formatPrice(stats.today_revenue), icon: <DollarSign size={20} />, bg: '#fff3e0', ic: '#f59e0b' },
              { label: 'Total Records', value: total,                            icon: <CheckCircle size={20} />,bg: '#f3e8fd', ic: '#7c3aed' },
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

          <div className="filter-tabs" style={{ marginBottom: 16 }}>
            {['overview', 'methods', 'vendors', 'daily'].map(t => (
              <button key={t} className={`filter-tab ${statsTab === t ? 'active' : ''}`} onClick={() => setStatsTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {statsTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div className="card">
                <div className="card-header-row"><h3>Revenue by Method</h3></div>
                {!stats.by_method?.length
                  ? <p className="empty-state">No data</p>
                  : stats.by_method.slice(0, 5).map(m => (
                    <MethodBar key={m.method_name} {...m} revenue={parseFloat(m.revenue)} maxRevenue={maxMethodRevenue} />
                  ))}
              </div>
              <div className="card">
                <div className="card-header-row"><h3>Daily Revenue (Last 30 Days)</h3></div>
                <DailyChart data={stats.daily_30days} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Each bar = 1 day. Hover to see amount.</div>
              </div>
            </div>
          )}

          {statsTab === 'methods' && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header-row"><h3>Payment Methods Breakdown</h3></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Method</th><th>Transactions</th><th>Revenue</th><th>% Share</th></tr></thead>
                  <tbody>
                    {(stats.by_method || []).map(m => (
                      <tr key={m.method_name}>
                        <td style={{ fontWeight: 600 }}>{m.method_name}</td>
                        <td>{m.count}</td>
                        <td><strong>{formatPrice(parseFloat(m.revenue))}</strong></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 60, height: 6, background: '#f1f3f5', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${(parseFloat(m.revenue) / stats.total_revenue) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {stats.total_revenue > 0 ? ((parseFloat(m.revenue) / stats.total_revenue) * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {statsTab === 'vendors' && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header-row"><h3>Top Vendor Revenue</h3></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Shop</th><th>Orders</th><th>Revenue</th><th>Share</th></tr></thead>
                  <tbody>
                    {!(stats.vendor_revenue || []).length && <tr><td colSpan={4} className="empty-row">No data</td></tr>}
                    {(stats.vendor_revenue || []).map((v, i) => {
                      const maxVRev = Math.max(...(stats.vendor_revenue || []).map(x => parseFloat(x.revenue || 0)), 1);
                      return (
                        <tr key={v.shop_name}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                              <span style={{ fontWeight: 600 }}>{v.shop_name}</span>
                            </div>
                          </td>
                          <td>{v.orders}</td>
                          <td><strong>{formatPrice(parseFloat(v.revenue))}</strong></td>
                          <td>
                            <div style={{ width: 80, height: 6, background: '#f1f3f5', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${(parseFloat(v.revenue) / maxVRev) * 100}%`, height: '100%', background: '#2A9D8F', borderRadius: 3 }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {statsTab === 'daily' && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header-row"><h3>Daily Revenue — Last 30 Days</h3></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Revenue</th><th>Chart</th></tr></thead>
                  <tbody>
                    {!(stats.daily_30days || []).length && <tr><td colSpan={3} className="empty-row">No data</td></tr>}
                    {[...(stats.daily_30days || [])].reverse().map((d, i) => {
                      const maxD = Math.max(...(stats.daily_30days || []).map(x => parseFloat(x.revenue || 0)), 1);
                      const pct  = (parseFloat(d.revenue) / maxD) * 100;
                      return (
                        <tr key={i}>
                          <td style={{ fontSize: 13 }}>{d.day}</td>
                          <td><strong>{formatPrice(parseFloat(d.revenue))}</strong></td>
                          <td style={{ width: 200 }}>
                            <div style={{ background: '#f1f3f5', borderRadius: 3, height: 8, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Filter bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: 34, margin: 0 }} placeholder="Search by customer name or email…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" style={{ width: 180, margin: 0 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Payments table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{total} payment{total !== 1 ? 's' : ''} found</span>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Payment ID</th><th>Customer</th><th>Amount</th><th>Method</th>
                  <th>Status</th><th>Ref #</th><th>Paid At</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!payments.length && (
                  <tr><td colSpan={8} className="empty-row">
                    <DollarSign size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 8px' }} />
                    No payments found
                  </td></tr>
                )}
                {payments.map(p => (
                  <tr key={p.payment_id}>
                    <td><code className="code-sm">{p.payment_id.slice(0, 8)}…</code></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.email}</div>
                    </td>
                    <td><strong style={{ fontSize: 15 }}>{formatPrice(p.amount)}</strong></td>
                    <td style={{ fontSize: 13 }}>{p.method_name || '—'}</td>
                    <td><span className={`badge badge-${statusBadge(p.status)}`}>{p.status}</span></td>
                    <td><code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.transaction_ref ? p.transaction_ref.slice(0, 16) + '…' : '—'}</code></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.paid_at ? formatDate(p.paid_at) : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {p.status === 'completed' && (
                          <>
                            <button className="btn btn-xs btn-outline" onClick={() => setSlipId(p.payment_id)} title="View & Download Slip">
                              <Eye size={12} /> Slip
                            </button>
                            <button className="btn btn-xs" style={{ background: '#fde8ea', color: '#E63946', border: 'none' }}
                              onClick={() => refund(p.payment_id)} title="Refund Payment">
                              <RefreshCw size={12} /> Refund
                            </button>
                          </>
                        )}
                        {p.status === 'pending'  && <span style={{ fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Awaiting</span>}
                        {p.status === 'refunded' && <span style={{ fontSize: 11, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> Refunded</span>}
                        {p.status === 'failed'   && <span style={{ fontSize: 11, color: '#e63946', display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={12} /> Failed</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ padding: '0 20px 16px' }}>
          <Pagination page={page} total={total} limit={15} onPage={setPage} />
        </div>
      </div>

      {slipId && <PaymentSlipModal paymentId={slipId} onClose={() => setSlipId(null)} />}
    </div>
  );
};

export default AdminPayments;
