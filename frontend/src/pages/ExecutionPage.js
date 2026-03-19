import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { workflowAPI } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ExecutionTimeline from '../components/execution/ExecutionTimeline';

const CATEGORY_ICONS = { hr:'👥', finance:'💰', operations:'⚙️', it:'🖥️', sales:'📈', general:'📋' };

export default function ExecutionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow]   = useState(null);
  const [inputData, setInputData] = useState({});
  const [execution, setExecution] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [executing, setExecuting] = useState(false);
  const [rawMode, setRawMode]     = useState(false);
  const [rawJson, setRawJson]     = useState('{}');

  useWebSocket(useCallback((msg) => {
    if (!execution) return;
    if (['execution:updated','execution:step_update','execution:completed','execution:failed','execution:canceled'].includes(msg.type)) {
      fetchExecution(msg.data?.execution_id || execution._id);
    }
  }, [execution])); // eslint-disable-line

  const fetchExecution = async (execId) => {
    try {
      const { executionAPI } = await import('../services/api');
      const res = await executionAPI.getById(execId);
      setExecution(res.data.data);
    } catch {}
  };

  useEffect(() => {
    workflowAPI.getById(id).then(res => {
      const wf = res.data.data;
      setWorkflow(wf);
      if (wf.input_schema) {
        const defaults = {};
        Object.entries(wf.input_schema).forEach(([key, cfg]) => {
          if (cfg.allowed_values?.length) defaults[key] = cfg.allowed_values[0];
          else if (cfg.type === 'number') defaults[key] = 0;
          else if (cfg.type === 'boolean') defaults[key] = false;
          else defaults[key] = '';
        });
        setInputData(defaults);
        setRawJson(JSON.stringify(defaults, null, 2));
      }
    }).catch(() => navigate('/workflows')).finally(() => setLoading(false));
  }, [id, navigate]);

  const handleExecute = async (e) => {
    e.preventDefault();
    setExecuting(true);
    let data = inputData;
    if (rawMode) {
      try { data = JSON.parse(rawJson); }
      catch { toast.error('Invalid JSON in raw input'); setExecuting(false); return; }
    }
    try {
      const res = await workflowAPI.execute(id, data);
      const exec = res.data.data;
      setExecution(exec);
      toast.success('🚀 Workflow execution started!');
      const poll = setInterval(async () => {
        const { executionAPI } = await import('../services/api');
        const latest = await executionAPI.getById(exec._id);
        setExecution(latest.data.data);
        const status = latest.data.data.status;
        if (['completed','failed','canceled'].includes(status)) {
          clearInterval(poll);
          if (status === 'completed') toast.success('✅ Execution completed!');
          if (status === 'failed') toast.error('❌ Execution failed');
        }
      }, 2000);
      setTimeout(() => clearInterval(poll), 120000);
    } catch {} finally { setExecuting(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (!workflow) return null;

  const schemaEntries = workflow.input_schema ? Object.entries(workflow.input_schema) : [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/workflows')} style={{ marginBottom: 8, padding: '4px 8px' }}>
            <i className="bi bi-arrow-left" /> Back to Workflows
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ fontSize: 22 }}>{CATEGORY_ICONS[workflow.category] || '⚡'}</div>
            <h1 className="page-title">{workflow.name}</h1>
          </div>
          <p className="page-subtitle">Provide input data and run the workflow · v{workflow.version}</p>
        </div>
        {execution && (
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/executions/${execution._id}`)}>
            <i className="bi bi-eye" /> View Full Detail
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>

        {/* ── Left: Input form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Input card */}
          <div className="card p-4">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h6 style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-input-cursor-text" style={{ color: 'var(--brand-500)' }} />
                Input Data
              </h6>
              {schemaEntries.length > 0 && (
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
                  {[['Form','bi-ui-checks'],['JSON','bi-braces']].map(([label, icon], i) => (
                    <button key={label} onClick={() => setRawMode(i===1)} style={{
                      padding: '4px 10px', border: 'none', borderRadius: 6,
                      background: rawMode===(i===1) ? 'var(--brand-500)' : 'transparent',
                      color: rawMode===(i===1) ? '#fff' : 'var(--text-muted)',
                      fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <i className={`bi ${icon}`} style={{ fontSize: 11 }} />{label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {schemaEntries.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <i className="bi bi-info-circle me-2" />No input fields required for this workflow
              </div>
            ) : rawMode ? (
              <div>
                <label className="form-label">JSON Payload</label>
                <textarea
                  className="code-editor"
                  value={rawJson}
                  onChange={e => setRawJson(e.target.value)}
                  rows={Math.max(6, schemaEntries.length * 2)}
                  style={{ width: '100%', resize: 'vertical' }}
                />
                <div className="form-text">Enter raw JSON input data</div>
              </div>
            ) : (
              <form onSubmit={handleExecute} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {schemaEntries.map(([key, cfg]) => (
                  <div key={key}>
                    <label className="form-label">
                      {key.replace(/_/g, ' ')}
                      {cfg.required && <span style={{ color: 'var(--rose-500)', marginLeft: 4 }}>*</span>}
                      {cfg.description && (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11, marginLeft: 6 }}>
                          {cfg.description}
                        </span>
                      )}
                    </label>
                    {cfg.allowed_values?.length > 0 ? (
                      <select className="form-select" value={inputData[key]||''} onChange={e => setInputData(d=>({...d,[key]:e.target.value}))}>
                        {cfg.allowed_values.map(v => <option key={v}>{v}</option>)}
                      </select>
                    ) : cfg.type === 'boolean' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-input)', cursor: 'pointer' }}
                        onClick={() => setInputData(d => ({...d, [key]: !d[key]}))}>
                        <div style={{ width: 36, height: 20, borderRadius: 10, background: inputData[key] ? 'var(--brand-500)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: 2, left: inputData[key] ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: inputData[key] ? 'var(--brand-500)' : 'var(--text-muted)' }}>{inputData[key] ? 'True' : 'False'}</span>
                      </div>
                    ) : cfg.type === 'number' ? (
                      <input type="number" className="form-control" value={inputData[key]||''} onChange={e => setInputData(d=>({...d,[key]:Number(e.target.value)}))} required={cfg.required} />
                    ) : (
                      <input type="text" className="form-control" placeholder={`Enter ${key.replace(/_/g,' ')}…`} value={inputData[key]||''} onChange={e => setInputData(d=>({...d,[key]:e.target.value}))} required={cfg.required} />
                    )}
                  </div>
                ))}
                <button type="submit" className="btn btn-success btn-block" disabled={executing} style={{ marginTop: 4 }}>
                  {executing ? (
                    <><div style={{ width:16,height:16,border:'2.5px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite' }} />Starting…</>
                  ) : <><i className="bi bi-play-fill" />Run Workflow</>}
                </button>
              </form>
            )}

            {(schemaEntries.length === 0 || rawMode) && (
              <button className="btn btn-success btn-block" onClick={handleExecute} disabled={executing} style={{ marginTop: schemaEntries.length === 0 ? 0 : 12 }}>
                {executing ? (
                  <><div style={{ width:16,height:16,border:'2.5px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite' }} />Starting…</>
                ) : <><i className="bi bi-play-fill" />Run Workflow</>}
              </button>
            )}
          </div>

          {/* Workflow info */}
          <div className="card p-4">
            <h6 style={{ fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-info-circle-fill" style={{ color: 'var(--cyan-500)' }} />
              Workflow Info
            </h6>
            {[
              { label: 'Version',   value: `v${workflow.version}`, mono: true },
              { label: 'Category',  value: workflow.category, capitalize: true },
              { label: 'Steps',     value: `${(workflow.steps||[]).length} steps` },
              { label: 'Total runs',value: workflow.execution_count || 0 },
              { label: 'Status',    value: workflow.is_active ? '✅ Active' : '⏸ Inactive' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 4 ? '1px solid var(--border-light)' : 'none' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: r.mono ? 'var(--font-mono)' : 'inherit', textTransform: r.capitalize ? 'capitalize' : 'none' }}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Execution output ── */}
        <div>
          {!execution ? (
            <div className="card" style={{ border: '2px dashed var(--border)', height: '100%', minHeight: 340 }}>
              <div className="empty-state" style={{ height: '100%' }}>
                <div className="empty-state-icon animate-float">▶️</div>
                <div className="empty-state-title">No execution yet</div>
                <div className="empty-state-desc">Fill in the input data and click "Run Workflow" to start an execution. The timeline will appear here in real-time.</div>
                <div className="live-indicator">
                  <div className="live-dot" />
                  Real-time WebSocket updates
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-4">
              {/* Execution status header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <StatusBadge status={execution.status} />
                    {execution.duration_ms && (
                      <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--border-light)', padding: '2px 8px', borderRadius: 5 }}>
                        {(execution.duration_ms/1000).toFixed(2)}s
                      </span>
                    )}
                    {execution.logs?.length > 0 && (
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{execution.logs.length} step{execution.logs.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <i className="bi bi-hash me-1" />{execution._id}
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/executions/${execution._id}`)}>
                  <i className="bi bi-arrow-up-right-circle" /> Full Detail
                </button>
              </div>

              {/* Progress bar for running */}
              {execution.status === 'in_progress' && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                    <span><i className="bi bi-lightning-charge-fill me-1" style={{ color: 'var(--brand-500)' }} />Running…</span>
                    <div className="live-indicator" style={{ padding: '2px 8px', fontSize: 11 }}>
                      <div className="live-dot" />Live
                    </div>
                  </div>
                  <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--brand-500), var(--cyan-500))',
                      borderRadius: 3,
                      animation: 'progress-stripe 1.5s ease-in-out infinite',
                    }} />
                  </div>
                </div>
              )}

              {/* Completed/failed summary */}
              {['completed','failed'].includes(execution.status) && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 20,
                  background: execution.status === 'completed' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${execution.status === 'completed' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  borderRadius: 10,
                }}>
                  <i className={`bi ${execution.status === 'completed' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}
                    style={{ fontSize: 20, color: execution.status === 'completed' ? '#10b981' : '#ef4444' }} />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                      {execution.status === 'completed' ? 'Workflow completed successfully!' : 'Workflow execution failed'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {execution.logs?.length || 0} steps · {execution.duration_ms ? `${(execution.duration_ms/1000).toFixed(2)}s` : '—'}
                    </div>
                  </div>
                </div>
              )}

              <ExecutionTimeline logs={execution.logs||[]} steps={workflow.steps||[]} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes progress-stripe{0%{width:5%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:5%;margin-left:95%}}
      `}</style>
    </div>
  );
}
