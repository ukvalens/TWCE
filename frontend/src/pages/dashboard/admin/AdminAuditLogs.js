import { useEffect, useState, useCallback } from 'react';
import { Search, Shield } from 'lucide-react';
import api from '../../../utils/api';
import { formatDate } from '../../../utils/helpers';
import { Pagination } from './AdminUsers';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  USER_LOGIN:         { bg: '#e8f4fd', color: '#0077B6' },
  PRODUCT_APPROVED:   { bg: '#e8fdf6', color: '#2A9D8F' },
  PRODUCT_CREATED:    { bg: '#f3e8fd', color: '#7c3aed' },
  ORDER_CREATED:      { bg: '#fff3e0', color: '#f59e0b' },
  REVIEW_SUBMITTED:   { bg: '#e8fdf6', color: '#2A9D8F' },
  USER_BANNED:        { bg: '#fde8ea', color: '#E63946' },
  PRODUCT_REJECTED:   { bg: '#fde8ea', color: '#E63946' },
  SETTING_UPDATED:    { bg: '#f0f0f0', color: '#6C757D' },
};

const ActionBadge = ({ action }) => {
  const style = ACTION_COLORS[action] || { bg: '#f0f0f0', color: '#6C757D' };
  return (
    <code style={{ fontSize: 11, background: style.bg, color: style.color, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: .3 }}>
      {action}
    </code>
  );
};

const AdminAuditLogs = () => {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [action, setAction]   = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/audit-logs?page=${page}&limit=20`);
      let rows = data.data || [];
      if (search) rows = rows.filter(l => l.full_name?.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase()));
      if (action) rows = rows.filter(l => l.action === action);
      setLogs(rows);
      setTotal(data.total || rows.length);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  }, [page, search, action]);

  useEffect(() => { load(); }, [load]);

  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

  return (
    <div>
      <div className="page-header">
        <h1>Audit Logs</h1>
        <p>Complete trail of all system activity</p>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(ACTION_COLORS).map(([act, style]) => {
          const count = logs.filter(l => l.action === act).length;
          if (count === 0) return null;
          return (
            <div key={act} style={{ background: style.bg, color: style.color, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: action === act ? `2px solid ${style.color}` : '2px solid transparent' }}
              onClick={() => setAction(action === act ? '' : act)}>
              {act} ({count})
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: 34 }} placeholder="Search by user name or email…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" style={{ width: 220 }} value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
            <option value="">All Actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} /> {total} log entries
        </div>
        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Action</th><th>Table</th><th>User</th><th>IP Address</th><th>Timestamp</th></tr></thead>
              <tbody>
                {logs.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>No logs found</td></tr>}
                {logs.map(l => (
                  <tr key={l.log_id}>
                    <td><ActionBadge action={l.action} /></td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{l.table_name || '—'}</td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{l.full_name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.email}</div>
                    </td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{l.ip_address || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(l.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} limit={20} onPage={setPage} />
      </div>
    </div>
  );
};

export default AdminAuditLogs;
