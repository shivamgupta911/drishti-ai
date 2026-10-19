import 'dotenv/config';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { migrateExistingData } from './config/migration.js';

const PORT = process.env.PORT || 5000;

// Initialize database connection and run safe tenancy migration
await connectDB();
await migrateExistingData();

// Start Express server
const server = app.listen(PORT, () => {
  console.log(`[Drishti AI] Backend service running on http://localhost:${PORT}`);
  console.log(`[Drishti AI] Health check available at http://localhost:${PORT}/api/health`);
});

// Graceful shutdown handling
async function handleShutdown(signal) {
  console.log(`\n[Drishti AI] Received ${signal}. Closing HTTP server...`);
  server.close(async () => {
    await disconnectDB();
    console.log('[Drishti AI] HTTP server and database closed cleanly.');
    process.exit(0);
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
