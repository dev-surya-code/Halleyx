require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middlewares/errorMiddleware');
const wsManager = require('./services/websocketService');
const {
  sanitizeInputs, ipBlocker, securityHeaders, requestSizeGuard,
  getAuditLog, getBlockedIPs, blockIP, unblockIP, getLoginAttempts,
} = require('./middlewares/securityMiddleware');

const authRoutes      = require('./routes/authRoutes');
const workflowRoutes  = require('./routes/workflowRoutes');
const stepRoutes      = require('./routes/stepRoutes');
const ruleRoutes      = require('./routes/ruleRoutes');
const executionRoutes = require('./routes/executionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app    = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: '/ws' });
wsManager.initialize(wss);
connectDB();

// Security
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(securityHeaders);
app.use(ipBlocker);
app.use(compression());

// Rate limiting
const globalLimiter = rateLimit({ windowMs: 15*60*1000, max: 500, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many requests.' } });
const authLimiter   = rateLimit({ windowMs: 15*60*1000, max: 30,  standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many auth attempts.' }, skipSuccessfulRequests: true });
app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

// CORS
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true, methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','X-Request-ID'] }));

// Body
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(requestSizeGuard(2*1024*1024));
app.use(sanitizeInputs);

// Request ID
app.use((req,_res,next)=>{ req.id=req.headers['x-request-id']||require('crypto').randomUUID(); next(); });

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Health
app.get('/health', (_req, res) => res.json({ status:'OK', timestamp:new Date().toISOString(), version:'2.0.0', uptime:process.uptime() }));

// Dev security dashboard
if (process.env.NODE_ENV !== 'production') {
  app.get('/security/audit',          (_req,res)=>res.json({ events: getAuditLog(200) }));
  app.get('/security/blocked-ips',    (_req,res)=>res.json(getBlockedIPs()));
  app.get('/security/login-attempts', (_req,res)=>res.json(getLoginAttempts()));
  app.post('/security/block-ip', (req,res)=>{ const {ip,reason,durationMinutes}=req.body; blockIP(ip,reason||'Manual',durationMinutes?durationMinutes*60000:null); res.json({success:true}); });
  app.delete('/security/block-ip/:ip', (req,res)=>{ unblockIP(req.params.ip); res.json({success:true}); });
}

// Routes
app.use('/api/auth',      authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api',           stepRoutes);
app.use('/api',           ruleRoutes);
app.use('/api',           executionRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 FlowForge v2.0 — port ${PORT}`);
  console.log(`🔒 Security: brute-force, IP-blocker, sanitization, audit-log`);
  console.log(`🌍 Env: ${process.env.NODE_ENV||'development'}\n`);
});

module.exports = { app, server };
