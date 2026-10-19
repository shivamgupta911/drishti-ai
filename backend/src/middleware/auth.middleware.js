import crypto from 'crypto';

/**
 * Retrieves the cryptographic secret key for signing and verifying tokens.
 * Enforces strict environment variable provision in production environments.
 */
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret === 'drishti-ai-secure-secret-key-2026') {
      throw new Error(
        '[FATAL SECURITY ERROR] A dedicated, high-entropy JWT_SECRET environment variable is mandatory in production.'
      );
    }
    return secret;
  }
  return secret || 'drishti-ai-secure-development-secret-key-2026';
}

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
  const secret = getJwtSecret();
  const signature = crypto
    .createHmac('sha256', secret)
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
  const secret = getJwtSecret();
  const expectedSig = crypto
    .createHmac('sha256', secret)
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
 * Resolves tenant scope from Authorization token or falls back to public demo scope.
 * Guarantees every incoming request has an immutable req.tenant context.
 */
export function resolveTenantContext(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.tenant = {
      id: 'demo',
      isDemo: true,
      role: 'demo_viewer',
      isUnauthenticated: true,
    };
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7).trim();
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    if (decoded.isDemo === true) {
      req.tenant = {
        id: 'demo',
        isDemo: true,
        role: decoded.role || 'recruiter',
        isUnauthenticated: false,
      };
    } else {
      req.tenant = {
        id: decoded.id,
        isDemo: false,
        role: decoded.role || 'candidate',
        isUnauthenticated: false,
      };
    }
    next();
  } catch (err) {
    return res.status(401).json({
      error: `Authentication failed: ${err.message}`,
    });
  }
}

/**
 * Returns a MongoDB query filter enforcing strict multi-tenant boundary.
 * - Private users: Only their own records (ownerId: req.tenant.id, quarantined: { $ne: true })
 * - Demo / Public users: Only deliberate synthetic demo records (isDemo: true, quarantined: false)
 * - Quarantined unowned records are NEVER matched by either filter.
 */
export function getTenantFilter(req) {
  if (req.tenant && !req.tenant.isDemo) {
    return {
      ownerId: req.tenant.id,
      quarantined: { $ne: true },
    };
  }
  return {
    isDemo: true,
    quarantined: false,
  };
}

/**
 * Express middleware ensuring the request is executed by an authenticated, registered user
 * in their private workspace. Strictly rejects public demo sessions from mutating data.
 */
export function requirePrivateWorkspace(req, res, next) {
  if (!req.tenant || req.tenant.isDemo) {
    return res.status(403).json({
      error: 'Modifying or creating records in the public demo space is prohibited. Please register or log in for a private workspace.',
    });
  }
  next();
}

/**
 * Express middleware to authenticate requests via Authorization header
 */
export function authenticate(req, res, next) {
  if (req.user && req.tenant && !req.tenant.isUnauthenticated) {
    return next();
  }

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
    if (decoded.isDemo === true) {
      req.tenant = {
        id: 'demo',
        isDemo: true,
        role: decoded.role || 'recruiter',
        isUnauthenticated: false,
      };
    } else {
      req.tenant = {
        id: decoded.id,
        isDemo: false,
        role: decoded.role || 'candidate',
        isUnauthenticated: false,
      };
    }
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
    const userRole = req.user?.role || req.tenant?.role;
    if (!userRole) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(userRole) && userRole !== 'admin') {
      return res.status(403).json({
        error: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
}

/**
 * Express middleware restricting access strictly to verified administrator accounts.
 * Prevents demo sessions from gaining or utilizing admin privileges.
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin' || req.tenant?.isDemo) {
    return res.status(403).json({
      error: 'Access denied. Administrative operations are restricted to verified administrator accounts and are strictly prohibited in demo sessions.',
    });
  }
  next();
}
