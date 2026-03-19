import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { executionAPI } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import { StepTypeBadge } from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ExecutionTimeline from '../components/execution/ExecutionTimeline';
import { useWebSocket } from '../hooks/useWebSocket';

const INFO_ITEMS = (ex) => [
  { label: 'Workflow',     value: ex.workflow_name,         sub: `Version ${ex.workflow_version}`,           icon: 'bi-diagram-3-fill',    color: 'var(--brand-500)', bg: 'rgba(99,102,241,0.1)' },
  { label: 'Triggered By', value: ex.triggered_by_name || 'System', sub: ex.started_at ? new Date(ex.started_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—', icon: 'bi-person-fill', color: 'var(--cyan-500)', bg: 'rgba(6,182,212,0.1)' },
  { label: 'Duration',     value: ex.duration_ms ? `${(ex.duration_ms/1000).toFixed(2)}s` : ex.status==='in_progress' ? 'Running…' : '—', sub: `${ex.logs?.length||0} steps processed`, icon: 'bi-stopwatch-fill', color: 'var(--emerald-500)', bg: 'rgba(16,185,129,0.1)' },
  { label: 'Retries',      value: ex.retries || 0,          sub: `Max allowed: ${ex.max_retries||3}`,        icon: 'bi-arrow-repeat',      color: 'var(--amber-500)', bg: 'rgba(245,158,11,0.1)' },
];

export default function ExecutionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [execution, setExecution]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setAction]    = useState(false);
  const [activeTab, setActiveTab]     = useState('timeline');
  const [approvalComment, setComment] = useState('');
  const [copiedId, setCopiedId]       = useState(false);

  const fetchExecution = useCallback(async () => {
    try {
      const res = await executionAPI.getById(id);
      setExecution(res.data.data);
    } catch { navigate('/executions'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchExecution(); }, [fetchExecution]);
  useWebSocket(useCallback((msg) => {
    if (['execution:updated','execution:step_update','execution:completed','execution:failed'].includes(msg.type)) {
      fetchExecution();
    }
  }, [fetchExecution]));

  const handleCancel = async () => {
    setAction(true);
    try { await executionAPI.cancel(id); toast.success('Execution canceled'); fetchExecution(); }
    catch {} finally { setAction(false); }
  };

  const handleRetry = async () => {
    setAction(true);
    try { await executionAPI.retry(id); toast.success('Retrying execution…'); fetchExecution(); }
    catch {} finally { setAction(false); }
  };

  const handleApproval = async (action, stepId) => {
    setAction(true);
    try {
      await executionAPI.approve(id, { step_id: stepId, action, comment: approvalComment });
      toast.success(`Step ${action}d successfully`);
      setComment('');
      fetchExecution();
    } catch {} finally { setAction(false); }
  };

  const copyId = () => {
    navigator.clipboard.writeText(execution._id).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  if (loading) return <LoadingSpinner />;
  if (!execution) return null;

  const pendingApprovals = execution.logs?.filter(l => l.status === 'pending_approval') || [];
  const canCancel = ['pending','in_progress'].includes(execution.status);
  const canRetry  = execution.status === 'failed' && execution.retries < (execution.max_retries || 3);
  const tabs      = [['timeline','bi-clock-history','Timeline'],['data','bi-braces','Input / Output'],['logs','bi-journal-text','Raw Logs']];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/executions')}
            style={{ marginBottom: 8, padding: '4px 8px' }}>
            <i className="bi bi-arrow-left" /> Back to Logs
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="page-title">Execution Detail</h1>
            <StatusBadge status={execution.status} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--border-light)', padding: '3px 10px', borderRadius: 6 }}>
              {execution._id}
            </span>
            <button className="btn btn-ghost btn-icon-sm" onClick={copyId} title="Copy ID" style={{ padding: '3px 7px' }}>
              <i className={`bi ${copiedId ? 'bi-check2' : 'bi-copy'}`} style={{ fontSize: 11, color: copiedId ? 'var(--emerald-500)' : 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
        <div className="page-header-actions">
          {canRetry && (
            <button className="btn btn-warning btn-sm" onClick={handleRetry} disabled={actionLoading}>
              <i className="bi bi-arrow-repeat" /> Retry
            </button>
          )}
          {canCancel && (
            <button className="btn btn-danger btn-sm" onClick={handleCancel} disabled={actionLoading}>
              <i className="bi bi-x-circle" /> Cancel
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={fetchExecution} title="Refresh">
            <i className="bi bi-arrow-clockwise" />
          </button>
          <div className="live-indicator">
            <div className="live-dot" />
            Live
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid-4 mb-4" style={{ marginBottom: 24 }}>
        {INFO_ITEMS(execution).map((item, i) => (
          <div key={i} className={`stat-card stagger-${i+1} animate-fade-in`} style={{ padding: 18 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <i className={`bi ${item.icon}`} style={{ color: item.color, fontSize: 18 }} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 3 }}>{item.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Pending approvals banner */}
      {pendingApprovals.length > 0 && (
        <div style={{
          padding: '20px 22px', marginBottom: 24,
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 14, borderLeft: '4px solid #f59e0b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <i className="bi bi-hourglass-split" style={{ color: '#d97706', fontSize: 16 }} />
            <h6 style={{ color: '#d97706', fontWeight: 800, margin: 0, fontSize: 14 }}>
              {pendingApprovals.length} Pending Approval{pendingApprovals.length > 1 ? 's' : ''}
            </h6>
          </div>
          {pendingApprovals.map(log => (
            <div key={log._id} style={{ marginBottom: 16, padding: '14px', background: 'rgba(255,255,255,0.5)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.15)' }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
                <i className="bi bi-layers-fill me-2" style={{ color: '#d97706' }} />{log.step_name}
              </div>
              <textarea
                className="form-control"
                placeholder="Optional comment or reason…"
                value={approvalComment}
                onChange={e => setComment(e.target.value)}
                rows={2}
                style={{ resize: 'none', marginBottom: 12, fontSize: 13 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-success btn-sm" onClick={() => handleApproval('approve', log.step_id)} disabled={actionLoading}>
                  <i className="bi bi-check-circle-fill" /> Approve
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleApproval('reject', log.step_id)} disabled={actionLoading}>
                  <i className="bi bi-x-circle-fill" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, gap: 2 }}>
        {tabs.map(([tab, icon, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 20px', border: 'none', background: 'transparent',
            borderBottom: `2.5px solid ${activeTab === tab ? 'var(--brand-500)' : 'transparent'}`,
            color: activeTab === tab ? 'var(--brand-500)' : 'var(--text-muted)',
            fontWeight: activeTab === tab ? 700 : 500, fontSize: 13,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: -1,
          }}>
            <i className={`bi ${icon}`} />
            {label}
            {tab === 'timeline' && execution.logs?.length > 0 && (
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: activeTab === 'timeline' ? 'rgba(99,102,241,0.15)' : 'var(--border-light)', color: activeTab === 'timeline' ? 'var(--brand-500)' : 'var(--text-muted)' }}>
                {execution.logs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline tab */}
      {activeTab === 'timeline' && (
        <div className="card p-4 animate-fade-in">
          <ExecutionTimeline logs={execution.logs || []} steps={[]} />
        </div>
      )}

      {/* Data tab */}
      {activeTab === 'data' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card p-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <i className="bi bi-box-arrow-in-right" style={{ color: 'var(--brand-500)', fontSize: 16 }} />
              <h6 style={{ fontWeight: 700, margin: 0 }}>Input Data</h6>
            </div>
            <pre className="code-editor" style={{ margin: 0, minHeight: 'auto' }}>
              {JSON.stringify(execution.data || {}, null, 2)}
            </pre>
          </div>
          {execution.output && Object.keys(execution.output).length > 0 && (
            <div className="card p-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <i className="bi bi-box-arrow-right" style={{ color: 'var(--emerald-500)', fontSize: 16 }} />
                <h6 style={{ fontWeight: 700, margin: 0 }}>Output Data</h6>
              </div>
              <pre className="code-editor" style={{ margin: 0, minHeight: 'auto' }}>
                {JSON.stringify(execution.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Raw logs tab */}
      {activeTab === 'logs' && (
        <div className="card animate-fade-in">
          <div className="card-header">
            <h6 className="card-title">Execution Logs</h6>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
              {execution.logs?.length || 0} entries
            </span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(execution.logs || []).length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-desc">No log entries yet</div>
              </div>
            ) : execution.logs.map((log, i) => (
              <div key={i} style={{
                padding: '12px 14px',
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
                animation: `fadeIn 0.3s ease-out ${i * 30}ms both`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StepTypeBadge type={log.step_type} />
                    <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{log.step_name}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {log.duration_ms > 0 && (
                      <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {log.duration_ms}ms
                      </span>
                    )}
                    <StatusBadge status={log.status} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: log.error_message ? 6 : 0 }}>
                  {new Date(log.timestamp).toLocaleString()}
                </div>
                {log.error_message && (
                  <div style={{ fontSize: 12.5, color: '#dc2626', marginTop: 6, padding: '6px 10px', background: 'rgba(239,68,68,0.07)', borderRadius: 7 }}>
                    <i className="bi bi-exclamation-triangle me-1" />{log.error_message}
                  </div>
                )}
                {log.approver && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    <i className="bi bi-person-check me-1" />Approver: {log.approver} — {log.approval_status || 'pending'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}
