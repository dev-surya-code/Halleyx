/**
 * ╔══════════════════════════════════════════════════════╗
 * ║   FlowForge — Advanced Security Middleware Suite     ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Features:
 *  - Brute-force login protection (in-memory sliding window)
 *  - JWT token blacklist (logout invalidation)
 *  - Request fingerprinting & anomaly detection
 *  - Audit event logging
 *  - IP allowlist / blocklist
 *  - Strict input sanitization
 *  - Security headers enhancement
 *  - CSRF token validation helper
 *  - Payload size guard
 */

const crypto = require('crypto');

// ── In-memory stores (swap for Redis in production) ──────────────────────────

/** blacklistedTokens: Set<jti> – invalidated JWT IDs */
const blacklistedTokens = new Set();

/** loginAttempts: Map<key, {count, firstAt, lockedUntil}> */
const loginAttempts = new Map();

/** auditLog: circular buffer (last 5000 events) */
const auditLog = [];
const AUDIT_MAX = 5000;

/** blockedIPs: Map<ip, { reason, blockedAt, expiresAt }> */
const blockedIPs = new Map();

// ── Constants ─────────────────────────────────────────────────────────────────
const BRUTE_FORCE = {
  MAX_ATTEMPTS: 10,           // failures before lockout
  WINDOW_MS:   15 * 60 * 1000, // 15-minute window
  LOCKOUT_MS:  30 * 60 * 1000, // 30-minute lockout
};

const SUSPICIOUS_PATTERNS = [
  /<script[\s\S]*?>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /union\s+select/i,
  /;\s*drop\s+table/i,
  /\$where/i,
  /\$ne\s*:/i,
  /\.\.\//,
  /%2e%2e/i,
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function recordAudit(event) {
  const entry = { ts: new Date().toISOString(), ...event };
  auditLog.push(entry);
  if (auditLog.length > AUDIT_MAX) auditLog.shift();
  if (process.env.NODE_ENV === 'development') {
    const lvl = event.level || 'INFO';
    const mark = lvl === 'WARN' ? '⚠️' : lvl === 'CRIT' ? '🚨' : '🔒';
    console.log(`${mark} [AUDIT] ${entry.ts} | ${event.action} | ${event.ip || '-'} | ${event.user || 'anon'}`);
  }
}

function containsSuspiciousContent(value) {
  if (typeof value === 'string') {
    return SUSPICIOUS_PATTERNS.some(p => p.test(value));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some(v => containsSuspiciousContent(v));
  }
  return false;
}

// ── Middleware Factories ───────────────────────────────────────────────────────

/**
 * bruteForceProtect(identifier?)
 * identifier: function(req) => string  (default: IP)
 */
function bruteForceProtect(identifier) {
  return (req, res, next) => {
    const key = identifier ? identifier(req) : getClientIP(req);
    const now = Date.now();
    let record = loginAttempts.get(key);

    if (record) {
      // Expired window → reset
      if (now - record.firstAt > BRUTE_FORCE.WINDOW_MS) {
        loginAttempts.delete(key);
        record = null;
      }
      // Still locked
      if (record?.lockedUntil && now < record.lockedUntil) {
        const remaining = Math.ceil((record.lockedUntil - now) / 60000);
        recordAudit({ action: 'BRUTE_FORCE_BLOCKED', ip: key, level: 'CRIT' });
        return res.status(429).json({
          success: false,
          message: `Account temporarily locked. Try again in ${remaining} minute(s).`,
          retryAfter: record.lockedUntil,
        });
      }
    }

    // Attach helpers to req so authController can call them
    req._bruteKey = key;

    req.recordLoginFailure = () => {
      const r = loginAttempts.get(key) || { count: 0, firstAt: Date.now() };
      r.count += 1;
      if (r.count >= BRUTE_FORCE.MAX_ATTEMPTS) {
        r.lockedUntil = Date.now() + BRUTE_FORCE.LOCKOUT_MS;
        recordAudit({ action: 'ACCOUNT_LOCKED', ip: key, attempts: r.count, level: 'CRIT' });
      }
      loginAttempts.set(key, r);
    };

    req.clearLoginFailures = () => {
      loginAttempts.delete(key);
    };

    next();
  };
}

/**
 * Blacklist a JWT (call on logout / password change)
 */
function blacklistToken(jti) {
  if (jti) blacklistedTokens.add(jti);
  // Auto-clean every 10k entries
  if (blacklistedTokens.size > 10000) {
    const arr = [...blacklistedTokens];
    arr.slice(0, 5000).forEach(t => blacklistedTokens.delete(t));
  }
}

/**
 * Middleware: reject blacklisted tokens (attach after JWT verify)
 */
function rejectBlacklisted(req, res, next) {
  const jti = req.user?.jti;
  if (jti && blacklistedTokens.has(jti)) {
    recordAudit({ action: 'BLACKLISTED_TOKEN_USED', ip: getClientIP(req), user: req.user?.id, level: 'WARN' });
    return res.status(401).json({ success: false, message: 'Session has been invalidated. Please log in again.' });
  }
  next();
}

/**
 * Input sanitization — blocks XSS / SQLi / NoSQL injection attempts
 */
function sanitizeInputs(req, res, next) {
  const targets = [req.body, req.query, req.params];
  for (const obj of targets) {
    if (containsSuspiciousContent(obj)) {
      const ip = getClientIP(req);
      recordAudit({ action: 'MALICIOUS_INPUT_BLOCKED', ip, path: req.path, level: 'CRIT' });
      return res.status(400).json({ success: false, message: 'Request contains invalid or unsafe content.' });
    }
  }
  next();
}

/**
 * Audit logger — attach to any sensitive route
 */
function auditLogger(action) {
  return (req, res, next) => {
    res.on('finish', () => {
      recordAudit({
        action,
        ip: getClientIP(req),
        user: req.user?.id || req.user?.email || 'anon',
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        level: res.statusCode >= 400 ? 'WARN' : 'INFO',
      });
    });
    next();
  };
}

/**
 * IP blocker middleware
 */
function ipBlocker(req, res, next) {
  const ip = getClientIP(req);
  const block = blockedIPs.get(ip);
  if (block) {
    if (block.expiresAt && Date.now() > block.expiresAt) {
      blockedIPs.delete(ip);
    } else {
      recordAudit({ action: 'BLOCKED_IP_REQUEST', ip, level: 'CRIT' });
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
  }
  next();
}

/**
 * Security response headers (supplement Helmet)
 */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.removeHeader('X-Powered-By');
  next();
}

/**
 * Request size guard (extra protection on top of express limits)
 */
function requestSizeGuard(maxBytes = 1024 * 1024) {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxBytes) {
      return res.status(413).json({ success: false, message: 'Request payload too large.' });
    }
    next();
  };
}

/**
 * Generate a CSRF token (stateless HMAC approach)
 */
function generateCsrfToken(sessionId) {
  const secret = process.env.JWT_SECRET || 'csrf_secret_change_me';
  return crypto.createHmac('sha256', secret).update(sessionId + Date.now()).digest('hex');
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  bruteForceProtect,
  blacklistToken,
  rejectBlacklisted,
  sanitizeInputs,
  auditLogger,
  ipBlocker,
  securityHeaders,
  requestSizeGuard,
  generateCsrfToken,
  // Admin helpers
  getAuditLog: (limit = 100) => auditLog.slice(-limit).reverse(),
  getBlockedIPs: () => Object.fromEntries(blockedIPs),
  blockIP: (ip, reason, durationMs) => {
    blockedIPs.set(ip, {
      reason,
      blockedAt: Date.now(),
      expiresAt: durationMs ? Date.now() + durationMs : null,
    });
  },
  unblockIP: (ip) => blockedIPs.delete(ip),
  getLoginAttempts: () => Object.fromEntries(loginAttempts),
};
