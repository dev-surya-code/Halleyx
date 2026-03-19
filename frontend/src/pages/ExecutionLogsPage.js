import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { executionAPI } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useWebSocket } from '../hooks/useWebSocket';

const STATUS_OPTIONS = ['pending','in_progress','completed','failed','canceled'];

const formatDuration = (ms) => {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms/1000).toFixed(1)}s`;
  return `${Math.floor(ms/60000)}m ${Math.round((ms%60000)/1000)}s`;
};

export default function ExecutionLogsPage() {
  const navigate   = useNavigate();
  const [executions, setExecutions]   = useState([]);
  const [pagination, setPagination]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]           = useState('');
  const [liveCount, setLiveCount]     = useState(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await executionAPI.getAll({ page, limit: 15, status: statusFilter });
      setExecutions(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  useWebSocket(useCallback((msg) => {
    if (['execution:started','execution:completed','execution:failed','execution:canceled'].includes(msg.type)) {
      setLiveCount(n => n + 1);
      fetch();
    }
  }, [fetch]));

  const filtered = search
    ? executions.filter(e =>
        e.workflow_name?.toLowerCase().includes(search.toLowerCase()) ||
        e._id.includes(search)
      )
    : executions;

  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = executions.filter(e => e.status === s).length;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Execution Logs</h1>
          <p className="page-subtitle">
            Full audit trail of all workflow executions
            {liveCount > 0 && (
              <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--emerald-500)', fontWeight: 600 }}>
                · {liveCount} live update{liveCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <div className="page-header-actions">
          <div className="live-indicator">
            <div className="live-dot" />
            Real-time
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetch}>
            <i className="bi bi-arrow-clockwise" /> Refresh
          </button>
        </div>
      </div>

      {/* Quick status filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => { setStatusFilter(''); setPage(1); }}
          style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${!statusFilter ? 'var(--brand-500)' : 'var(--border)'}`,
            background: !statusFilter ? 'linear-gradient(135deg, var(--brand-500), var(--brand-600))' : 'var(--bg-card)',
            color: !statusFilter ? '#fff' : 'var(--text-secondary)', fontFamily: 'var(--font-sans)',
            transition: 'all 0.2s',
          }}
        >
          All ({pagination?.total ?? 0})
        </button>
        {STATUS_OPTIONS.map(s => {
          const active = statusFilter === s;
          const colorMap = { completed: '#10b981', in_progress: '#3b82f6', pending: '#f59e0b', failed: '#ef4444', canceled: '#94a3b8' };
          const c = colorMap[s] || '#94a3b8';
          return (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${active ? c : 'var(--border)'}`,
                background: active ? `${c}18` : 'var(--bg-card)',
                color: active ? c : 'var(--text-secondary)', fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s',
              }}
            >
              {s.replace('_', ' ')} {statusCounts[s] > 0 && `(${statusCounts[s]})`}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card p-3 mb-3" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 180 }}>
            <i className="search-icon bi bi-search" />
            <input
              className="form-control"
              placeholder="Search workflow name or execution ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="form-select" style={{ width: 165 }} value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? <LoadingSpinner /> : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Execution ID</th>
                  <th>Workflow</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Triggered By</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Retries</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="9">
                    <div className="empty-state">
                      <div className="empty-state-icon">▶️</div>
                      <div className="empty-state-title">No executions found</div>
                      <div className="empty-state-desc">
                        {search || statusFilter ? 'Try adjusting your filters' : 'Run a workflow to see executions here'}
                      </div>
                    </div>
                  </td></tr>
                ) : filtered.map((ex, idx) => (
                  <tr key={ex._id} className="table-row-link animate-fade-in"
                    style={{ animationDelay: `${idx * 30}ms` }}
                    onClick={() => navigate(`/executions/${ex._id}`)}>
                    <td>
                      <span className="mono" style={{
                        fontSize: 11.5, color: 'var(--text-muted)',
                        background: 'var(--border-light)', padding: '2px 7px', borderRadius: 5,
                      }}>
                        {ex._id.slice(0, 8)}…
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{ex.workflow_name}</div>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--border-light)', padding: '2px 7px', borderRadius: 5 }}>
                        v{ex.workflow_version}
                      </span>
                    </td>
                    <td><StatusBadge status={ex.status} /></td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      {ex.triggered_by_name || ex.triggered_by?.name || '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {ex.started_at
                        ? new Date(ex.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td>
                      <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {formatDuration(ex.duration_ms)}
                      </span>
                    </td>
                    <td>
                      {ex.retries > 0 ? (
                        <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }}>
                          #{ex.retries}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      <i className="bi bi-chevron-right" style={{ color: 'var(--text-muted)', fontSize: 12 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && pagination && (
          <div style={{ padding: '10px 18px 16px' }}>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
