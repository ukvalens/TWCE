import { useEffect, useState, useCallback } from 'react';
import { Bell, ShoppingBag, Package, Store, Ticket, Trash2, CheckCheck, Filter } from 'lucide-react';
import api from '../../utils/api';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const TYPE_META = {
  order:   { icon: <ShoppingBag size={16} />, color: '#0077B6', bg: '#e8f4fd', label: 'Order' },
  product: { icon: <Package size={16} />,     color: '#2A9D8F', bg: '#e8fdf6', label: 'Product' },
  vendor:  { icon: <Store size={16} />,        color: '#f59e0b', bg: '#fff3e0', label: 'Vendor' },
  ticket:  { icon: <Ticket size={16} />,       color: '#e63946', bg: '#fde8ea', label: 'Ticket' },
  general: { icon: <Bell size={16} />,         color: '#6b7280', bg: '#f3f4f6', label: 'General' },
};

const getMeta = (type) => TYPE_META[type] || TYPE_META.general;

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all'); // all | unread | type

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/communications/notifications');
      setNotifications(data || []);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    await api.put(`/communications/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await api.put('/communications/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('All marked as read');
  };

  const deleteOne = async (id) => {
    await api.delete(`/communications/notifications/${id}`).catch(() => {});
    setNotifications(prev => prev.filter(n => n.notification_id !== id));
  };

  const deleteAll = async () => {
    if (!window.confirm('Clear all notifications?')) return;
    await api.delete('/communications/notifications/all').catch(() => {});
    setNotifications([]);
    toast.success('All notifications cleared');
  };

  const types = ['all', 'unread', ...Object.keys(TYPE_META)];

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'all')    return true;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You\'re all caught up!'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {unreadCount > 0 && (
            <button className="btn btn-outline btn-sm" onClick={markAllRead}><CheckCheck size={15} /> Mark all read</button>
          )}
          {notifications.length > 0 && (
            <button className="btn btn-sm" style={{ background: '#fde8ea', color: '#e63946', border: 'none' }} onClick={deleteAll}>
              <Trash2 size={15} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        <Filter size={15} style={{ alignSelf: 'center', color: 'var(--text-muted)', marginRight: 4 }} />
        {types.map(t => {
          const meta = t !== 'all' && t !== 'unread' ? getMeta(t) : null;
          const count = t === 'all' ? notifications.length
            : t === 'unread' ? unreadCount
            : notifications.filter(n => n.type === t).length;
          if (count === 0 && t !== 'all' && t !== 'unread') return null;
          return (
            <button key={t} onClick={() => setFilter(t)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: filter === t ? (meta?.color || 'var(--primary)') : 'var(--bg-secondary)',
                color: filter === t ? '#fff' : 'var(--text-muted)',
                transition: 'all .15s',
              }}>
              {t === 'all' ? 'All' : t === 'unread' ? `Unread (${unreadCount})` : meta?.label} {t !== 'unread' && count > 0 ? `(${count})` : ''}
            </button>
          );
        })}
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <Bell size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p>No notifications here</p>
            </div>
          )}
          {filtered.map(n => {
            const meta = getMeta(n.type);
            return (
              <div key={n.notification_id}
                className="card"
                onClick={() => !n.is_read && markRead(n.notification_id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px',
                  borderLeft: `4px solid ${n.is_read ? 'transparent' : meta.color}`,
                  background: n.is_read ? 'var(--bg)' : meta.bg,
                  cursor: n.is_read ? 'default' : 'pointer',
                  transition: 'all .15s',
                }}>
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                  background: meta.bg, color: meta.color, border: `1.5px solid ${meta.color}30`,
                }}>
                  {meta.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <strong style={{ fontSize: 14, color: n.is_read ? 'var(--text-muted)' : 'var(--text)' }}>{n.title}</strong>
                    {!n.is_read && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{formatDate(n.created_at)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{n.message}</p>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                </div>

                {/* Delete */}
                <button onClick={e => { e.stopPropagation(); deleteOne(n.notification_id); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                  title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
