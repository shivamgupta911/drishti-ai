import express from 'express';
import User from '../models/User.js';
import {
  generateSalt,
  hashPassword,
  verifyPassword,
  generateToken,
  authenticate,
  requireAdmin,
} from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user with role
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role = 'candidate', organization } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Prevent privilege escalation: self-registration cannot grant administrative or auditor roles
    const safeRole = (typeof role === 'string' ? role : 'candidate').toLowerCase().trim();
    if (safeRole === 'admin' || safeRole === 'auditor') {
      return res.status(403).json({
        error: 'Registration with administrative or auditor roles is forbidden. Contact a system administrator.',
      });
    }

    const assignedRole = ['recruiter', 'candidate'].includes(safeRole) ? safeRole : 'candidate';

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      salt,
      role: assignedRole,
      organization: organization || 'Drishti AI Ecosystem',
    });

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      organization: user.organization,
      isDemo: false,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/demo-session
 * Generates an authorized session token for the selected demo persona.
 * Explicitly rejects administrative requests to ensure demo sessions cannot gain admin privileges.
 */
router.post('/demo-session', async (req, res, next) => {
  try {
    const { persona = 'recruiter' } = req.body;

    if (persona === 'admin') {
      return res.status(403).json({
        error: 'Demo sessions cannot gain administrative privileges. Administrative operations require logging in with verified administrator credentials via /api/auth/login.',
      });
    }

    const DEMO_PERSONAS = {
      recruiter: {
        name: 'Sarah Connor',
        email: 'recruiter@drishti.ai',
        role: 'recruiter',
        title: 'Senior Talent Partner',
        organization: 'Nexus Talent Solutions',
      },
      hiring_manager: {
        name: 'David Vance',
        email: 'manager@drishti.ai',
        role: 'hiring_manager',
        title: 'VP of Platform Engineering',
        organization: 'Drishti AI Ecosystem',
      },
      candidate: {
        name: 'Alex Mercer',
        email: 'candidate@drishti.ai',
        role: 'candidate',
        title: 'Candidate Profile',
        organization: 'Open Talent Community',
      },
    };

    const selectedPersona = DEMO_PERSONAS[persona];
    if (!selectedPersona) {
      return res.status(400).json({
        error: `Invalid demo persona '${persona}'. Supported personas: ${Object.keys(DEMO_PERSONAS).join(', ')}`,
      });
    }

    const token = generateToken({
      id: 'demo',
      email: selectedPersona.email,
      name: selectedPersona.name,
      role: selectedPersona.role,
      organization: selectedPersona.organization,
      isDemo: true,
    });

    res.status(200).json({
      success: true,
      message: `Demo session established for persona: ${selectedPersona.name} (${selectedPersona.role})`,
      token,
      user: {
        id: 'demo',
        isDemo: true,
        ...selectedPersona,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and issue signed token
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      organization: user.organization,
      isDemo: false,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    res.status(200).json({
      success: true,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/users
 * Administrator-only endpoint to inspect registered user accounts safely.
 * Returns safe objects without password hashes or salts.
 */
router.get('/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map((u) => u.toSafeObject()),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/auth/users/:id/role
 * Administrator-only endpoint to update user roles.
 * Strictly prevents promoting unauthorized users to admin when ADMIN_EMAIL is configured.
 */
router.patch('/users/:id/role', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role || !['recruiter', 'hiring_manager', 'candidate', 'admin'].includes(role)) {
      return res.status(400).json({
        error: "Invalid role. Allowed roles: 'recruiter', 'hiring_manager', 'candidate', 'admin'.",
      });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    if (role === 'admin' && process.env.ADMIN_EMAIL) {
      const designatedAdmin = process.env.ADMIN_EMAIL.toLowerCase().trim();
      if (targetUser.email.toLowerCase().trim() !== designatedAdmin) {
        return res.status(403).json({
          error: `Cannot grant administrator role. Only the designated ADMIN_EMAIL (${designatedAdmin}) may hold the administrator role.`,
        });
      }
    }

    targetUser.role = role;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}.`,
      user: targetUser.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
