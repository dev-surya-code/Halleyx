import React from 'react';

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  let sp = Math.max(1, page - 2);
  let ep = Math.min(pages, page + 2);
  if (ep - sp < 4) {
    if (sp === 1) ep = Math.min(pages, 5);
    else sp = Math.max(1, ep - 4);
  }
  const nums = [];
  for (let i = sp; i <= ep; i++) nums.push(i);

  const btnBase = {
    padding: '6px 11px', border: '1px solid var(--border)',
    borderRadius: 8, background: 'var(--bg-card)',
    color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
    lineHeight: 1.4,
  };
  const btnActive = {
    ...btnBase,
    background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
    borderColor: 'var(--brand-600)', color: '#fff',
    boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
  };
  const btnDisabled = { ...btnBase, opacity: 0.4, cursor: 'not-allowed' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
        Showing <strong style={{ color: 'var(--text-primary)' }}>{start}–{end}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> results
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          style={page === 1 ? btnDisabled : btnBase}
          onClick={() => page > 1 && onPageChange(1)}
          disabled={page === 1}
          title="First page"
        >
          <i className="bi bi-chevron-double-left" style={{ fontSize: 11 }} />
        </button>
        <button
          style={page === 1 ? btnDisabled : btnBase}
          onClick={() => page > 1 && onPageChange(page - 1)}
          disabled={page === 1}
        >
          <i className="bi bi-chevron-left" style={{ fontSize: 11 }} />
        </button>

        {sp > 1 && (
          <>
            <button style={btnBase} onClick={() => onPageChange(1)}>1</button>
            {sp > 2 && <span style={{ color: 'var(--text-muted)', padding: '0 2px', fontSize: 13 }}>…</span>}
          </>
        )}

        {nums.map(n => (
          <button key={n} style={n === page ? btnActive : btnBase} onClick={() => onPageChange(n)}>{n}</button>
        ))}

        {ep < pages && (
          <>
            {ep < pages - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 2px', fontSize: 13 }}>…</span>}
            <button style={btnBase} onClick={() => onPageChange(pages)}>{pages}</button>
          </>
        )}

        <button
          style={page === pages ? btnDisabled : btnBase}
          onClick={() => page < pages && onPageChange(page + 1)}
          disabled={page === pages}
        >
          <i className="bi bi-chevron-right" style={{ fontSize: 11 }} />
        </button>
        <button
          style={page === pages ? btnDisabled : btnBase}
          onClick={() => page < pages && onPageChange(pages)}
          disabled={page === pages}
          title="Last page"
        >
          <i className="bi bi-chevron-double-right" style={{ fontSize: 11 }} />
        </button>
      </div>
    </div>
  );
}
