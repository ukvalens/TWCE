import { useEffect, useState, useCallback } from 'react';
import { Search, MessageSquare, X, Send } from 'lucide-react';
import api from '../../../utils/api';
import { formatDate, statusBadge } from '../../../utils/helpers';
import { Pagination } from './AdminUsers';
import toast from 'react-hot-toast';

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
        <strong style={{ fontSize: 16 }}>{title}</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
      </div>
      <div style={{ padding: 22 }}>{children}</div>
    </div>
  </div>
);

const TicketThread = ({ ticket, onStatusChange }) => {
  const [replies, setReplies] = useState([]);
  const [reply, setReply]     = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/communications/tickets/${ticket.ticket_id}/replies`).then(r => setReplies(r.data || [])).catch(() => {});
  }, [ticket.ticket_id]);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/communications/tickets/${ticket.ticket_id}/replies`, { message: reply });
      setReply('');
      const { data } = await api.get(`/communications/tickets/${ticket.ticket_id}/replies`);
      setReplies(data || []);
      toast.success('Reply sent');
    } catch { toast.error('Failed to send reply'); }
    finally { setSending(false); }
  };

  return (
    <div>
      <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{ticket.subject}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>From: {ticket.full_name} · {formatDate(ticket.created_at)}</div>
        <div style={{ marginTop: 10, fontSize: 14 }}>{ticket.message}</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Status:</span>
        <select className="form-control" style={{ width: 160, fontSize: 13, padding: '5px 10px' }}
          value={ticket.status} onChange={e => onStatusChange(ticket.ticket_id, e.target.value)}>
          {['open','in_progress','resolved','closed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
        {replies.map((r, i) => (
          <div key={i} style={{
            padding: '10px 14px', borderRadius: 10, maxWidth: '85%', fontSize: 13,
            background: r.full_name === ticket.full_name ? '#f0f4f8' : '#e8f4fd',
            alignSelf: r.full_name === ticket.full_name ? 'flex-start' : 'flex-end',
          }}>
            <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 3, color: 'var(--text-muted)' }}>{r.full_name}</div>
            {r.message}
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{formatDate(r.created_at)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <textarea className="form-control" rows={2} placeholder="Type a reply…" value={reply} onChange={e => setReply(e.target.value)} style={{ resize: 'none' }} />
        <button className="btn btn-primary" onClick={send} disabled={sending || !reply.trim()} style={{ flexShrink: 0 }}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};

const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [status, setStatus]   = useState('');
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status) params.append('status', status);
      const { data } = await api.get(`/communications/tickets?${params}`);
      const rows = data.data || [];
      const filtered = search ? rows.filter(t => t.subject?.toLowerCase().includes(search.toLowerCase()) || t.full_name?.toLowerCase().includes(search.toLowerCase())) : rows;
      setTickets(filtered);
      setTotal(data.total || filtered.length);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, newStatus) => {
    try { await api.put(`/communications/tickets/${id}`, { status: newStatus }); toast.success('Updated');
      if (selected?.ticket_id === id) setSelected(t => ({ ...t, status: newStatus }));
      load();
    } catch { toast.error('Failed'); }
  };

  const priorityColor = { open: '#fde8ea', in_progress: '#fff3e0', resolved: '#e8fdf6', closed: '#f0f0f0' };

  return (
    <div>
      <div className="page-header"><h1>Support Tickets</h1><p>Manage customer support requests</p></div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {['open','in_progress','resolved','closed'].map(s => (
          <div key={s} style={{ background: priorityColor[s], borderRadius: 10, padding: '10px 18px', textAlign: 'center', cursor: 'pointer', border: status === s ? '2px solid var(--primary)' : '2px solid transparent' }}
            onClick={() => { setStatus(status === s ? '' : s); setPage(1); }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{tickets.filter(t => t.status === s).length}</div>
            <div style={{ fontSize: 11, textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-muted)' }}>{s.replace('_', ' ')}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: 34 }} placeholder="Search by subject or customer…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" style={{ width: 180 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Tickets</option>
            {['open','in_progress','resolved','closed'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>{total} tickets</div>
        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th>Customer</th><th>Assigned To</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {tickets.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>No tickets found</td></tr>}
                {tickets.map(t => (
                  <tr key={t.ticket_id}>
                    <td><strong style={{ fontSize: 13 }}>{t.subject}</strong></td>
                    <td>
                      <div style={{ fontSize: 13 }}>{t.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.email}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{t.assigned_to || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td><span className={`badge badge-${statusBadge(t.status)}`}>{t.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(t.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" style={{ background: '#e8f4fd', color: '#0077B6', border: 'none' }}
                          onClick={() => setSelected(t)} title="View & Reply"><MessageSquare size={13} /></button>
                        <select className="form-control" style={{ fontSize: 12, padding: '4px 8px', width: 130 }}
                          value={t.status} onChange={e => updateStatus(t.ticket_id, e.target.value)}>
                          {['open','in_progress','resolved','closed'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} limit={15} onPage={setPage} />
      </div>

      {selected && (
        <Modal title={`Ticket — ${selected.subject}`} onClose={() => setSelected(null)}>
          <TicketThread ticket={selected} onStatusChange={(id, s) => { updateStatus(id, s); setSelected(t => ({ ...t, status: s })); }} />
        </Modal>
      )}
    </div>
  );
};

export default AdminTickets;
