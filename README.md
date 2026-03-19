# ⚡ FlowForge v2.0 — Production Workflow Automation Platform

A **production-grade** MERN-stack workflow automation platform with **advanced security**, **premium UI**, and **full responsive design**.

---

## 🚀 What's New in v2.0

### 🔒 Advanced Security Features
| Feature | Details |
|---|---|
| **Brute-Force Protection** | Sliding-window per email/IP, auto-lockout after 10 failures (30-min lockout) |
| **JWT Token Blacklist** | Logout truly invalidates tokens — no replay after sign-out |
| **IP Blocker** | Block/unblock IPs with optional expiry via admin API |
| **Audit Logging** | Every auth/admin action logged with IP, user, status, level (INFO/WARN/CRIT) |
| **Input Sanitization** | Blocks XSS, SQL injection, NoSQL injection (`$where`, `$ne`), path traversal |
| **Security Headers** | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Permissions-Policy |
| **Strict Rate Limits** | Auth: 30 req/15min · API: 500 req/15min (separate limiters) |
| **Password Policy** | Enforces uppercase + lowercase + number, min 8 chars |
| **Request Size Guard** | Extra 2MB payload limit beyond Express defaults |
| **RBAC** | Admin / Manager / User roles on all sensitive endpoints |

### 🎨 Premium UI / Design System
- **Inter font** — professional, readable at all sizes
- **Deep dark theme** with true blacks, navy cards, smooth transitions
- **Advanced stat cards** — animated gradient border on hover, glow orbs, number counter
- **Ripple buttons** with spring physics on click
- **Animated sidebar** — active state left-border gradient, logo shimmer effect, security status panel
- **Live WebSocket indicator** in topbar
- **Glassmorphism login page** with particle animations and password strength meter
- **Stagger animations** on page loads
- **Skeleton loaders** for all async states
- **Toast notifications** with custom styling
- **Full responsive grid** (4→2→1 breakpoints, mobile sidebar overlay)

### 📊 New Pages
- **Audit Logs** (`/logs`) — Real-time security event viewer with level filtering

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Bootstrap 5, Chart.js, Inter font |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Auth | JWT (JSON Web Tokens) + token blacklist |
| Real-time | WebSocket (ws) |
| Security | Helmet.js, bcrypt (12 rounds), express-rate-limit, custom middleware |

---

## ⚡ Quick Start

### Prerequisites
- Node.js ≥ 16.x
- MongoDB running on port 27017 (or MongoDB Atlas)

### 1 — Install
```bash
npm run install:all
```

### 2 — Configure
Edit `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/flowforge_v2
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
```

### 3 — Seed demo data
```bash
npm run seed
```

Demo accounts:
| Email | Password | Role |
|---|---|---|
| admin@workflowplatform.com | Admin@123 | Admin |
| manager@example.com | Manager@123 | Manager |
| john@example.com | User@123 | User |

### 4 — Start
```bash
npm run dev
```

URLs:
- 🌐 Frontend: http://localhost:3000
- 🔌 Backend: http://localhost:5000/api
- ❤️ Health: http://localhost:5000/health
- 🔒 Audit Log: http://localhost:5000/security/audit *(dev only)*
- 🚫 Blocked IPs: http://localhost:5000/security/blocked-ips *(dev only)*

---

## 🔒 Security Admin Endpoints (dev only)

```
GET  /security/audit            — Last 200 audit events
GET  /security/blocked-ips      — Currently blocked IPs
GET  /security/login-attempts   — Brute-force attempt counters
POST /security/block-ip         — Block an IP { ip, reason, durationMinutes }
DELETE /security/block-ip/:ip   — Unblock an IP
```

---

## 🚢 Production Deployment

### Backend
```bash
NODE_ENV=production
JWT_SECRET=<64-byte random hex>
MONGODB_URI=<mongodb-atlas-uri>
FRONTEND_URL=<your-frontend-domain>
npm start
```

### Frontend
```bash
REACT_APP_API_URL=https://your-api.com/api
REACT_APP_WS_URL=wss://your-api.com/ws
npm run build
# Serve /build with nginx
```

### Production Security Checklist
- [ ] Change `JWT_SECRET` to 64-byte random value
- [ ] Set `NODE_ENV=production`
- [ ] Use MongoDB Atlas with IP allowlist
- [ ] Enable HTTPS / TLS termination at load balancer
- [ ] Replace in-memory stores (brute-force, blacklist) with Redis
- [ ] Configure CORS `FRONTEND_URL` to exact domain
- [ ] Set up log aggregation (Datadog, Logtail, etc.)

---

## 📝 License
MIT — Free for personal and commercial use.
