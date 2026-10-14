import { Router } from 'express';
import { getDbStatus } from '../config/db.js';

const router = Router();
const startTime = Date.now();

/**
 * GET /api/health
 * Health check endpoint reporting service, runtime, and database status
 */
router.get('/health', (req, res) => {
  const dbStatus = getDbStatus();

  res.status(200).json({
    status: 'ok',
    service: 'drishti-ai-backend',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    database: {
      status: dbStatus.status,
      connected: dbStatus.connected,
      type: dbStatus.type,
      isInMemory: dbStatus.isInMemory,
      ...(dbStatus.isInMemory
        ? { note: 'Ephemeral in-memory database active for local development. Data resets on restart.' }
        : {}),
    },
  });
});

export default router;
