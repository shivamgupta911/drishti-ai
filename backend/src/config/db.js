import mongoose from 'mongoose';

let memoryServer = null;
let dbType = 'none'; // 'external' | 'in-memory (local-development-only)' | 'none'

/**
 * Maps Mongoose connection ready states to readable status strings
 */
const CONNECTION_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/**
 * Returns current database connection status without exposing sensitive credentials.
 * Accurately distinguishes between persistent external clusters and ephemeral in-memory instances.
 */
export function getDbStatus() {
  const stateCode = mongoose.connection.readyState;
  const isConnected = stateCode === 1;
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    status: CONNECTION_STATES[stateCode] || 'unknown',
    connected: isConnected,
    type: isConnected ? dbType : 'none',
    isInMemory: isConnected && dbType.startsWith('in-memory'),
    isProduction,
    host: !isProduction && isConnected ? mongoose.connection.host : null,
    name: !isProduction && isConnected ? mongoose.connection.name : null,
  };
}

/**
 * Initializes a local in-memory MongoDB instance STRICTLY FOR LOCAL DEVELOPMENT.
 * This is permanently blocked in production environments to prevent silent ephemeral storage.
 */
async function startLocalMemoryDB() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    throw new Error(
      '[FATAL] Attempted to start in-memory MongoDB in production environment. In-memory databases are strictly forbidden in production.'
    );
  }

  try {
    console.warn(
      '[Database Notice] Starting local in-memory MongoDB instance for local development only (ephemeral storage)...'
    );
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri();
    const conn = await mongoose.connect(uri, { dbName: 'drishti_ai' });
    dbType = 'in-memory (local-development-only)';
    console.log(
      `[Database] Connected to local in-memory MongoDB (${conn.connection.host}/${conn.connection.name}). Data will reset on server restart.`
    );
    return conn;
  } catch (err) {
    console.error(`[Database Error] Could not start local memory database: ${err.message}`);
    return null;
  }
}

/**
 * Connects to MongoDB using MONGODB_URI from environment variables.
 * In production: Requires a valid MONGODB_URI and fails clearly if connection cannot be established.
 * In development: Falls back to an in-memory instance if cloud credentials fail, logging clear notices.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  const isProduction = process.env.NODE_ENV === 'production';

  // Production environment safeguards
  if (isProduction) {
    if (!uri || uri.trim() === '' || uri === 'memory') {
      console.error(
        '[Production Fatal Error] MONGODB_URI is required when NODE_ENV=production. In-memory database is prohibited.'
      );
      return null;
    }

    try {
      console.log('[Database] Connecting to production MongoDB cluster...');
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      dbType = 'external';
      console.log(`[Database] Production MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (error) {
      console.error(
        `[Production Fatal Error] Failed to connect to production MongoDB cluster: ${error.message}`
      );
      // In production: Do NOT fall back to in-memory database. Fail cleanly.
      dbType = 'none';
      return null;
    }
  }

  // Local development environment
  if (uri && uri.trim() !== '' && uri !== 'memory') {
    try {
      console.log('[Database] Connecting to configured MongoDB instance...');
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      dbType = 'external';
      console.log(`[Database] External MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (error) {
      console.error(`[Database Warning] Remote MongoDB connection failed: ${error.message}`);
      console.warn(
        '[Database Fallback] Falling back to local in-memory MongoDB instance for local development only.'
      );
      return await startLocalMemoryDB();
    }
  }

  // Explicit 'memory' or unset URI in development
  return await startLocalMemoryDB();
}

/**
 * Gracefully disconnects Mongoose and tears down in-memory server if active
 */
export async function disconnectDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    dbType = 'none';
  } catch (err) {
    console.error('[Database Error] Disconnection error:', err.message);
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB connection disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] MongoDB reconnected.');
});
