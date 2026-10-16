import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import jobRoutes from './routes/job.routes.js';
import matchRoutes from './routes/match.routes.js';
import authRoutes from './routes/auth.routes.js';
import integrationRoutes from './routes/integration.routes.js';
import { seedInitialData } from './config/seed.js';

const app = express();

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/integrations', integrationRoutes);

// Seed sample data helper
app.post('/api/seed', async (req, res, next) => {
  try {
    const result = await seedInitialData();
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

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
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
    },
  });
});

export default app;
