const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { bruteForceProtect, blacklistToken, auditLogger } = require('../middlewares/securityMiddleware');

const generateToken = (id) => {
  const jti = require('crypto').randomUUID();
  return jwt.sign(
    { id, jti },
    process.env.JWT_SECRET || 'secret_fallback_CHANGE_THIS',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc  Register user
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    const pwStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!pwStrong.test(password)) {
      return res.status(400).json({ success: false, message: 'Password must contain uppercase, lowercase and a number' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email: email.toLowerCase(), password, role: role || 'user' });
    const token = generateToken(user._id);
    res.status(201).json({ success: true, message: 'Registration successful', token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
};

// @desc  Login user  (brute-force protection hooks used here)
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      if (req.recordLoginFailure) req.recordLoginFailure();
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.is_active) return res.status(401).json({ success: false, message: 'Account is deactivated' });

    if (req.clearLoginFailures) req.clearLoginFailures();

    user.last_login = new Date();
    await user.save();

    const token = generateToken(user._id);
    res.json({
      success: true, message: 'Login successful', token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, last_login: user.last_login }
    });
  } catch (err) { next(err); }
};

// @desc  Logout (blacklist current token)
const logout = (req, res) => {
  const jti = req.user?.jti;
  if (jti) blacklistToken(jti);
  res.json({ success: true, message: 'Logged out successfully' });
};

// @desc  Get current user
const getMe = (req, res) => {
  res.json({ success: true, user: req.user });
};

// @desc  Get all users (admin only)
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password').sort({ created_at: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) { next(err); }
};

// Export brute-force middleware for route wiring
const loginBruteForce = bruteForceProtect(req => req.body?.email || req.ip);

module.exports = { register, login, logout, getMe, getUsers, loginBruteForce };
