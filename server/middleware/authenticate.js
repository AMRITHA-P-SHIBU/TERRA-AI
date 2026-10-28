import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'terra_ai_jwt_secret_key_access_token_secure_random_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'terra_ai_jwt_refresh_secret_key_secure_random_2026';

/**
 * Generate Access and Refresh JWT Tokens
 */
export function generateTokens(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    account_type: user.account_type,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

/**
 * Set secure HttpOnly cookies on response
 */
export function setAuthCookies(res, accessToken, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}

/**
 * Clear auth cookies on logout
 */
export function clearAuthCookies(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
}

/**
 * Authentication Middleware
 * Validates JWT from HttpOnly cookie or Authorization Bearer header.
 */
export async function authenticate(req, res, next) {
  try {
    let token = null;

    // 1. Try to read from cookie
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    // 2. Fallback to Authorization Header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // Check for refresh token in cookies
      if (req.cookies && req.cookies.refreshToken) {
        try {
          const refreshDecoded = jwt.verify(req.cookies.refreshToken, JWT_REFRESH_SECRET);
          const userResult = await query(
            'SELECT id, full_name, email, account_type, status, email_verified, created_at FROM users WHERE id = $1',
            [refreshDecoded.userId]
          );

          if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Session expired, user not found' });
          }

          const user = userResult.rows[0];
          if (user.status === 'SUSPENDED') {
            return res.status(403).json({ error: 'Account has been suspended. Please contact support.' });
          }

          // Issue new access token
          const tokens = generateTokens(user);
          setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
          req.user = user;
          return next();
        } catch (refreshErr) {
          return res.status(401).json({ error: 'Authentication required. Please log in.' });
        }
      }

      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    // Verify access token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError' && req.cookies?.refreshToken) {
        // Refresh token fallback
        try {
          const refreshDecoded = jwt.verify(req.cookies.refreshToken, JWT_REFRESH_SECRET);
          const userResult = await query(
            'SELECT id, full_name, email, account_type, status, email_verified, created_at FROM users WHERE id = $1',
            [refreshDecoded.userId]
          );

          if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Session expired' });
          }

          const user = userResult.rows[0];
          if (user.status === 'SUSPENDED') {
            return res.status(403).json({ error: 'Account suspended' });
          }

          const tokens = generateTokens(user);
          setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
          req.user = user;
          return next();
        } catch {
          return res.status(401).json({ error: 'Session expired, please login again' });
        }
      }
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }

    // Fetch user from DB
    const userResult = await query(
      'SELECT id, full_name, email, account_type, status, email_verified, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User associated with this token no longer exists' });
    }

    const user = userResult.rows[0];

    // Check account status
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Authenticate Middleware Error]:', error);
    return res.status(500).json({ error: 'Authentication verification failure' });
  }
}

export default authenticate;
