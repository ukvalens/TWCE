const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { generateTokens } = require('../utils/helpers');
const { sendEmail, emailTemplates } = require('../utils/email');

const register = async (req, res, next) => {
  try {
    const { full_name, email, password, role_id = 3 } = req.body;
    const phone = req.body.phone?.trim() || null;
    const rid = parseInt(role_id);

    const existing = await query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length)
      return res.status(409).json({ message: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const verification_token = crypto.randomBytes(32).toString('hex');

    const result = await query(
      `INSERT INTO users (full_name, email, phone, password_hash, role_id, email_verification_token, email_verified)
       VALUES ($1,$2,$3,$4,$5,$6, TRUE) RETURNING user_id, full_name, email, role_id`,
      [full_name, email, phone, password_hash, rid, verification_token]
    );

    // Create wishlist and loyalty record for customers
    if (rid === 3) {
      await query('INSERT INTO wishlist (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [result.rows[0].user_id]);
      await query('INSERT INTO loyalty_points (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [result.rows[0].user_id]);
    }

    // Send verification email — non-blocking, won't fail registration if SMTP not configured
    sendEmail({ to: email, ...emailTemplates.verification(verification_token) }).catch(() => {});

    res.status(201).json({ message: 'Registration successful. You can now log in.', user: result.rows[0] });
  } catch (err) { next(err); }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    const result = await query(
      `UPDATE users SET email_verified = TRUE, email_verification_token = NULL
       WHERE email_verification_token = $1 RETURNING user_id`,
      [token]
    );
    if (!result.rows.length)
      return res.status(400).json({ message: 'Invalid or expired token' });
    res.json({ message: 'Email verified successfully' });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await query(
      `SELECT u.user_id, u.full_name, u.email, u.password_hash, u.role_id, u.status, u.email_verified, r.role_name
       FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.email = $1`,
      [email]
    );

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ message: 'Invalid credentials' });

    if (user.status === 'banned') return res.status(403).json({ message: 'Account banned' });

    const { password_hash, ...userData } = user;
    const tokens = generateTokens({ user_id: user.user_id, role_id: user.role_id });

    res.json({ message: 'Login successful', ...tokens, user: userData });
  } catch (err) { next(err); }
};

const refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ message: 'Refresh token required' });
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const tokens = generateTokens({ user_id: decoded.user_id, role_id: decoded.role_id });
    res.json(tokens);
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return res.json({ message: 'If email exists, reset link has been sent' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour
    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3',
      [token, expires, email]
    );
    await sendEmail({ to: email, ...emailTemplates.passwordReset(token) });
    res.json({ message: 'If email exists, reset link has been sent' });
  } catch (err) { next(err); }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const result = await query(
      'SELECT user_id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );
    if (!result.rows.length) return res.status(400).json({ message: 'Invalid or expired token' });

    const password_hash = await bcrypt.hash(password, 12);
    await query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE user_id = $2',
      [password_hash, result.rows[0].user_id]
    );
    res.json({ message: 'Password reset successful' });
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const result = await query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.user_id]);
    if (!(await bcrypt.compare(current_password, result.rows[0].password_hash)))
      return res.status(401).json({ message: 'Current password is incorrect' });

    const password_hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [password_hash, req.user.user_id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
};

module.exports = { register, verifyEmail, login, refreshToken, forgotPassword, resetPassword, changePassword };
