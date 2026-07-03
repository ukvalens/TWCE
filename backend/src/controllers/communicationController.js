const { query } = require('../config/db');
const { paginate } = require('../utils/helpers');

// ─── Notify helper ─────────────────────────────────────────
const notify = (user_id, title, message, type = 'general') =>
  query('INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)', [user_id, title, message, type]).catch(() => {});

module.exports.notify = notify;

// ─── Notifications ─────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const markNotificationRead = async (req, res, next) => {
  try {
    await query('UPDATE notifications SET is_read=TRUE WHERE notification_id=$1 AND user_id=$2', [req.params.id, req.user.user_id]);
    res.json({ message: 'Notification marked as read' });
  } catch (err) { next(err); }
};

const markAllRead = async (req, res, next) => {
  try {
    await query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.user_id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};

const deleteNotification = async (req, res, next) => {
  try {
    await query('DELETE FROM notifications WHERE notification_id=$1 AND user_id=$2', [req.params.id, req.user.user_id]);
    res.json({ message: 'Notification deleted' });
  } catch (err) { next(err); }
};

const deleteAllNotifications = async (req, res, next) => {
  try {
    await query('DELETE FROM notifications WHERE user_id=$1', [req.user.user_id]);
    res.json({ message: 'All notifications cleared' });
  } catch (err) { next(err); }
};

// ─── Contactable users (role-based) ───────────────────────
const getContactableUsers = async (req, res, next) => {
  try {
    const { role_id, user_id } = req.user;
    const roleMap = {
      1: [1, 2, 3, 4, 5],
      2: [1, 3, 5],
      3: [1, 2, 4],
      4: [1, 2, 3, 5],
      5: [1, 2],
    };
    const allowed = roleMap[role_id] || [];
    if (!allowed.length) return res.json([]);
    const placeholders = allowed.map((_, i) => `$${i + 2}`).join(',');
    const result = await query(
      `SELECT user_id, full_name, email, role_id FROM users
       WHERE role_id IN (${placeholders}) AND user_id != $1 AND status = 'active'
       ORDER BY role_id, full_name`,
      [user_id, ...allowed]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const getUnreadMessageCount = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT COUNT(*) FROM messages WHERE receiver_id=$1 AND is_read=FALSE',
      [req.user.user_id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) { next(err); }
};

// ─── Messages ──────────────────────────────────────────────
const getConversations = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DISTINCT ON (LEAST(sender_id::text, receiver_id::text) || GREATEST(sender_id::text, receiver_id::text))
              m.*, u.full_name AS other_user,
              CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END AS other_user_id
       FROM messages m
       JOIN users u ON u.user_id = CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END
       WHERE m.sender_id=$1 OR m.receiver_id=$1
       ORDER BY LEAST(sender_id::text, receiver_id::text) || GREATEST(sender_id::text, receiver_id::text), m.sent_at DESC`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const getMessages = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT m.*, u.full_name AS sender_name FROM messages m JOIN users u ON m.sender_id=u.user_id
       WHERE (m.sender_id=$1 AND m.receiver_id=$2) OR (m.sender_id=$2 AND m.receiver_id=$1)
       ORDER BY m.sent_at`,
      [req.user.user_id, req.params.userId]
    );
    await query('UPDATE messages SET is_read=TRUE WHERE receiver_id=$1 AND sender_id=$2', [req.user.user_id, req.params.userId]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

const sendMessage = async (req, res, next) => {
  try {
    const { receiver_id, content } = req.body;
    const result = await query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1,$2,$3) RETURNING *',
      [req.user.user_id, receiver_id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// ─── Support Tickets ───────────────────────────────────────
const createTicket = async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    if (!subject?.trim()) return res.status(400).json({ message: 'Subject is required' });
    if (!message?.trim() || message.trim().length < 10)
      return res.status(400).json({ message: 'Please describe your issue (at least 10 characters)' });

    const result = await query(
      'INSERT INTO support_tickets (user_id, subject, message) VALUES ($1,$2,$3) RETURNING *',
      [req.user.user_id, subject.trim(), message.trim()]
    );

    // Notify all support agents and admins
    const staff = await query("SELECT user_id FROM users WHERE role_id IN (1,4) AND status='active'");
    for (const s of staff.rows) {
      notify(s.user_id, 'New Support Ticket', `${req.user.full_name} submitted a ticket: "${subject.trim()}"`, 'ticket');
    }

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const getMyTickets = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT st.*,
              (SELECT COUNT(*) FROM ticket_replies tr WHERE tr.ticket_id = st.ticket_id) AS reply_count
       FROM support_tickets st
       WHERE st.user_id = $1
       ORDER BY st.created_at DESC`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const getTicketById = async (req, res, next) => {
  try {
    const ticket = await query('SELECT st.*, u.full_name FROM support_tickets st JOIN users u ON st.user_id=u.user_id WHERE st.ticket_id=$1', [req.params.id]);
    if (!ticket.rows.length) return res.status(404).json({ message: 'Ticket not found' });

    // Customer can only view their own ticket
    if (req.user.role_id === 3 && ticket.rows[0].user_id !== req.user.user_id)
      return res.status(403).json({ message: 'Forbidden' });

    const replies = await query(
      `SELECT tr.*, u.full_name, tr.user_id FROM ticket_replies tr JOIN users u ON tr.user_id=u.user_id WHERE tr.ticket_id=$1 ORDER BY tr.created_at`,
      [req.params.id]
    );
    res.json({ ...ticket.rows[0], replies: replies.rows });
  } catch (err) { next(err); }
};

const replyToTicket = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

    const ticket = await query('SELECT * FROM support_tickets WHERE ticket_id=$1', [req.params.id]);
    if (!ticket.rows.length) return res.status(404).json({ message: 'Ticket not found' });

    const result = await query(
      'INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, req.user.user_id, message.trim()]
    );

    // If support/admin is replying, notify the customer; if customer is replying, notify support
    const t = ticket.rows[0];
    if (req.user.role_id !== 3) {
      // Support/admin replied → notify customer
      notify(t.user_id, 'Support Reply', `Your ticket "${t.subject}" has a new reply from our support team.`, 'ticket');
      // Auto-set status to in_progress if it was open
      if (t.status === 'open') {
        await query("UPDATE support_tickets SET status='in_progress' WHERE ticket_id=$1", [req.params.id]);
      }
    } else {
      // Customer replied → notify support
      const staff = await query("SELECT user_id FROM users WHERE role_id IN (1,4) AND status='active'");
      for (const s of staff.rows) {
        notify(s.user_id, 'Ticket Reply', `Customer replied on ticket: "${t.subject}"`, 'ticket');
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const updateTicketStatus = async (req, res, next) => {
  try {
    const { status, assigned_to } = req.body;
    const result = await query('UPDATE support_tickets SET status=COALESCE($1,status), assigned_to=COALESCE($2,assigned_to) WHERE ticket_id=$3 RETURNING *', [status, assigned_to, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const getAllTickets = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const result = await query(
      `SELECT st.*, u.full_name, u.email FROM support_tickets st JOIN users u ON st.user_id=u.user_id ORDER BY st.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const count = await query('SELECT COUNT(*) FROM support_tickets');
    res.json({ data: result.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { next(err); }
};

module.exports = {
  notify,
  getNotifications, markNotificationRead, markAllRead, deleteNotification, deleteAllNotifications,
  getUnreadMessageCount,
  getContactableUsers,
  getConversations, getMessages, sendMessage,
  createTicket, getMyTickets, getTicketById, replyToTicket, updateTicketStatus, getAllTickets,
};
