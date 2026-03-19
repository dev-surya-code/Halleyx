const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, getUsers, loginBruteForce } = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { rejectBlacklisted, auditLogger } = require('../middlewares/securityMiddleware');

router.post('/register', auditLogger('USER_REGISTER'), register);
router.post('/login',    loginBruteForce, auditLogger('USER_LOGIN'), login);
router.post('/logout',   protect, rejectBlacklisted, auditLogger('USER_LOGOUT'), logout);
router.get('/me',        protect, rejectBlacklisted, getMe);
router.get('/users',     protect, rejectBlacklisted, authorize('admin'), auditLogger('ADMIN_LIST_USERS'), getUsers);

module.exports = router;
