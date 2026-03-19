import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { workflowAPI, stepAPI, ruleAPI } from '../services/api';
import { StepTypeBadge } from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmModal from '../components/common/ConfirmModal';

const STEP_TYPES = ['task', 'approval', 'notification', 'condition', 'delay', 'webhook'];

const defaultMetaTemplates = {
  task: { action: 'process_data' },
  approval: { assignee_email: 'manager@example.com', message: 'Please review this step' },
  notification: { channel: 'email', template: 'default-notification', recipient: '' },
  condition: { description: 'Conditional branch' },
  delay: { delay_seconds: 60 },
  webhook: { url: 'https://example.com/webhook', method: 'POST' }
};

export default function WorkflowEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [workflow, setWorkflow] = useState({ name: '', description: '', category: 'General', tags: '' });
  const [inputSchema, setInputSchema] = useState([]);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Step modal
  const [stepModal, setStepModal] = useState({ show: false, data: null, editing: null });
  const [stepForm, setStepForm] = useState({ name: '', description: '', step_type: 'task', metadata: '{}', is_terminal: false });
  const [stepSaving, setStepSaving] = useState(false);

  // Rule modal
  const [ruleModal, setRuleModal] = useState({ show: false, step: null });
  const [rules, setRules] = useState([]);
  const [ruleForm, setRuleForm] = useState({ name: '', condition: '', next_step_id: '', priority: 10, is_default: false });
  const [ruleSaving, setRuleSaving] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // Delete confirmation
  const [deleteStep, setDeleteStep] = useState(null);

  const fetchWorkflow = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await workflowAPI.getById(id);
      const wf = res.data.data;
      setWorkflow({ name: wf.name, description: wf.description || '', category: wf.category || 'General', tags: (wf.tags || []).join(', ') });

      // Convert input schema map to array
      const schemaArray = wf.input_schema ? Object.entries(wf.input_schema).map(([k, v]) => ({ key: k, ...v })) : [];
      setInputSchema(schemaArray);
      setSteps(wf.steps || []);
    } catch { navigate('/workflows'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchWorkflow(); }, [fetchWorkflow]);

  // ── Save Workflow ──
  const handleSaveWorkflow = async (e) => {
    e.preventDefault();
    if (!workflow.name.trim()) { toast.error('Workflow name is required'); return; }
    setSaving(true);
    try {
      const schemaObj = {};
      inputSchema.forEach(f => {
        if (f.key) schemaObj[f.key] = {
          type: f.type || 'string', required: f.required || false,
          ...(f.allowed_values ? { allowed_values: f.allowed_values.split(',').map(v => v.trim()).filter(Boolean) } : {}),
          ...(f.description ? { description: f.description } : {})
        };
      });

      const payload = {
        name: workflow.name,
        description: workflow.description,
        category: workflow.category,
        tags: workflow.tags.split(',').map(t => t.trim()).filter(Boolean),
        input_schema: schemaObj
      };

      if (isEdit) {
        await workflowAPI.update(id, payload);
        toast.success('Workflow saved');
        fetchWorkflow();
      } else {
        const res = await workflowAPI.create(payload);
        toast.success('Workflow created');
        navigate(`/workflows/${res.data.data._id}/edit`);
      }
    } catch {}
    finally { setSaving(false); }
  };

  // ── Schema field helpers ──
  const addSchemaField = () => setInputSchema(s => [...s, { key: '', type: 'string', required: false, allowed_values: '', description: '' }]);
  const updateSchemaField = (i, key, val) => setInputSchema(s => s.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
  const removeSchemaField = (i) => setInputSchema(s => s.filter((_, idx) => idx !== i));

  // ── Step CRUD ──
  const openStepModal = (step = null) => {
    if (step) {
      setStepForm({
        name: step.name, description: step.description || '',
        step_type: step.step_type, is_terminal: step.is_terminal || false,
        metadata: JSON.stringify(step.metadata || {}, null, 2)
      });
      setStepModal({ show: true, editing: step._id });
    } else {
      setStepForm({ name: '', description: '', step_type: 'task', metadata: '{}', is_terminal: false });
      setStepModal({ show: true, editing: null });
    }
  };

  const handleSaveStep = async () => {
    if (!stepForm.name.trim()) { toast.error('Step name required'); return; }
    let meta;
    try { meta = JSON.parse(stepForm.metadata || '{}'); } catch { toast.error('Invalid metadata JSON'); return; }
    setStepSaving(true);
    try {
      const payload = { name: stepForm.name, description: stepForm.description, step_type: stepForm.step_type, metadata: meta, is_terminal: stepForm.is_terminal };
      if (stepModal.editing) {
        await stepAPI.update(stepModal.editing, payload);
        toast.success('Step updated');
      } else {
        await stepAPI.create(id, payload);
        toast.success('Step created');
      }
      setStepModal({ show: false, editing: null });
      fetchWorkflow();
    } catch {}
    finally { setStepSaving(false); }
  };

  const handleDeleteStep = async () => {
    try {
      await stepAPI.delete(deleteStep._id);
      toast.success('Step deleted');
      setDeleteStep(null);
      fetchWorkflow();
    } catch {}
  };

  const handleSetStartStep = async (stepId) => {
    try {
      await workflowAPI.update(id, { start_step_id: stepId });
      toast.success('Start step updated');
      fetchWorkflow();
    } catch {}
  };

  // ── Rules ──
  const openRuleModal = async (step) => {
    setRuleModal({ show: true, step });
    setRuleForm({ name: '', condition: '', next_step_id: '', priority: 10, is_default: false });
    setEditingRule(null);
    try {
      const res = await ruleAPI.getAll(step._id);
      setRules(res.data.data);
    } catch {}
  };

  const handleSaveRule = async () => {
    if (!ruleForm.condition.trim()) { toast.error('Condition required'); return; }
    setRuleSaving(true);
    try {
      const payload = {
        name: ruleForm.name, condition: ruleForm.condition,
        next_step_id: ruleForm.next_step_id || null,
        priority: parseInt(ruleForm.priority) || 10,
        is_default: ruleForm.is_default
      };
      if (editingRule) {
        await ruleAPI.update(editingRule._id, payload);
        toast.success('Rule updated');
      } else {
        await ruleAPI.create(ruleModal.step._id, payload);
        toast.success('Rule created');
      }
      setEditingRule(null);
      setRuleForm({ name: '', condition: '', next_step_id: '', priority: 10, is_default: false });
      const res = await ruleAPI.getAll(ruleModal.step._id);
      setRules(res.data.data);
    } catch {}
    finally { setRuleSaving(false); }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await ruleAPI.delete(ruleId);
      toast.success('Rule deleted');
      const res = await ruleAPI.getAll(ruleModal.step._id);
      setRules(res.data.data);
    } catch {}
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/workflows')} style={{ marginBottom: 8, padding: '4px 8px' }}>
            <i className="bi bi-arrow-left" /> Back to Workflows
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.1))', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {isEdit ? '✏️' : '✨'}
            </div>
            <h1 className="page-title">{isEdit ? `Edit: ${workflow.name || '…'}` : 'New Workflow'}</h1>
          </div>
          <p className="page-subtitle" style={{ marginTop: 5 }}>{isEdit ? 'Update workflow configuration, steps, and rules' : 'Configure your new automation workflow'}</p>
        </div>
        <div className="page-header-actions">
          {isEdit && (
            <>
              <button className="btn btn-success btn-sm" onClick={() => navigate(`/workflows/${id}/execute`)}>
                <i className="bi bi-play-fill" /> Execute
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/workflows')}>
                <i className="bi bi-x-lg" /> Close
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {[['general','bi-info-circle-fill','General'], ['schema','bi-braces','Input Schema'], ...(isEdit ? [['steps','bi-diagram-3-fill','Steps & Rules']] : [])].map(([tab, icon, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 20px', border: 'none', background: 'transparent',
            borderBottom: `2.5px solid ${activeTab===tab ? 'var(--brand-500)' : 'transparent'}`,
            color: activeTab===tab ? 'var(--brand-500)' : 'var(--text-muted)',
            fontWeight: activeTab===tab ? 700 : 500,
            fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-sans)', transition: 'all 0.2s', marginBottom: -1,
          }}>
            <i className={`bi ${icon}`} />{label}
          </button>
        ))}
      </div>

      {/* ── General Tab ── */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveWorkflow} className="animate-fade-in">
          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <div className="card p-4">
                <h6 style={{ fontWeight: 700, marginBottom: 16 }}>Workflow Details</h6>
                <div className="mb-3">
                  <label className="form-label">Workflow Name *</label>
                  <input className="form-control" placeholder="e.g. Expense Approval Workflow" value={workflow.name}
                    onChange={e => setWorkflow(w => ({ ...w, name: e.target.value }))} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={3} placeholder="Describe what this workflow does..."
                    value={workflow.description} onChange={e => setWorkflow(w => ({ ...w, description: e.target.value }))} />
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={workflow.category} onChange={e => setWorkflow(w => ({ ...w, category: e.target.value }))}>
                      {['General', 'Finance', 'HR', 'IT', 'Operations', 'Sales', 'Marketing', 'Legal'].map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Tags <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(comma separated)</span></label>
                    <input className="form-control" placeholder="finance, approval, monthly" value={workflow.tags}
                      onChange={e => setWorkflow(w => ({ ...w, tags: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="card p-4 mb-3">
                <h6 style={{ fontWeight: 700, marginBottom: 12 }}>Actions</h6>
                <button type="submit" className="btn btn-primary w-100 mb-2" disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : <><i className="bi bi-check-lg me-1"></i>{isEdit ? 'Save Changes' : 'Create Workflow'}</>}
                </button>
                {isEdit && (
                  <button type="button" className="btn btn-secondary w-100" onClick={() => navigate('/workflows')}>
                    Cancel
                  </button>
                )}
              </div>
              {isEdit && (
                <div className="card p-4">
                  <h6 style={{ fontWeight: 700, marginBottom: 12 }}>Quick Info</h6>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <div className="d-flex justify-content-between mb-1"><span>Steps</span><strong style={{ color: 'var(--text-primary)' }}>{steps.length}</strong></div>
                    <div className="d-flex justify-content-between"><span>Status</span>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>Active</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {/* ── Input Schema Tab ── */}
      {activeTab === 'schema' && (
        <div className="animate-fade-in">
          <div className="card p-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h6 style={{ fontWeight: 700, margin: 0 }}>Input Schema</h6>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Define the input fields required when executing this workflow</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={addSchemaField}>
                <i className="bi bi-plus-lg"></i> Add Field
              </button>
            </div>

            {inputSchema.length === 0 ? (
              <div className="text-center py-4" style={{ color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: 10 }}>
                <i className="bi bi-braces fs-2 d-block mb-2"></i>
                No input fields defined. Click "Add Field" to start.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {inputSchema.map((field, i) => (
                  <div key={i} className="card p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div className="row g-2 align-items-end">
                      <div className="col-md-3">
                        <label className="form-label">Field Key *</label>
                        <input className="form-control form-control-code" placeholder="amount" value={field.key}
                          onChange={e => updateSchemaField(i, 'key', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Type</label>
                        <select className="form-select" value={field.type || 'string'} onChange={e => updateSchemaField(i, 'type', e.target.value)}>
                          {['string', 'number', 'boolean'].map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Allowed Values <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(comma sep.)</span></label>
                        <input className="form-control" placeholder="High,Medium,Low" value={field.allowed_values || ''}
                          onChange={e => updateSchemaField(i, 'allowed_values', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Description</label>
                        <input className="form-control" placeholder="Field description" value={field.description || ''}
                          onChange={e => updateSchemaField(i, 'description', e.target.value)} />
                      </div>
                      <div className="col-md-1 d-flex align-items-center gap-2">
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" checked={field.required || false}
                            onChange={e => updateSchemaField(i, 'required', e.target.checked)} id={`req-${i}`} />
                          <label className="form-check-label" htmlFor={`req-${i}`} style={{ fontSize: 12 }}>Req.</label>
                        </div>
                      </div>
                      <div className="col-md-1">
                        <button className="btn btn-danger btn-sm w-100" onClick={() => removeSchemaField(i)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 d-flex justify-content-end">
              <button className="btn btn-primary" onClick={handleSaveWorkflow} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save Schema</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Steps Tab ── */}
      {activeTab === 'steps' && isEdit && (
        <div className="animate-fade-in">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              {steps.length} step{steps.length !== 1 ? 's' : ''} — drag to reorder, click to configure rules
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => openStepModal()}>
              <i className="bi bi-plus-lg"></i> Add Step
            </button>
          </div>

          {steps.length === 0 ? (
            <div className="text-center py-5" style={{ background: 'var(--bg-card)', border: '2px dashed var(--border)', borderRadius: 12 }}>
              <i className="bi bi-diagram-3 fs-1 d-block mb-2" style={{ color: 'var(--text-muted)' }}></i>
              <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>No steps yet. Add your first step to get started.</p>
              <button className="btn btn-primary" onClick={() => openStepModal()}><i className="bi bi-plus-lg"></i> Add First Step</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {steps.sort((a, b) => a.order - b.order).map((step, idx) => (
                <div key={step._id} className="card p-3 animate-slide-up" style={{ animationDelay: `${idx * 0.05}s`, borderLeft: `3px solid var(--primary)` }}>
                  <div className="d-flex align-items-center gap-3">
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: 'var(--border-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', flexShrink: 0
                    }}>{idx + 1}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{step.name}</span>
                        <StepTypeBadge type={step.step_type} />
                        {step.is_terminal && <span className="badge bg-warning text-dark" style={{ fontSize: 10 }}>Terminal</span>}
                      </div>
                      {step.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{step.description}</div>}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {(step.rules || []).length} rule{(step.rules || []).length !== 1 ? 's' : ''} configured
                      </div>
                    </div>

                    <div className="d-flex gap-2 flex-shrink-0">
                      <button className="btn btn-secondary btn-sm" onClick={() => openRuleModal(step)} title="Configure Rules">
                        <i className="bi bi-funnel-fill"></i> Rules
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openStepModal(step)} title="Edit Step">
                        <i className="bi bi-pencil-fill"></i>
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteStep(step)}>
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step Modal ── */}
      {stepModal.show && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content animate-scale-in">
              <div className="modal-header">
                <h5 className="modal-title">{stepModal.editing ? 'Edit Step' : 'Add Step'}</h5>
                <button className="btn btn-icon btn-ghost" onClick={() => setStepModal({ show: false, editing: null })}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label">Step Name *</label>
                    <input className="form-control" placeholder="e.g. Manager Approval" value={stepForm.name}
                      onChange={e => setStepForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Step Type</label>
                    <select className="form-select" value={stepForm.step_type}
                      onChange={e => {
                        const t = e.target.value;
                        setStepForm(f => ({ ...f, step_type: t, metadata: JSON.stringify(defaultMetaTemplates[t] || {}, null, 2) }));
                      }}>
                      {STEP_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <input className="form-control" placeholder="Optional description" value={stepForm.description}
                      onChange={e => setStepForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Metadata (JSON)</label>
                    <textarea className="form-control code-editor" rows={5} value={stepForm.metadata}
                      onChange={e => setStepForm(f => ({ ...f, metadata: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="is_terminal" checked={stepForm.is_terminal}
                        onChange={e => setStepForm(f => ({ ...f, is_terminal: e.target.checked }))} />
                      <label className="form-check-label" htmlFor="is_terminal">
                        Terminal Step <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(workflow ends here)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setStepModal({ show: false, editing: null })}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveStep} disabled={stepSaving}>
                  {stepSaving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : 'Save Step'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Rules Modal ── */}
      {ruleModal.show && ruleModal.step && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content animate-scale-in">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title">Rules for: <strong>{ruleModal.step.name}</strong></h5>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Configure routing rules to determine the next step</p>
                </div>
                <button className="btn btn-icon btn-ghost" onClick={() => setRuleModal({ show: false, step: null })}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="modal-body">
                <div className="row g-4">
                  {/* Rule form */}
                  <div className="col-12 col-md-5">
                    <div className="card p-3" style={{ background: 'var(--bg)' }}>
                      <h6 style={{ fontWeight: 700, marginBottom: 12 }}>{editingRule ? 'Edit Rule' : 'Add Rule'}</h6>
                      <div className="mb-2">
                        <label className="form-label">Rule Name</label>
                        <input className="form-control" placeholder="e.g. High Priority" value={ruleForm.name}
                          onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Condition *</label>
                        <div style={{ position: 'relative' }}>
                          <textarea className="form-control form-control-code" rows={3}
                            placeholder={'amount > 100 && priority == \'High\'\n\nOR use: DEFAULT'}
                            value={ruleForm.condition}
                            onChange={e => setRuleForm(f => ({ ...f, condition: e.target.value }))} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          Operators: == != &gt; &lt; &gt;= &lt;= && || <br />
                          Functions: contains(), startsWith(), endsWith()
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Next Step</label>
                        <select className="form-select" value={ruleForm.next_step_id}
                          onChange={e => setRuleForm(f => ({ ...f, next_step_id: e.target.value }))}>
                          <option value="">— End workflow —</option>
                          {steps.filter(s => s._id !== ruleModal.step._id).map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="row g-2 mb-2">
                        <div className="col-6">
                          <label className="form-label">Priority</label>
                          <input type="number" className="form-control" min={1} value={ruleForm.priority}
                            onChange={e => setRuleForm(f => ({ ...f, priority: e.target.value }))} />
                        </div>
                        <div className="col-6 d-flex align-items-end">
                          <div className="form-check mb-2">
                            <input className="form-check-input" type="checkbox" id="is_def" checked={ruleForm.is_default}
                              onChange={e => setRuleForm(f => ({ ...f, is_default: e.target.checked, condition: e.target.checked ? 'DEFAULT' : f.condition }))} />
                            <label className="form-check-label" htmlFor="is_def">Default</label>
                          </div>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-primary flex-fill" onClick={handleSaveRule} disabled={ruleSaving}>
                          {ruleSaving ? <span className="spinner-border spinner-border-sm" /> : (editingRule ? 'Update Rule' : 'Add Rule')}
                        </button>
                        {editingRule && (
                          <button className="btn btn-secondary" onClick={() => { setEditingRule(null); setRuleForm({ name: '', condition: '', next_step_id: '', priority: 10, is_default: false }); }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rules list */}
                  <div className="col-12 col-md-7">
                    <h6 style={{ fontWeight: 700, marginBottom: 12 }}>Configured Rules ({rules.length})</h6>
                    {rules.length === 0 ? (
                      <div className="text-center py-4" style={{ color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: 10 }}>
                        No rules yet. Add a rule to route execution.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {rules.sort((a, b) => a.priority - b.priority).map(rule => (
                          <div key={rule._id} className="card p-3" style={{ borderLeft: `3px solid ${rule.is_default ? 'var(--warning)' : 'var(--primary)'}` }}>
                            <div className="d-flex align-items-start justify-content-between gap-2">
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                  <span style={{ background: 'var(--border-light)', padding: '1px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                                    #{rule.priority}
                                  </span>
                                  {rule.name && <span style={{ fontWeight: 600, fontSize: 13 }}>{rule.name}</span>}
                                  {rule.is_default && <span className="badge bg-warning text-dark" style={{ fontSize: 10 }}>DEFAULT</span>}
                                </div>
                                <code style={{ fontSize: 12, background: 'var(--bg)', padding: '3px 8px', borderRadius: 4, display: 'block', wordBreak: 'break-all' }}>
                                  {rule.condition}
                                </code>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                  → {rule.next_step_id ? steps.find(s => s._id === rule.next_step_id)?.name || 'Unknown step' : 'End workflow'}
                                </div>
                              </div>
                              <div className="d-flex gap-1">
                                <button className="btn btn-secondary btn-sm" onClick={() => {
                                  setEditingRule(rule);
                                  setRuleForm({ name: rule.name || '', condition: rule.condition, next_step_id: rule.next_step_id || '', priority: rule.priority, is_default: rule.is_default });
                                }}><i className="bi bi-pencil-fill"></i></button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRule(rule._id)}>
                                  <i className="bi bi-trash-fill"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={() => setRuleModal({ show: false, step: null })}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        show={!!deleteStep}
        title="Delete Step"
        message={`Delete step "${deleteStep?.name}"? All associated rules will also be deleted.`}
        confirmText="Delete Step"
        variant="danger"
        onConfirm={handleDeleteStep}
        onCancel={() => setDeleteStep(null)}
      />
    </div>
  );
}
