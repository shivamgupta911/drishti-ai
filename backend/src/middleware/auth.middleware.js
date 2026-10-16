import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'drishti-ai-secure-secret-key-2026';
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generates a random cryptographic salt
 */
export function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hashes a plaintext password with PBKDF2 using SHA-512
 */
export function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

/**
 * Validates password against salt and stored hash
 */
export function verifyPassword(password, salt, storedHash) {
  const hash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

/**
 * Creates a signed base64url token with expiration
 */
export function generateToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Date.now() + TOKEN_EXPIRY_MS;
  const enrichedPayload = { ...payload, exp, iat: Date.now() };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(enrichedPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a signed token
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is missing or malformed.');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token structure.');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  if (signature !== expectedSig) {
    throw new Error('Invalid token signature.');
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  if (payload.exp && Date.now() > payload.exp) {
    throw new Error('Token has expired.');
  }

  return payload;
}

/**
 * Express middleware to authenticate requests via Authorization header
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  const token = authHeader.substring(7).trim();
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: `Authentication failed: ${err.message}`,
    });
  }
}

/**
 * Express middleware for Role-Based Access Control (RBAC)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        error: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
}
