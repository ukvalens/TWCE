import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ShoppingBag, DollarSign, Clock, CheckCircle, Truck, XCircle,
  Search, ChevronLeft, ChevronRight, Eye, X, MessageSquare,
  MapPin, CreditCard, Package, AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { formatPrice, formatDate, statusBadge, imgSrc } from '../../../utils/helpers';
import toast from 'react-hot-toast';

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_FLOW = {
  pending:   { next: 'confirmed', label: 'Confirm Order',   color: '#f59e0b' },
  confirmed: { next: 'shipped',   label: 'Mark as Shipped', color: '#0077B6' },
  shipped:   { next: 'delivered', label: 'Mark Delivered',  color: '#2A9D8F' },
};

const STATUS_ICONS = {
  pending:   <Clock size={15} />,
  confirmed: <CheckCircle size={15} />,
  shipped:   <Truck size={15} />,
  delivered: <CheckCircle size={15} />,
  cancelled: <XCircle size={15} />,
};

// ─── Progress Stepper ─────────────────────────────────────────────────────────
const STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];
const STEP_LABELS = { pending: 'Order Placed', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered' };
const STEP_ICONS  = { pending: Clock, confirmed: CheckCircle, shipped: Truck, delivered: CheckCircle };

const OrderStepper = ({ status }) => {
  const isCancelled = status === 'cancelled';
  const activeIdx   = STEPS.indexOf(status);
  return (
    <div style={{ padding: '16px 0 8px' }}>
      {isCancelled ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 10,
          background: '#fde8ea', color: '#e63946',
        }}>
          <XCircle size={18} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>This order was cancelled</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {STEPS.map((step, i) => {
            const done    = i < activeIdx;
            const current = i === activeIdx;
            const Icon    = STEP_ICONS[step];
            return (
              <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {/* connector line before */}
                {i > 0 && (
                  <div style={{
                    position: 'absolute', top: 16, right: '50%', width: '100%', height: 3,
                    background: done || current ? '#0077B6' : '#e5e7eb',
                    zIndex: 0,
                  }} />
                )}
                {/* circle */}
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', zIndex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: current ? '#0077B6' : done ? '#2A9D8F' : '#e5e7eb',
                  color: current || done ? '#fff' : '#adb5bd',
                  border: current ? '3px solid #cce5f6' : 'none',
                  flexShrink: 0,
                }}>
                  <Icon size={15} />
                </div>
                <div style={{
                  fontSize: 10, fontWeight: current ? 700 : 500, marginTop: 6,
                  color: current ? '#0077B6' : done ? '#2A9D8F' : '#adb5bd',
                  textAlign: 'center', whiteSpace: 'nowrap',
                }}>
                  {STEP_LABELS[step]}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Order Detail Drawer ───────────────────────────────────────────────────────
const OrderDrawer = ({ orderId, onClose, onStatusChanged }) => {
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/orders/${orderId}/items`)
      .then(r => setOrder(r.data))
      .catch(() => toast.error('Failed to load order details'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const advance = async () => {
    const flow = STATUS_FLOW[order.status];
    if (!flow) return;
    setActing(true);
    try {
      await api.put(`/orders/${orderId}/status`, { status: flow.next });
      toast.success(`Order marked as ${flow.next}`);
      setOrder(o => ({ ...o, status: flow.next }));
      onStatusChanged(orderId, flow.next);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally { setActing(false); }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel this order? Stock will be restored.')) return;
    setActing(true);
    try {
      await api.put(`/orders/${orderId}/cancel`);
      toast.success('Order cancelled');
      setOrder(o => ({ ...o, status: 'cancelled' }));
      onStatusChanged(orderId, 'cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel this order');
    } finally { setActing(false); }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 560, background: 'var(--bg-primary, #fff)',
          height: '100%', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border-color, #e5e7eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'var(--bg-primary, #fff)', zIndex: 1,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Order Details
            </h3>
            {order && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                #{order.invoice_number || orderId.slice(0, 8).toUpperCase()}
              </div>
            )}
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : !order ? (
          <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center' }}>
            Failed to load order.
          </div>
        ) : (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Progress stepper */}
            <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 16px' }}>
              <OrderStepper status={order.status} />
            </div>

            {/* Action bar */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STATUS_FLOW[order.status] && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={advance}
                  disabled={acting}
                  style={{
                    flex: 1, justifyContent: 'center',
                    background: STATUS_FLOW[order.status].color,
                    borderColor: STATUS_FLOW[order.status].color,
                  }}
                >
                  {acting ? '…' : STATUS_FLOW[order.status].label}
                </button>
              )}
              {['pending', 'confirmed'].includes(order.status) && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={cancel}
                  disabled={acting}
                >
                  <XCircle size={14} /> Cancel Order
                </button>
              )}
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { onClose(); navigate(`/dashboard/messages?to=${order.user_id}`); }}
                title="Message Customer"
              >
                <MessageSquare size={14} /> Message
              </button>
            </div>

            {/* Customer Info */}
            <Section title="Customer" icon={<Package size={15} />}>
              <Row label="Name"  value={order.full_name || '—'} />
              <Row label="Email" value={order.email || '—'} />
              <Row label="Phone" value={order.phone || '—'} />
            </Section>

            {/* Delivery Address */}
            <Section title="Delivery Address" icon={<MapPin size={15} />}>
              {order.street ? (
                <>
                  <Row label="Street"  value={order.street} />
                  <Row label="City"    value={order.city} />
                  <Row label="Country" value={order.country} />
                </>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No address provided</p>
              )}
            </Section>

            {/* Payment */}
            <Section title="Payment" icon={<CreditCard size={15} />}>
              <Row label="Method"  value={order.method_name || '—'} />
              <Row label="Status"  value={
                <span className={`badge badge-${statusBadge(order.pay_status || order.payment_status)}`}>
                  {order.pay_status || order.payment_status}
                </span>
              } />
              <Row label="Amount"  value={<strong>{formatPrice(order.pay_amount || order.total_amount)}</strong>} />
              {order.paid_at && <Row label="Paid at" value={formatDate(order.paid_at)} />}
            </Section>

            {/* Items */}
            <Section title={`Items (${order.items?.length || 0})`} icon={<ShoppingBag size={15} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(order.items || []).map(item => (
                  <div key={item.order_item_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0', borderBottom: '1px solid var(--border-color, #e5e7eb)',
                  }}>
                    {item.image ? (
                      <img
                        src={imgSrc(item.image)}
                        alt={item.name}
                        style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, flexShrink: 0, background: '#f8f9fa', border: '1px solid var(--border)' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{
                        width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                        background: 'var(--bg-secondary, #f0f0f0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Package size={20} color="var(--text-muted)" />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Qty: {item.quantity} × {formatPrice(item.price)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, fontWeight: 700 }}>
                  <span>Total</span>
                  <span>{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            </Section>

            {/* Status History */}
            {order.history?.length > 0 && (
              <Section title="Status History" icon={<Clock size={15} />}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {order.history.map((h, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                        background: statusBadge(h.status) === 'success' ? '#2A9D8F'
                          : statusBadge(h.status) === 'warning' ? '#f59e0b'
                          : statusBadge(h.status) === 'danger' ? '#e63946' : '#6c757d',
                      }} />
                      <div>
                        <span className={`badge badge-${statusBadge(h.status)}`}>{h.status}</span>
                        {h.note && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{h.note}</span>}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatDate(h.changed_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Notes */}
            {order.notes && (
              <Section title="Customer Notes" icon={<AlertCircle size={15} />}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {order.notes}
                </p>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, icon, children }) => (
  <div>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10,
    }}>
      {icon} {title}
    </div>
    {children}
  </div>
);

const Row = ({ label, value }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '5px 0', borderBottom: '1px solid var(--border-color, #f0f0f0)',
    fontSize: 13,
  }}>
    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const VendorOrders = () => {
  const [orders,     setOrders]     = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('all');
  const [search,     setSearch]     = useState('');
  const [searchInput,setSearchInput]= useState('');
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [drawer,     setDrawer]     = useState(null);
  const [advancing,  setAdvancing]  = useState({});
  const navigate = useNavigate();
  const LIMIT = 15;
  const searchTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: LIMIT,
        ...(filter !== 'all' && { status: filter }),
        ...(search && { search }),
      });
      const { data } = await api.get(`/orders?${params}`);
      setOrders(data.data || []);
      setTotal(data.total || 0);
      setStats(data.stats || null);
    } catch {
      toast.error('Failed to load orders');
    } finally { setLoading(false); }
  }, [page, filter, search]);

  useEffect(() => { load(); }, [load]);

  // Debounce search input
  const handleSearch = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  };

  const handleFilterChange = (f) => { setFilter(f); setPage(1); };

  const advanceInline = async (e, orderId, nextStatus) => {
    e.stopPropagation();
    setAdvancing(a => ({ ...a, [orderId]: true }));
    try {
      await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      toast.success(`Order marked as ${nextStatus}`);
      setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: nextStatus } : o));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setAdvancing(a => ({ ...a, [orderId]: false })); }
  };

  const onDrawerStatusChanged = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));
  };

  const pages = Math.ceil(total / LIMIT);

  const statCards = stats ? [
    { label: 'Total Orders',  value: stats.total,     icon: <ShoppingBag size={20} />, color: '#e8f4fd', ic: '#0077B6' },
    { label: 'Pending',       value: stats.pending,   icon: <Clock size={20} />,       color: '#fff3e0', ic: '#f59e0b' },
    { label: 'Shipped',       value: stats.shipped,   icon: <Truck size={20} />,       color: '#e8f0fe', ic: '#4f46e5' },
    { label: 'Delivered',     value: stats.delivered, icon: <CheckCircle size={20} />, color: '#e8fdf6', ic: '#2A9D8F' },
    { label: 'Revenue (paid)',value: formatPrice(stats.total_revenue || 0), icon: <DollarSign size={20} />, color: '#f3e8fd', ic: '#7c3aed' },
    { label: 'Cancelled',     value: stats.cancelled, icon: <XCircle size={20} />,     color: '#fde8ea', ic: '#e63946' },
  ] : [];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Customer Orders</h1>
          <p>Review, fulfil and track orders placed for your products</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-row" style={{ marginBottom: 20 }}>
          {statCards.map(c => (
            <div className="stat-card" key={c.label}>
              <div className="stat-icon" style={{ background: c.color, color: c.ic }}>{c.icon}</div>
              <div>
                <div className="stat-value">{c.value}</div>
                <div className="stat-label">{c.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters + Search */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div className="filter-tabs" style={{ flex: 1, flexWrap: 'wrap' }}>
          {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
            <button
              key={s}
              className={`filter-tab ${filter === s ? 'active' : ''}`}
              onClick={() => handleFilterChange(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {stats && s !== 'all' && (
                <span className="tab-count">{stats[s] ?? ''}</span>
              )}
              {s === 'all' && stats && (
                <span className="tab-count">{stats.total}</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', minWidth: 220 }}>
          <Search size={15} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            className="form-control"
            style={{ paddingLeft: 32, margin: 0 }}
            placeholder="Search customer, invoice…"
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ width: 170 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="empty-row">No orders found</td></tr>
              ) : orders.map(o => {
                const flow = STATUS_FLOW[o.status];
                const busy = advancing[o.order_id];
                return (
                  <tr
                    key={o.order_id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setDrawer(o.order_id)}
                  >
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {o.invoice_number || <code className="code-sm">{o.order_id.slice(0, 8)}</code>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.full_name || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.email || ''}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        background: 'var(--bg-secondary, #f0f0f0)',
                        padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      }}>
                        {o.item_count ?? '—'}
                      </span>
                    </td>
                    <td><strong>{formatPrice(o.total_amount)}</strong></td>
                    <td>
                      <span className={`badge badge-${statusBadge(o.payment_status)}`}>
                        {o.payment_status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${statusBadge(o.status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {STATUS_ICONS[o.status]} {o.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(o.created_at)}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {/* View */}
                        <button
                          className="btn btn-xs btn-outline"
                          title="View Details"
                          onClick={() => setDrawer(o.order_id)}
                        >
                          <Eye size={12} />
                        </button>

                        {/* Advance status */}
                        {flow && (
                          <button
                            className="btn btn-xs btn-primary"
                            style={{ background: flow.color, borderColor: flow.color }}
                            onClick={e => advanceInline(e, o.order_id, flow.next)}
                            disabled={busy}
                            title={flow.label}
                          >
                            {busy ? '…' : flow.label}
                          </button>
                        )}

                        {/* Message */}
                        <button
                          className="btn btn-xs btn-outline"
                          title="Message Customer"
                          onClick={e => { e.stopPropagation(); navigate(`/dashboard/messages?to=${o.user_id}`); }}
                        >
                          <MessageSquare size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', borderTop: '1px solid var(--border-color, #e5e7eb)',
            fontSize: 13,
          }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} orders
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-outline btn-sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                // Show pages around current
                const start = Math.max(1, Math.min(page - 2, pages - 4));
                const n = start + i;
                return (
                  <button
                    key={n}
                    className={`btn btn-sm ${page === n ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                );
              })}
              <button
                className="btn btn-outline btn-sm"
                disabled={page === pages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Drawer */}
      {drawer && (
        <OrderDrawer
          orderId={drawer}
          onClose={() => setDrawer(null)}
          onStatusChanged={onDrawerStatusChanged}
        />
      )}
    </div>
  );
};

export default VendorOrders;
