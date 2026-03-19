import React from 'react';

export default function LoadingSpinner({ fullscreen, size = 'md', text = 'Loading...' }) {
  const sizes = { sm: 20, md: 36, lg: 52 };
  const px = sizes[size] || 36;

  const spinner = (
    <div style={{ position: 'relative', width: px, height: px }}>
      {/* Outer ring */}
      <div style={{
        position: 'absolute', inset: 0,
        border: `${px > 30 ? 3 : 2}px solid var(--border)`,
        borderRadius: '50%',
      }} />
      {/* Spinning arc */}
      <div style={{
        position: 'absolute', inset: 0,
        border: `${px > 30 ? 3 : 2}px solid transparent`,
        borderTopColor: 'var(--brand-500)',
        borderRightColor: 'var(--cyan-500)',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
      }} />
      {/* Inner glow dot */}
      {px > 30 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: px * 0.25, height: px * 0.25,
          background: 'linear-gradient(135deg, var(--brand-500), var(--cyan-500))',
          borderRadius: '50%',
          animation: 'pulse-glow 1.5s ease-in-out infinite',
        }} />
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-glow { 0%,100%{opacity:0.6;transform:translate(-50%,-50%) scale(1)} 50%{opacity:1;transform:translate(-50%,-50%) scale(1.3)} }
      `}</style>
    </div>
  );

  if (fullscreen) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 18, zIndex: 9000,
      }}>
        <div style={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, var(--brand-500), var(--cyan-500))',
          borderRadius: 16, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 26,
          boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
          marginBottom: 4,
          animation: 'float-logo 2s ease-in-out infinite',
        }}>⚡</div>
        {spinner}
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: 0.3 }}>{text}</span>
        <style>{`@keyframes float-logo{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: size === 'sm' ? 12 : 32, gap: 12,
    }}>
      {spinner}
      {size !== 'sm' && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{text}</span>
      )}
    </div>
  );
}
