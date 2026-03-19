import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { workflowAPI } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmModal from '../components/common/ConfirmModal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CATEGORY_ICONS = { hr:'👥', finance:'💰', operations:'⚙️', it:'🖥️', sales:'📈', general:'📋' };

export default function WorkflowListPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows]     = useState([]);
  const [pagination, setPagination]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]               = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggling, setToggling]       = useState(null);
  const [view, setView]               = useState('table'); // 'table' | 'grid'

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workflowAPI.getAll({ page, limit:10, search, status:statusFilter });
      setWorkflows(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { const t = setTimeout(() => fetch(), 380); return () => clearTimeout(t); }, [search]); // eslint-disable-line

  const handleDelete = async () => {
    setDeleteLoading(true);
    try { await workflowAPI.delete(deleteTarget._id); toast.success('Workflow deleted'); setDeleteTarget(null); fetch(); }
    catch {} finally { setDeleteLoading(false); }
  };

  const handleToggle = async (wf) => {
    setToggling(wf._id);
    try { await workflowAPI.toggle(wf._id); toast.success(`Workflow ${wf.is_active ? 'deactivated' : 'activated'}`); fetch(); }
    catch {} finally { setToggling(null); }
  };

  const handleDuplicate = async (id) => {
    try { await workflowAPI.duplicate(id); toast.success('Workflow duplicated'); fetch(); } catch {}
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Workflows</h1>
          <p className="page-subtitle">Create and manage your automation workflows · {pagination?.total ?? 0} total</p>
        </div>
        <div className="page-header-actions">
          <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
            {[['table','bi-list-ul'],['grid','bi-grid-fill']].map(([v,ic]) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding:'6px 10px', border:'none', cursor:'pointer', fontFamily:'var(--font-sans)',
                background: view===v ? 'var(--brand-500)' : 'var(--bg-card)', color: view===v ? '#fff' : 'var(--text-muted)',
                transition:'all 0.2s',
              }}><i className={`bi ${ic}`} style={{ fontSize:13 }} /></button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/workflows/new')}>
            <i className="bi bi-plus-lg" /> Create Workflow
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 mb-3" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <div className="search-bar" style={{ flex:1, minWidth:180 }}>
            <i className="search-icon bi bi-search" />
            <input className="form-control" placeholder="Search workflows…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-select" style={{ width:150 }} value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={fetch} title="Refresh">
            <i className="bi bi-arrow-clockwise" />
          </button>
        </div>
      </div>

      {/* Table View */}
      {view === 'table' && (
        <div className="table-container">
          {loading ? <LoadingSpinner /> : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Category</th>
                    <th>Steps</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Executions</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.length === 0 ? (
                    <tr><td colSpan="8">
                      <div className="empty-state">
                        <div className="empty-state-icon">⚡</div>
                        <div className="empty-state-title">{search ? 'No matching workflows' : 'No workflows yet'}</div>
                        <div className="empty-state-desc">{search ? 'Try a different search term' : 'Create your first automation workflow to get started'}</div>
                        {!search && <button className="btn btn-primary btn-sm" onClick={() => navigate('/workflows/new')}>Create First Workflow</button>}
                      </div>
                    </td></tr>
                  ) : workflows.map((wf, idx) => (
                    <tr key={wf._id} className="animate-fade-in" style={{ animationDelay:`${idx*40}ms` }}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{
                            width:36, height:36, borderRadius:9, flexShrink:0,
                            background:'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.08))',
                            border:'1px solid rgba(99,102,241,0.15)',
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                          }}>
                            {CATEGORY_ICONS[wf.category] || '⚙️'}
                          </div>
                          <div>
                            <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:13, cursor:'pointer' }}
                              onClick={() => navigate(`/workflows/${wf._id}/edit`)}
                            >{wf.name}</div>
                            {wf.description && <div style={{ fontSize:11, color:'var(--text-muted)', maxWidth:240 }} className="truncate">{wf.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize:11.5, color:'var(--text-muted)', background:'var(--border-light)', padding:'3px 9px', borderRadius:6, fontWeight:600, textTransform:'capitalize' }}>
                          {wf.category}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight:700, color:'var(--text-primary)' }}>{wf.step_count || 0}</span>
                        <span style={{ color:'var(--text-muted)', fontSize:12 }}> steps</span>
                      </td>
                      <td><span className="mono" style={{ fontSize:12, color:'var(--text-muted)', background:'var(--border-light)', padding:'2px 7px', borderRadius:5 }}>v{wf.version}</span></td>
                      <td>
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          <span className={`badge-status ${wf.is_active ? 'badge-active' : 'badge-inactive'}`}>{wf.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight:700, color:'var(--text-primary)' }}>{wf.execution_count ?? 0}</span>
                      </td>
                      <td style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                        {new Date(wf.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-success btn-icon-sm" onClick={() => navigate(`/workflows/${wf._id}/execute`)} disabled={!wf.is_active} title="Execute" style={{ padding:'5px 8px' }}>
                            <i className="bi bi-play-fill" style={{ fontSize:12 }} />
                          </button>
                          <button className="btn btn-secondary btn-icon-sm" onClick={() => navigate(`/workflows/${wf._id}/edit`)} title="Edit" style={{ padding:'5px 8px' }}>
                            <i className="bi bi-pencil-fill" style={{ fontSize:12 }} />
                          </button>
                          <button className={`btn btn-icon-sm ${wf.is_active ? 'btn-warning' : 'btn-secondary'}`} onClick={() => handleToggle(wf)} disabled={toggling===wf._id} title={wf.is_active?'Deactivate':'Activate'} style={{ padding:'5px 8px' }}>
                            {toggling===wf._id ? <div style={{ width:10, height:10, border:'2px solid rgba(255,255,255,0.5)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} /> : <i className={`bi ${wf.is_active?'bi-pause-fill':'bi-play-circle-fill'}`} style={{ fontSize:12 }} />}
                          </button>
                          <button className="btn btn-secondary btn-icon-sm" onClick={() => handleDuplicate(wf._id)} title="Duplicate" style={{ padding:'5px 8px' }}>
                            <i className="bi bi-copy" style={{ fontSize:12 }} />
                          </button>
                          <button className="btn btn-danger btn-icon-sm" onClick={() => setDeleteTarget(wf)} title="Delete" style={{ padding:'5px 8px' }}>
                            <i className="bi bi-trash-fill" style={{ fontSize:12 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && pagination && <div style={{ padding:'12px 18px' }}><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      )}

      {/* Grid View */}
      {view === 'grid' && (
        loading ? <LoadingSpinner /> : (
          workflows.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon">⚡</div>
              <div className="empty-state-title">No workflows found</div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/workflows/new')}>Create First Workflow</button>
            </div>
          ) : (
            <div className="grid-3">
              {workflows.map((wf, idx) => (
                <div key={wf._id} className="card hover-lift animate-fade-in" style={{ animationDelay:`${idx*50}ms`, cursor:'pointer', padding:20 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ width:42, height:42, borderRadius:11, background:'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.1))', border:'1px solid rgba(99,102,241,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                      {CATEGORY_ICONS[wf.category] || '⚙️'}
                    </div>
                    <span className={`badge-status ${wf.is_active ? 'badge-active' : 'badge-inactive'}`}>{wf.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:5 }} onClick={() => navigate(`/workflows/${wf._id}/edit`)}>{wf.name}</h3>
                  {wf.description && <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12, lineHeight:1.5 }} className="truncate">{wf.description}</p>}
                  <div style={{ display:'flex', gap:12, fontSize:12, color:'var(--text-muted)', marginBottom:14 }}>
                    <span><i className="bi bi-layers-fill me-1" />{wf.step_count||0} steps</span>
                    <span><i className="bi bi-play-circle-fill me-1" />{wf.execution_count||0} runs</span>
                    <span className="mono">v{wf.version}</span>
                  </div>
                  <div style={{ display:'flex', gap:6, borderTop:'1px solid var(--border-light)', paddingTop:12 }}>
                    <button className="btn btn-success btn-sm" style={{ flex:1 }} onClick={() => navigate(`/workflows/${wf._id}/execute`)} disabled={!wf.is_active}>
                      <i className="bi bi-play-fill" /> Run
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ flex:1 }} onClick={() => navigate(`/workflows/${wf._id}/edit`)}>
                      <i className="bi bi-pencil-fill" /> Edit
                    </button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => setDeleteTarget(wf)} title="Delete">
                      <i className="bi bi-trash-fill" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )
      )}

      <ConfirmModal show={!!deleteTarget} title="Delete Workflow"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will permanently delete all steps, rules, and related data.`}
        confirmText="Delete Workflow" variant="danger"
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleteLoading} />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
