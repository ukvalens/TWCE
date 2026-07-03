import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, X, Send, MessageSquare, Clock, CheckCircle,
  ChevronDown, ChevronUp, AlertCircle, Ticket,
} from 'lucide-react';
import api from '../../../utils/api';
import { formatDate, statusBadge } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

// ─── Status meta ───────────────────────────────────────────────────────────────
const STATUS_META = {
  open:        { label: 'Open',        color: '#e63946', bg: '#fde8ea', icon: <AlertCircle size={13} /> },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: '#fff3e0', icon: <Clock size={13} />       },
  resolved:    { label: 'Resolved',    color: '#2A9D8F', bg: '#e8fdf6', icon: <CheckCircle size={13} /> },
  closed:      { label: 'Closed',      color: '#6c757d', bg: '#e9ecef', icon: <CheckCircle size={13} /> },
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.open;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      background: m.bg, color: m.color,
    }}>
      {m.icon} {m.label}
    </span>
  );
};

// ─── New Ticket Modal ──────────────────────────────────────────────────────────
const NewTicketModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ subject: '', message: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) return toast.error('Subject is required');
    if (form.message.trim().length < 10) return toast.error('Please describe your issue (at least 10 characters)');
    setSaving(true);
    try {
      const { data } = await api.post('/communications/tickets', form);
      toast.success('Ticket submitted! Our support team will respond shortly.');
      onCreated(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit ticket');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Support Ticket</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input
              className="form-control"
              placeholder="e.g. My order hasn't arrived yet"
              value={form.subject}
              onChange={e => set('subject', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Describe your issue *</label>
            <textarea
              className="form-control"
              rows={5}
              placeholder="Please provide as much detail as possible so we can help you faster…"
              value={form.message}
              onChange={e => set('message', e.target.value)}
              required
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {form.message.length} characters
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Ticket Thread (expanded inline) ──────────────────────────────────────────
const TicketThread = ({ ticket, currentUser, onClose, onStatusChange }) => {
  const [replies,  setReplies]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [message,  setMessage]  = useState('');
  const [sending,  setSending]  = useState(false);
  const [closing,  setClosing]  = useState(false);
  const bottomRef = useRef(null);

  const loadReplies = useCallback(async () => {
    try {
      const { data } = await api.get(`/communications/tickets/${ticket.ticket_id}`);
      setReplies(data.replies || []);
    } catch { toast.error('Failed to load replies'); }
    finally { setLoading(false); }
  }, [ticket.ticket_id]);

  useEffect(() => { loadReplies(); }, [loadReplies]);

  // Scroll to bottom when replies load or new one arrives
  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const send = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post(`/communications/tickets/${ticket.ticket_id}/reply`, { message: message.trim() });
      setMessage('');
      await loadReplies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally { setSending(false); }
  };

  const closeTicket = async () => {
    if (!window.confirm('Mark this ticket as closed?')) return;
    setClosing(true);
    try {
      await api.put(`/communications/tickets/${ticket.ticket_id}`, { status: 'closed' });
      toast.success('Ticket closed');
      onStatusChange(ticket.ticket_id, 'closed');
      onClose();
    } catch { toast.error('Failed to close ticket'); }
    finally { setClosing(false); }
  };

  const isClosed = ['resolved', 'closed'].includes(ticket.status);

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
          width: '100%', maxWidth: 540,
          background: '#fff', height: '100%',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, background: '#fff', flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{ticket.subject}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <StatusBadge status={ticket.status} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Opened {formatDate(ticket.created_at)}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {!isClosed && (
              <button
                className="btn btn-outline btn-sm"
                onClick={closeTicket}
                disabled={closing}
                style={{ fontSize: 12 }}
              >
                {closing ? '…' : 'Close Ticket'}
              </button>
            )}
            <button className="modal-close" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', background: '#f8f9fa' }}>
          {/* Original message */}
          <div style={{
            background: '#fff', borderRadius: 10, padding: '12px 14px',
            marginBottom: 12, border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Your message
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.message}</div>
          </div>

          {/* Replies */}
          {loading ? (
            <div className="spinner" />
          ) : replies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              No replies yet. Our support team will respond shortly.
            </div>
          ) : (
            replies.map((r, i) => {
              const isMe = r.user_id === currentUser?.user_id;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    marginBottom: 10,
                  }}
                >
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: 12,
                    background: isMe ? '#0077B6' : '#fff',
                    color: isMe ? '#fff' : 'var(--text)',
                    border: isMe ? 'none' : '1px solid var(--border)',
                    fontSize: 13, lineHeight: 1.6,
                    borderBottomRightRadius: isMe ? 2 : 12,
                    borderBottomLeftRadius:  isMe ? 12 : 2,
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, marginBottom: 4,
                      opacity: 0.7, textTransform: 'uppercase',
                    }}>
                      {isMe ? 'You' : r.full_name}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{r.message}</div>
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                      {formatDate(r.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Reply input */}
        {isClosed ? (
          <div style={{
            padding: '14px 22px', borderTop: '1px solid var(--border)',
            background: '#f8f9fa', textAlign: 'center',
            fontSize: 13, color: 'var(--text-muted)', flexShrink: 0,
          }}>
            This ticket is {ticket.status}. You cannot send new replies.
          </div>
        ) : (
          <form
            onSubmit={send}
            style={{
              padding: '14px 22px', borderTop: '1px solid var(--border)',
              background: '#fff', display: 'flex', gap: 10, flexShrink: 0,
            }}
          >
            <textarea
              className="form-control"
              rows={2}
              placeholder="Type your reply…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
              style={{ resize: 'none', flex: 1 }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || !message.trim()}
              style={{ flexShrink: 0, alignSelf: 'flex-end' }}
            >
              <Send size={15} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const CustomerTickets = () => {
  const { user }                       = useAuth();
  const [tickets,    setTickets]       = useState([]);
  const [loading,    setLoading]       = useState(true);
  const [filter,     setFilter]        = useState('all');
  const [showNew,    setShowNew]       = useState(false);
  const [thread,     setThread]        = useState(null); // ticket object

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/communications/tickets/my');
      setTickets(data || []);
    } catch { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onCreated = (ticket) => {
    setTickets(prev => [ticket, ...prev]);
  };

  const onStatusChange = (id, status) => {
    setTickets(prev => prev.map(t => t.ticket_id === id ? { ...t, status } : t));
  };

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

  // Counts per status
  const counts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Support Tickets</h1>
          <p>Submit a request and track responses from our support team</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* Summary cards */}
      <div className="stats-row" style={{ marginBottom: 20 }}>
        {[
          { key: 'all',        label: 'Total',       color: '#e8f4fd', ic: '#0077B6' },
          { key: 'open',       label: 'Open',        color: '#fde8ea', ic: '#e63946' },
          { key: 'in_progress',label: 'In Progress', color: '#fff3e0', ic: '#f59e0b' },
          { key: 'resolved',   label: 'Resolved',    color: '#e8fdf6', ic: '#2A9D8F' },
        ].map(s => (
          <div
            key={s.key}
            className="stat-card"
            style={{ cursor: 'pointer', outline: filter === s.key ? `2px solid ${s.ic}` : 'none' }}
            onClick={() => setFilter(s.key)}
          >
            <div className="stat-icon" style={{ background: s.color, color: s.ic }}>
              <Ticket size={20} />
            </div>
            <div>
              <div className="stat-value">{s.key === 'all' ? tickets.length : (counts[s.key] || 0)}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
          <button
            key={s}
            className={`filter-tab ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            <span className="tab-count">
              {s === 'all' ? tickets.length : (counts[s] || 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Ticket list */}
      {loading ? <div className="spinner" /> : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <MessageSquare size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 16 }}>
            {filter === 'all' ? 'No support tickets yet' : `No ${filter.replace('_', ' ')} tickets`}
          </p>
          {filter === 'all' && (
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <Plus size={15} /> Submit Your First Ticket
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(t => {
            const meta = STATUS_META[t.status] || STATUS_META.open;
            return (
              <div
                key={t.ticket_id}
                className="card"
                style={{
                  cursor: 'pointer', padding: '16px 20px',
                  borderLeft: `4px solid ${meta.color}`,
                  transition: 'box-shadow .15s',
                }}
                onClick={() => setThread(t)}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Subject */}
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t.subject}</div>
                    {/* Preview */}
                    <div style={{
                      fontSize: 13, color: 'var(--text-muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: 400,
                    }}>
                      {t.message}
                    </div>
                    {/* Meta */}
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <StatusBadge status={t.status} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Opened {formatDate(t.created_at)}
                      </span>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div style={{ color: 'var(--text-muted)', flexShrink: 0, paddingTop: 2 }}>
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New ticket modal */}
      {showNew && (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          onCreated={onCreated}
        />
      )}

      {/* Ticket thread drawer */}
      {thread && (
        <TicketThread
          ticket={thread}
          currentUser={user}
          onClose={() => setThread(null)}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
};

export default CustomerTickets;
