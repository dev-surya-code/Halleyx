import React, { useEffect } from 'react';

export default function ConfirmModal({ show, title, message, confirmText = 'Confirm', variant = 'danger', onConfirm, onCancel, loading }) {
  // Close on Escape key
  useEffect(() => {
    if (!show) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [show, onCancel]);

  if (!show) return null;

  const variantConfig = {
    danger:  { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', shadow: 'rgba(239,68,68,0.35)',  icon: 'bi-exclamation-triangle-fill', iconBg: 'rgba(239,68,68,0.1)',  iconColor: '#ef4444' },
    warning: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', shadow: 'rgba(245,158,11,0.35)', icon: 'bi-exclamation-circle-fill',   iconBg: 'rgba(245,158,11,0.1)', iconColor: '#f59e0b' },
    primary: { bg: 'linear-gradient(135deg, #6366f1, #4f46e5)', shadow: 'rgba(99,102,241,0.35)',  icon: 'bi-info-circle-fill',          iconBg: 'rgba(99,102,241,0.1)', iconColor: '#6366f1' },
  };
  const cfg = variantConfig[variant] || variantConfig.danger;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          width: '100%', maxWidth: 420,
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          animation: 'modal-enter 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          overflow: 'hidden',
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, background: cfg.bg }} />

        <div style={{ padding: '28px 28px 24px' }}>
          {/* Icon */}
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: cfg.iconBg, border: `1px solid ${cfg.iconColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 18,
          }}>
            <i className={`bi ${cfg.icon}`} style={{ fontSize: 22, color: cfg.iconColor }} />
          </div>

          {/* Title */}
          <h5 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: -0.3 }}>
            {title}
          </h5>

          {/* Message */}
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex', gap: 10, padding: '16px 28px 24px',
          borderTop: '1px solid var(--border-light)',
        }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: '10px', border: '1.5px solid var(--border)',
              borderRadius: 10, background: 'var(--bg-card)',
              color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13.5,
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '10px', border: 'none',
              borderRadius: 10,
              background: loading ? `${cfg.bg}90` : cfg.bg,
              color: '#fff', fontWeight: 700, fontSize: 13.5,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
              boxShadow: loading ? 'none' : `0 4px 14px ${cfg.shadow}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Processing…
              </>
            ) : confirmText}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes modal-enter { from{opacity:0;transform:scale(0.88) translateY(-20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
