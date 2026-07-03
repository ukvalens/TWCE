import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, MessageSquare, Search, UserPlus, X } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ROLE_LABELS = { 1: 'Admin', 2: 'Vendor', 3: 'Customer', 4: 'Support', 5: 'Delivery' };
const ROLE_COLORS = { 1: '#e63946', 2: '#0077B6', 3: '#2A9D8F', 4: '#7c3aed', 5: '#f59e0b' };

const RoleBadge = ({ roleId }) => (
  <span style={{
    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
    background: ROLE_COLORS[roleId] + '20', color: ROLE_COLORS[roleId],
    textTransform: 'uppercase', letterSpacing: '0.5px',
  }}>
    {ROLE_LABELS[roleId] || 'User'}
  </span>
);

const Messages = () => {
  const { user }  = useAuth();
  const location  = useLocation();
  const bottomRef = useRef(null);

  const [convos, setConvos]           = useState([]);
  const [contacts, setContacts]       = useState([]);
  const [active, setActive]           = useState(null);
  const [messages, setMessages]       = useState([]);
  const [text, setText]               = useState('');
  const [search, setSearch]           = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]         = useState(false);

  // Load conversations + contacts
  useEffect(() => {
    Promise.all([
      api.get('/communications/messages'),
      api.get('/communications/messages/contacts'),
    ]).then(([c, u]) => {
      setConvos(c.data || []);
      setContacts(u.data || []);
    }).catch(() => {}).finally(() => setLoadingConvos(false));
  }, []);

  // Auto-open conversation from ?to=userId
  useEffect(() => {
    const toId = new URLSearchParams(location.search).get('to');
    if (!toId) return;
    // Check if already in convos
    const found = convos.find(c => c.other_user_id === toId);
    if (found) {
      setActive({ user_id: found.other_user_id, full_name: found.other_user, role_id: found.other_role_id });
      return;
    }
    // Find in contacts
    const contact = contacts.find(c => c.user_id === toId);
    if (contact) {
      setActive({ user_id: contact.user_id, full_name: contact.full_name, role_id: contact.role_id });
    }
  }, [location.search, convos, contacts]);

  // Load messages when active changes
  useEffect(() => {
    if (!active) return;
    setLoadingMsgs(true);
    api.get(`/communications/messages/${active.user_id}`)
      .then(r => setMessages(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [active]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll every 5s for new messages
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      api.get(`/communications/messages/${active.user_id}`)
        .then(r => setMessages(r.data || []))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [active]);

  const openConvo = (contact) => {
    setActive({ user_id: contact.user_id, full_name: contact.full_name, role_id: contact.role_id });
    setShowNewChat(false);
    setContactSearch('');
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    setSending(true);
    try {
      const { data } = await api.post('/communications/messages', {
        receiver_id: active.user_id,
        content: text.trim(),
      });
      setMessages(prev => [...prev, { ...data, sender_name: user.full_name }]);
      const preview = text.trim();
      setText('');
      setConvos(prev => {
        const exists = prev.find(c => c.other_user_id === active.user_id);
        if (exists) {
          return prev.map(c =>
            c.other_user_id === active.user_id
              ? { ...c, content: preview, sent_at: new Date().toISOString() }
              : c
          );
        }
        return [{
          other_user_id: active.user_id,
          other_user: active.full_name,
          other_role_id: active.role_id,
          content: preview,
          sent_at: new Date().toISOString(),
        }, ...prev];
      });
    } catch {
      toast.error('Failed to send message');
    } finally { setSending(false); }
  };

  const filteredConvos    = convos.filter(c => c.other_user?.toLowerCase().includes(search.toLowerCase()));
  const filteredContacts  = contacts.filter(c =>
    c.full_name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    ROLE_LABELS[c.role_id]?.toLowerCase().includes(contactSearch.toLowerCase())
  );

  // Group contacts by role for display
  const grouped = filteredContacts.reduce((acc, c) => {
    const label = ROLE_LABELS[c.role_id] || 'Other';
    if (!acc[label]) acc[label] = [];
    acc[label].push(c);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Messages</h1>
          <p>Chat with admins, vendors, customers and delivery personnel</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewChat(true)}>
          <UserPlus size={16} /> New Conversation
        </button>
      </div>

      <div className="messages-layout">
        {/* ── Conversations sidebar ── */}
        <div className="convos-panel">
          <div className="convos-search">
            <Search size={16} />
            <input
              placeholder="Search conversations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loadingConvos ? (
              <div className="spinner" style={{ margin: '24px auto' }} />
            ) : filteredConvos.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <MessageSquare size={28} style={{ opacity: 0.25, marginBottom: 8 }} />
                <p>No conversations yet</p>
                <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => setShowNewChat(true)}>
                  Start one
                </button>
              </div>
            ) : (
              filteredConvos.map(c => (
                <div
                  key={c.other_user_id}
                  className={`convo-item ${active?.user_id === c.other_user_id ? 'active' : ''}`}
                  onClick={() => setActive({ user_id: c.other_user_id, full_name: c.other_user, role_id: c.other_role_id })}
                >
                  <div className="convo-avatar" style={{ background: ROLE_COLORS[c.other_role_id] || '#0077B6' }}>
                    {c.other_user?.[0]?.toUpperCase()}
                  </div>
                  <div className="convo-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="convo-name">{c.other_user}</span>
                      <RoleBadge roleId={c.other_role_id} />
                    </div>
                    <div className="convo-preview">{c.content}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Chat window ── */}
        <div className="chat-panel">
          {!active ? (
            <div className="chat-empty">
              <MessageSquare size={48} style={{ opacity: 0.15, marginBottom: 12 }} />
              <p style={{ fontWeight: 600 }}>Select a conversation</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                or start a new one with the button above
              </p>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <div className="convo-avatar" style={{ background: ROLE_COLORS[active.role_id] || '#0077B6' }}>
                  {active.full_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>{active.full_name}</strong>
                    <RoleBadge roleId={active.role_id} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {ROLE_LABELS[active.role_id]}
                  </div>
                </div>
              </div>

              <div className="chat-messages">
                {loadingMsgs ? (
                  <div className="spinner" style={{ margin: '40px auto' }} />
                ) : messages.length === 0 ? (
                  <div className="chat-empty">
                    <p>No messages yet — say hello! 👋</p>
                  </div>
                ) : (
                  messages.map(m => {
                    const mine = m.sender_id === user?.user_id;
                    return (
                      <div key={m.message_id} className={`message-row ${mine ? 'mine' : 'theirs'}`}>
                        {!mine && (
                          <div className="msg-avatar" style={{ background: ROLE_COLORS[active.role_id] || '#0077B6' }}>
                            {m.sender_name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className={`message-bubble ${mine ? 'mine' : 'theirs'}`}>
                          <p>{m.content}</p>
                          <span className="msg-time">
                            {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form className="chat-input-row" onSubmit={send}>
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={`Message ${active.full_name}…`}
                  className="chat-input"
                  disabled={sending}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-primary chat-send"
                  disabled={sending || !text.trim()}
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ── New Conversation Modal ── */}
      {showNewChat && (
        <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Conversation</h3>
              <button className="modal-close" onClick={() => setShowNewChat(false)}><X size={18} /></button>
            </div>
            <div style={{ padding: '12px 24px 24px' }}>
              <div className="convos-search" style={{ border: '1.5px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
                <Search size={16} />
                <input
                  placeholder="Search by name or role…"
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {Object.keys(grouped).length === 0 ? (
                <p className="empty-state">No contacts found</p>
              ) : (
                Object.entries(grouped).map(([roleLabel, users]) => (
                  <div key={roleLabel} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                      {roleLabel}s
                    </div>
                    {users.map(u => (
                      <div
                        key={u.user_id}
                        className="contact-row"
                        onClick={() => openConvo(u)}
                      >
                        <div className="convo-avatar" style={{ width: 34, height: 34, fontSize: 13, background: ROLE_COLORS[u.role_id] || '#0077B6' }}>
                          {u.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.full_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                        <RoleBadge roleId={u.role_id} />
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
