import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import jobRoutes from './routes/job.routes.js';
import matchRoutes from './routes/match.routes.js';
import authRoutes from './routes/auth.routes.js';
import integrationRoutes from './routes/integration.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import outcomeRoutes from './routes/outcome.routes.js';
import auditRoutes from './routes/audit.routes.js';
import { seedInitialData } from './config/seed.js';
import { authenticate, resolveTenantContext, requireAdmin } from './middleware/auth.middleware.js';

const app = express();

// Cross-Origin Resource Sharing (CORS) with strict production validation
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://drishti-ai-virid.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Cross-Origin Request Blocked: Origin not authorized by CORS policy.'));
    },
    credentials: true,
  })
);

// Security and Cache-Control headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent intermediate and browser caching of sensitive API responses
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global multi-tenant context resolution (guarantees immutable req.tenant on every route)
app.use(resolveTenantContext);

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/outcomes', outcomeRoutes);
app.use('/api/audit-history', auditRoutes);

// Seed sample data helper (strictly restricted to authorized administrators via POST)
const handleSeedRequest = async (req, res, next) => {
  try {
    const result = await seedInitialData();
    res.status(200).json({
      success: true,
      message: 'Sample candidates, job postings, and RBAC users seeded successfully.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

app.route('/api/seed')
  .get((req, res) => {
    res.status(405).json({
      error: 'Method Not Allowed. Database seed operations cannot be invoked via GET. Use authorized POST /api/seed.',
    });
  })
  .post(authenticate, requireAdmin, handleSeedRequest);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Drishti AI Backend Service',
    description: 'Explainable resume-to-job matching API platform',
    status: 'operational',
    healthCheck: '/api/health',
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Invalid resource identifier format: '${err.value}'`,
    });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message,
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Malformed JSON payload in request body.',
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    console.error('[Server Error]', err);
  } else if (statusCode === 500) {
    console.error('[Production Server Error]', err.message);
  }

  res.status(statusCode).json({
    error: {
      message: isProduction && statusCode === 500 ? 'Internal Server Error' : err.message || 'An unexpected error occurred.',
    },
  });
});

export default app;
