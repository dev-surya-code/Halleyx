import React, { useState, useEffect, useCallback } from 'react';

const LEVEL_COLORS = { INFO:'#3b82f6', WARN:'#f59e0b', CRIT:'#ef4444' };
const ACTION_ICONS = {
  USER_LOGIN:'bi-box-arrow-in-right', USER_LOGOUT:'bi-box-arrow-right',
  USER_REGISTER:'bi-person-plus-fill', ADMIN_LIST_USERS:'bi-people-fill',
  BRUTE_FORCE_BLOCKED:'bi-shield-x', ACCOUNT_LOCKED:'bi-lock-fill',
  MALICIOUS_INPUT_BLOCKED:'bi-bug-fill', BLOCKED_IP_REQUEST:'bi-ban',
  BLACKLISTED_TOKEN_USED:'bi-key',
};

export default function AuditLogsPage() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/security/audit', {
        headers: { Authorization: `Bearer ${localStorage.getItem('wf_token')}` }
      });
      if (res.ok) { const data = await res.json(); setLogs(data.events || []); }
    } catch { setLogs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(fetchLogs, 5000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchLogs]);

  const filtered = logs.filter(l => {
    if (levelFilter && l.level !== levelFilter) return false;
    if (filter && !JSON.stringify(l).toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const counts = { INFO: logs.filter(l=>l.level==='INFO').length, WARN: logs.filter(l=>l.level==='WARN').length, CRIT: logs.filter(l=>l.level==='CRIT').length };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Security events and access audit trail · {logs.length} events recorded</p>
        </div>
        <div className="page-header-actions">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:500 }}>Auto-refresh</span>
            <div onClick={() => setAutoRefresh(!autoRefresh)} style={{
              width:36, height:20, borderRadius:10, background: autoRefresh ? 'var(--brand-500)' : 'var(--border)',
              position:'relative', cursor:'pointer', transition:'background 0.2s',
            }}>
              <div style={{ position:'absolute', top:2, left: autoRefresh ? 18 : 2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>
            <i className="bi bi-arrow-clockwise" /> Refresh
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setLogs([])} title="Clear local view">
            <i className="bi bi-trash" /> Clear View
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid-3" style={{ marginBottom:20 }}>
        {[
          { label:'Info Events', count:counts.INFO, icon:'bi-info-circle-fill', color:'#3b82f6', bg:'rgba(59,130,246,0.1)' },
          { label:'Warnings',    count:counts.WARN, icon:'bi-exclamation-triangle-fill', color:'#f59e0b', bg:'rgba(245,158,11,0.1)' },
          { label:'Critical',    count:counts.CRIT, icon:'bi-shield-exclamation', color:'#ef4444', bg:'rgba(239,68,68,0.1)' },
        ].map((s,i) => (
          <div key={i} className={`stat-card stagger-${i+1} animate-fade-in`} style={{ cursor:'pointer' }} onClick={() => setLevelFilter(s.label.split(' ')[0].toUpperCase().replace('WARNINGS','WARN').replace('CRITICAL','CRIT').replace('INFO','INFO'))}>
            <div className="stat-icon" style={{ background:s.bg }}>
              <i className={`bi ${s.icon}`} style={{ color:s.color }} />
            </div>
            <div className="stat-value">{s.count}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-3 mb-3" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <div className="search-bar" style={{ flex:1, minWidth:180 }}>
            <i className="search-icon bi bi-search" />
            <input className="form-control" placeholder="Filter by action, IP, user…" value={filter} onChange={e=>setFilter(e.target.value)} />
          </div>
          <select className="form-select" style={{ width:150 }} value={levelFilter} onChange={e=>setLevelFilter(e.target.value)}>
            <option value="">All Levels</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warning</option>
            <option value="CRIT">Critical</option>
          </select>
          {levelFilter && <button className="btn btn-ghost btn-sm" onClick={() => setLevelFilter('')}><i className="bi bi-x" /> Clear</button>}
          <div className="live-indicator" style={{ display: autoRefresh ? 'flex' : 'none' }}>
            <div className="live-dot" /> Live
          </div>
        </div>
      </div>

      {/* Logs table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
            <div style={{ width:28, height:28, border:'3px solid var(--border)', borderTopColor:'var(--brand-500)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
            Loading audit logs…
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Timestamp</th>
                <th>Action</th>
                <th>User / Identity</th>
                <th>IP Address</th>
                <th>Path</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7">
                  <div className="empty-state">
                    <div className="empty-state-icon">🔒</div>
                    <div className="empty-state-title">No audit events found</div>
                    <div className="empty-state-desc">{filter || levelFilter ? 'Try adjusting your filters' : 'Audit events appear here as users interact with the platform. This endpoint requires development mode.'}</div>
                  </div>
                </td></tr>
              ) : filtered.map((log, i) => (
                <tr key={i} className="animate-fade-in" style={{ animationDelay:`${i*20}ms` }}>
                  <td>
                    <span style={{
                      display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px',
                      borderRadius:20, fontSize:11, fontWeight:700,
                      background: `${LEVEL_COLORS[log.level] || '#94a3b8'}18`,
                      color: LEVEL_COLORS[log.level] || '#94a3b8',
                      border:`1px solid ${LEVEL_COLORS[log.level] || '#94a3b8'}30`,
                    }}>
                      <i className={`bi ${log.level==='CRIT'?'bi-exclamation-triangle-fill':log.level==='WARN'?'bi-exclamation-circle-fill':'bi-info-circle-fill'}`} style={{ fontSize:9 }} />
                      {log.level}
                    </span>
                  </td>
                  <td style={{ fontSize:11.5, color:'var(--text-muted)', whiteSpace:'nowrap', fontFamily:'var(--font-mono)' }}>
                    {new Date(log.ts).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                  </td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <i className={`bi ${ACTION_ICONS[log.action] || 'bi-activity'}`} style={{ color:'var(--brand-400)', fontSize:13, flexShrink:0 }} />
                      <span style={{ fontSize:12.5, fontWeight:600, color:'var(--text-primary)', fontFamily:'var(--font-mono)' }}>{log.action}</span>
                    </div>
                  </td>
                  <td style={{ fontSize:12, color:'var(--text-secondary)' }}>{log.user || '—'}</td>
                  <td style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>{log.ip || '—'}</td>
                  <td style={{ fontSize:11.5, color:'var(--text-muted)', maxWidth:160 }} className="truncate">{log.path || '—'}</td>
                  <td>
                    {log.status && (
                      <span style={{
                        fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                        background: log.status < 300 ? 'rgba(16,185,129,0.1)' : log.status < 500 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                        color: log.status < 300 ? '#059669' : log.status < 500 ? '#b45309' : '#dc2626',
                      }}>{log.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop:12, fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>
        <i className="bi bi-info-circle me-1" />
        Audit log endpoint available in development mode only · Showing last 200 events in memory
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
