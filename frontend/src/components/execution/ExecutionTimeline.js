import React from 'react';
import { StepTypeBadge } from '../common/StatusBadge';

const STATUS_CFG = {
  completed:        { icon: 'bi-check-circle-fill',      color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  failed:           { icon: 'bi-x-circle-fill',          color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)' },
  pending_approval: { icon: 'bi-hourglass-split',        color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  started:          { icon: 'bi-arrow-right-circle-fill',color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  skipped:          { icon: 'bi-skip-forward-fill',      color: '#94a3b8', bg: 'rgba(148,163,184,0.05)',border: 'rgba(148,163,184,0.15)' },
};

const formatDuration = (ms) => {
  if (!ms || ms <= 0) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export default function ExecutionTimeline({ logs, steps }) {
  if (!logs || logs.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 0', gap: 14, textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          animation: 'float 3s ease-in-out infinite',
        }}>⏳</div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5 }}>Waiting for execution</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Step logs will appear here in real-time as the workflow runs</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--emerald-500)', fontWeight: 600 }}>
          <div style={{ width: 7, height: 7, background: '#10b981', borderRadius: '50%', animation: 'ping-dot 1.5s ease-in-out infinite' }} />
          Live updates via WebSocket
        </div>
        <style>{`
          @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
          @keyframes ping-dot{0%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}100%{opacity:1;transform:scale(1)}}
        `}</style>
      </div>
    );
  }

  return (
    <div className="execution-timeline">
      {logs.map((log, idx) => {
        const cfg = STATUS_CFG[log.status] || STATUS_CFG.started;
        const dur = formatDuration(log.duration_ms);
        const nextStep = steps?.find(s => s._id === log.next_step_id);

        return (
          <div key={idx} className="timeline-item" style={{ animationDelay: `${idx * 60}ms` }}>
            {/* Timeline dot */}
            <div style={{
              position: 'absolute', left: -26, top: 16,
              width: 14, height: 14, borderRadius: '50%',
              background: cfg.color,
              border: '2.5px solid var(--bg-card)',
              boxShadow: `0 0 0 3px ${cfg.color}22, 0 2px 6px ${cfg.color}40`,
              zIndex: 1,
              ...(log.status === 'pending_approval' ? { animation: 'pulse-dot 1.5s infinite' } : {}),
            }} />

            {/* Card */}
            <div style={{
              background: 'var(--bg-card)',
              border: `1px solid ${cfg.border}`,
              borderRadius: 12,
              padding: '14px 16px',
              boxShadow: `var(--shadow-sm), 0 0 0 0 ${cfg.color}00`,
              transition: 'box-shadow 0.3s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = `var(--shadow-md), 0 0 0 3px ${cfg.color}12`}
              onMouseLeave={e => e.currentTarget.style.boxShadow = `var(--shadow-sm), 0 0 0 0 ${cfg.color}00`}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className={`bi ${cfg.icon}`} style={{ color: cfg.color, fontSize: 15, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>{log.step_name}</span>
                  <StepTypeBadge type={log.step_type} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {dur && (
                    <span style={{
                      fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                      background: 'var(--border-light)', padding: '2px 7px', borderRadius: 5,
                    }}>⏱ {dur}</span>
                  )}
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                    background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                    textTransform: 'capitalize',
                  }}>
                    {log.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Timestamp */}
              {log.timestamp && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
                  <i className="bi bi-clock me-1" />
                  {new Date(log.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              )}

              {/* Pending approval */}
              {log.status === 'pending_approval' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                  color: '#d97706', padding: '9px 12px', marginTop: 8,
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 8,
                }}>
                  <i className="bi bi-person-check-fill" style={{ fontSize: 15 }} />
                  <span>Awaiting approval from: <strong>{log.approver || 'Assigned approver'}</strong></span>
                </div>
              )}

              {/* Evaluated rules */}
              {log.evaluated_rules?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Rules Evaluated
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {log.evaluated_rules.map((r, ri) => {
                      const isMatched = r.result && r === log.evaluated_rules.find(er => er.result);
                      return (
                        <div key={ri} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '5px 10px',
                          background: isMatched ? 'rgba(16,185,129,0.08)' : 'var(--bg)',
                          border: `1px solid ${isMatched ? 'rgba(16,185,129,0.2)' : 'var(--border-light)'}`,
                          borderRadius: 7,
                        }}>
                          <i className={`bi ${r.result ? 'bi-check-circle-fill' : 'bi-circle'}`}
                            style={{ color: r.result ? '#10b981' : 'var(--border)', fontSize: 12, flexShrink: 0 }} />
                          <code style={{
                            fontSize: 11.5, flex: 1,
                            color: r.result ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                          }}>
                            {r.is_default ? 'DEFAULT' : r.condition}
                          </code>
                          {isMatched && (
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '1px 7px', borderRadius: 10 }}>
                              MATCHED
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Next step */}
              {log.next_step_id && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                  color: 'var(--text-muted)', marginTop: 10, paddingTop: 10,
                  borderTop: '1px solid var(--border-light)',
                }}>
                  <i className="bi bi-arrow-right" style={{ color: 'var(--brand-500)' }} />
                  <span>Next step:</span>
                  <strong style={{ color: 'var(--brand-500)' }}>
                    {nextStep?.name || log.next_step_id}
                  </strong>
                </div>
              )}

              {/* Error */}
              {log.error_message && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5,
                  color: '#dc2626', marginTop: 10,
                  padding: '9px 12px',
                  background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8,
                }}>
                  <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }} />
                  {log.error_message}
                </div>
              )}

              {/* Approval result */}
              {log.approval_status && log.approval_status !== 'pending' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5,
                  color: log.approval_status === 'approved' ? '#059669' : '#dc2626',
                  marginTop: 10, padding: '8px 12px',
                  background: log.approval_status === 'approved' ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                  border: `1px solid ${log.approval_status === 'approved' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  borderRadius: 8,
                }}>
                  <i className={`bi ${log.approval_status === 'approved' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} />
                  {log.approval_status === 'approved' ? 'Approved' : 'Rejected'}
                  {log.approval_comment && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>— {log.approval_comment}</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <style>{`@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}`}</style>
    </div>
  );
}
