import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, MessageSquare, Wrench, RotateCcw } from 'lucide-react';
import api from '../../../utils/api';
import { formatDate, statusBadge } from '../../../utils/helpers';

const SupportHome = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/communications/tickets?limit=10').then((r) => setTickets(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  const open       = tickets.filter(t => t.status === 'open').length;
  const inProgress = tickets.filter(t => t.status === 'in_progress').length;
  const resolved   = tickets.filter(t => t.status === 'resolved').length;

  return (
    <div>
      <div className="page-header"><h1>Support Dashboard</h1><p>Manage customer tickets and requests</p></div>

      <div className="stats-row">
        {[
          { label: 'Open Tickets',     value: open,       icon: <Ticket size={22} />,       color: '#fde8ea', iconColor: '#E63946' },
          { label: 'In Progress',      value: inProgress, icon: <MessageSquare size={22} />,color: '#fff3e0', iconColor: '#f59e0b' },
          { label: 'Resolved',         value: resolved,   icon: <Wrench size={22} />,       color: '#e8fdf6', iconColor: '#2A9D8F' },
          { label: 'Total',            value: tickets.length, icon: <RotateCcw size={22} />,color: '#e8f4fd', iconColor: '#0077B6' },
        ].map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="stat-icon" style={{ background: c.color, color: c.iconColor }}>{c.icon}</div>
            <div><div className="stat-value">{c.value}</div><div className="stat-label">{c.label}</div></div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recent Tickets</h3>
          <Link to="/dashboard/tickets" className="btn btn-outline btn-sm">View All</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Subject</th><th>Customer</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {tickets.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No tickets yet</td></tr>}
              {tickets.slice(0, 8).map((t) => (
                <tr key={t.ticket_id}>
                  <td>{t.subject}</td>
                  <td>{t.full_name}</td>
                  <td><span className={`badge badge-${statusBadge(t.status)}`}>{t.status}</span></td>
                  <td>{formatDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupportHome;
