import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [strength, setStrength] = useState(0);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const pts = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 4,
      opacity: Math.random() * 0.4 + 0.1,
    }));
    setParticles(pts);
  }, []);

  const calcStrength = (pw) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };

  const strengthLabels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === 'password') setStrength(calcStrength(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back! 🎉');
      } else {
        if (!form.name.trim()) { toast.error('Name is required'); setLoading(false); return; }
        if (strength < 3) { toast.error('Please use a stronger password'); setLoading(false); return; }
        await register(form.name, form.email, form.password);
        toast.success('Account created successfully!');
      }
      navigate('/');
    } catch {}
    finally { setLoading(false); }
  };

  const fillDemo = (role) => {
    const creds = {
      admin:   { email: 'admin@workflowplatform.com',  password: 'Admin@123' },
      manager: { email: 'manager@example.com',          password: 'Manager@123' },
      user:    { email: 'john@example.com',             password: 'User@123' },
    };
    setForm(f => ({ ...f, ...creds[role] }));
    toast.info(`Demo credentials filled (${role})`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #050812 0%, #0a0f1e 35%, #0d1435 65%, #050812 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
    }}>

      {/* Animated grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
      }} />

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: p.id % 3 === 0 ? '#6366f1' : p.id % 3 === 1 ? '#06b6d4' : '#8b5cf6',
          opacity: p.opacity,
          animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          boxShadow: `0 0 ${p.size * 3}px currentColor`,
        }} />
      ))}

      {/* Glow orbs */}
      <div style={{ position:'absolute', top:'15%', left:'10%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', filter:'blur(60px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'15%', right:'10%', width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)', filter:'blur(60px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1, animation:'fadeInUp 0.5s ease-out' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            width:64, height:64,
            background:'linear-gradient(135deg, #6366f1, #06b6d4)',
            borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:30, margin:'0 auto 16px',
            boxShadow:'0 8px 32px rgba(99,102,241,0.5), 0 0 0 1px rgba(99,102,241,0.3)',
            animation:'float 4s ease-in-out infinite',
            position:'relative', overflow:'hidden',
          }}>
            ⚡
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)', animation:'logo-shimmer 3s infinite' }} />
          </div>
          <h1 style={{ color:'#fff', fontSize:30, fontWeight:900, letterSpacing:-1, margin:0, lineHeight:1 }}>FlowForge</h1>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13, marginTop:6, fontWeight:400 }}>
            Workflow Automation Platform — v2.0
          </p>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(255,255,255,0.04)',
          backdropFilter:'blur(24px) saturate(1.5)',
          WebkitBackdropFilter:'blur(24px) saturate(1.5)',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:24, padding:32,
          boxShadow:'0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}>

          {/* Tabs */}
          <div style={{ display:'flex', background:'rgba(0,0,0,0.35)', borderRadius:12, padding:4, marginBottom:28, gap:4 }}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex:1, padding:'9px', border:'none', borderRadius:9,
                background: mode === m ? 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(79,70,229,0.9))' : 'transparent',
                color: mode === m ? '#fff' : 'rgba(255,255,255,0.45)',
                fontWeight:700, fontSize:13.5, cursor:'pointer',
                transition:'all 0.2s', fontFamily:'var(--font-sans)',
                boxShadow: mode === m ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
              }}>
                {m === 'login' ? '🔑 Sign In' : '✨ Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {mode === 'register' && (
              <div>
                <label style={{ fontSize:12.5, fontWeight:600, color:'rgba(255,255,255,0.6)', marginBottom:7, display:'block', letterSpacing:0.3 }}>Full Name</label>
                <div style={{ position:'relative' }}>
                  <i className="bi bi-person-fill" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)', fontSize:14, pointerEvents:'none' }} />
                  <input type="text" name="name" className="form-control" placeholder="John Doe" value={form.name} onChange={handleChange} autoComplete="name"
                    style={{ background:'rgba(0,0,0,0.3)', border:'1.5px solid rgba(255,255,255,0.08)', color:'#fff', borderRadius:10, paddingLeft:38 }} />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize:12.5, fontWeight:600, color:'rgba(255,255,255,0.6)', marginBottom:7, display:'block', letterSpacing:0.3 }}>Email Address</label>
              <div style={{ position:'relative' }}>
                <i className="bi bi-envelope-fill" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)', fontSize:13, pointerEvents:'none' }} />
                <input type="email" name="email" className="form-control" placeholder="you@example.com" value={form.email} onChange={handleChange} required autoComplete="email"
                  style={{ background:'rgba(0,0,0,0.3)', border:'1.5px solid rgba(255,255,255,0.08)', color:'#fff', borderRadius:10, paddingLeft:38 }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize:12.5, fontWeight:600, color:'rgba(255,255,255,0.6)', marginBottom:7, display:'block', letterSpacing:0.3 }}>Password</label>
              <div style={{ position:'relative' }}>
                <i className="bi bi-lock-fill" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)', fontSize:13, pointerEvents:'none' }} />
                <input type={showPass ? 'text' : 'password'} name="password" className="form-control" placeholder="••••••••" value={form.password} onChange={handleChange} required
                  style={{ background:'rgba(0,0,0,0.3)', border:'1.5px solid rgba(255,255,255,0.08)', color:'#fff', borderRadius:10, paddingLeft:38, paddingRight:42 }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', fontSize:14, padding:2 }}>
                  <i className={`bi ${showPass ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`} />
                </button>
              </div>

              {/* Password strength (register mode) */}
              {mode === 'register' && form.password && (
                <div style={{ marginTop:8 }}>
                  <div style={{ display:'flex', gap:3, marginBottom:4 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i <= strength ? strengthColors[strength] : 'rgba(255,255,255,0.1)', transition:'background 0.3s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize:11, color: strengthColors[strength], fontWeight:600 }}>{strengthLabels[strength]}</span>
                  {strength < 3 && <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginLeft:8 }}>— add uppercase, numbers & symbols</span>}
                </div>
              )}
            </div>

            {/* Security info */}
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:9, fontSize:11.5, color:'rgba(16,185,129,0.9)' }}>
              <i className="bi bi-shield-fill-check" style={{ fontSize:13, flexShrink:0 }} />
              <span>End-to-end encrypted · JWT secured · Rate limited</span>
            </div>

            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'13px',
              background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border:'none', borderRadius:12, color:'#fff', fontWeight:800, fontSize:15,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition:'all 0.2s', fontFamily:'var(--font-sans)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow: loading ? 'none' : '0 6px 20px rgba(99,102,241,0.45)',
              transform: loading ? 'scale(0.99)' : 'none',
              letterSpacing:0.2,
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
            >
              {loading
                ? <><div style={{ width:16, height:16, border:'2.5px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />Processing…</>
                : <><i className={`bi ${mode==='login' ? 'bi-box-arrow-in-right' : 'bi-person-plus-fill'}`} />{mode === 'login' ? 'Sign In to FlowForge' : 'Create Account'}</>
              }
            </button>
          </form>

          {/* Demo credentials */}
          {mode === 'login' && (
            <div style={{ marginTop:20 }}>
              <div style={{ textAlign:'center', fontSize:11.5, color:'rgba(255,255,255,0.25)', marginBottom:10, letterSpacing:0.5, textTransform:'uppercase', fontWeight:600 }}>— Demo Accounts —</div>
              <div style={{ display:'flex', gap:8 }}>
                {[
                  { role:'admin',   label:'Admin',   icon:'bi-shield-fill', color:'#ef4444' },
                  { role:'manager', label:'Manager', icon:'bi-person-badge-fill', color:'#f59e0b' },
                  { role:'user',    label:'User',    icon:'bi-person-fill', color:'#10b981' },
                ].map(d => (
                  <button key={d.role} onClick={() => fillDemo(d.role)} style={{
                    flex:1, padding:'8px 6px', background:'rgba(255,255,255,0.04)',
                    border:`1px solid rgba(255,255,255,0.08)`, borderRadius:9,
                    color:'rgba(255,255,255,0.6)', fontSize:11.5, cursor:'pointer',
                    fontFamily:'var(--font-sans)', fontWeight:600, transition:'all 0.2s',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor=d.color+'44'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; }}
                  >
                    <i className={`bi ${d.icon}`} style={{ color:d.color, fontSize:16 }} />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign:'center', marginTop:16, color:'rgba(255,255,255,0.2)', fontSize:11.5 }}>
          FlowForge v2.0 · Secured by bcrypt + JWT + Rate Limiting
        </p>
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes logo-shimmer { 0%{transform:translateX(-100%) skewX(-20deg)} 100%{transform:translateX(200%) skewX(-20deg)} }
        input[style*="color: rgb(255, 255, 255)"]::placeholder { color: rgba(255,255,255,0.25) !important; }
        input:focus { border-color: rgba(99,102,241,0.6) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important; outline: none !important; }
      `}</style>
    </div>
  );
}
