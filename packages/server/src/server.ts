import http from 'http';
import express from 'express';
import path from 'path';
import fs from 'fs';

import { getDataDir, bootstrapConfig, loadConfig, needsSetup, migrateFileConfigToDb, setCliPort } from './config.js';
import { initDb } from './db.js';
import logger from './logger.js';
import { setupWebSocketProxy } from './ws-proxy.js';
import { errorHandler } from './middleware/error-handler.js';

import authRoutes from './routes/auth.js';
import haProxyRoutes from './routes/ha-proxy.js';
import uiRoutes from './routes/ui.js';
import discoveryRoutes from './routes/discovery.js';
import setupRoutes from './routes/setup.js';
import guestAuthRoutes from './routes/guest-auth.js';
import { requireGuestPin } from './middleware/guest-auth.js';

// ─── CLI Arguments ──────────────────────────────────────────

function parseCliArgs(): { port?: number; dataDir?: string } {
  const args = process.argv.slice(2);
  const result: { port?: number; dataDir?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) {
      const p = Number(args[i + 1]);
      if (!isNaN(p) && p > 0 && p < 65536) result.port = p;
      i++;
    } else if ((args[i] === '--data-dir' || args[i] === '-d') && args[i + 1]) {
      result.dataDir = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
LobbyHA — Guest dashboard for Home Assistant

Usage: lobbyha [options]

Options:
  --port, -p <number>      Port to listen on (default: 3000)
  --data-dir, -d <path>    Data directory for database (default: ./data)
  --help, -h               Show this help message

Environment variables:
  PORT                     Port (overridden by --port)
  HA_URL                   Home Assistant URL
  HA_TOKEN                 Long-lived access token
  LOG_LEVEL                Log level (DEBUG, INFO, WARN, ERROR)
`);
      process.exit(0);
    }
  }
  return result;
}

const cliArgs = parseCliArgs();

// Apply CLI overrides before bootstrap
if (cliArgs.port) setCliPort(cliArgs.port);

const app = express();
const server = http.createServer(app);

// ─── Bootstrap ──────────────────────────────────────────────

const dataDir = getDataDir(cliArgs.dataDir);
// Minimal config from env/defaults so we know PORT before DB is up
let config = bootstrapConfig();

logger.setLevel(config.LOG_LEVEL);
logger.info(`LobbyHA server starting...`);
logger.info(`Data directory: ${dataDir}`);

// ─── Middleware ──────────────────────────────────────────────

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Admin-Session,X-Guest-Session');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static files (built dashboard) ────────────────────────

const webDist = path.resolve(import.meta.dirname, '..', '..', 'dashboard', 'dist');
if (fs.existsSync(webDist)) {
  app.use('/assets', express.static(path.join(webDist, 'assets')));

  // Setup wizard redirect: if HA_TOKEN not configured, redirect all page requests to /setup
  app.use((req, res, next) => {
    // Only intercept HTML page requests, not API/asset calls
    if (req.path.startsWith('/api') || req.path.startsWith('/assets') || req.path.startsWith('/health')) {
      return next();
    }
    if (needsSetup() && req.path !== '/setup' && req.path !== '/setup.html' && !req.path.startsWith('/setup')) {
      return res.redirect('/setup');
    }
    next();
  });

  app.get(['/setup', '/setup/', '/setup.html'], (_req, res) => {
    res.sendFile(path.join(webDist, 'setup.html'));
  });
  app.get(['/', '/guest', '/guest/'], (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
  app.get(['/admin', '/admin/', '/admin.html'], (_req, res) => {
    res.sendFile(path.join(webDist, 'admin.html'));
  });
} else {
  logger.warn(`Dashboard dist not found at ${webDist}. Run "npm run build" in packages/dashboard first.`);
}

// ─── Health check ───────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    needsSetup: needsSetup(),
    uptime: process.uptime(),
  });
});

// ─── API Routes ─────────────────────────────────────────────

app.use('/api/admin', authRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/guest', guestAuthRoutes);
app.use('/api/ui', uiRoutes);
app.use('/api/discovery', discoveryRoutes);

// HA proxy routes go last (catch-all for /api/*) — protected by guest PIN
app.use('/api', requireGuestPin, haProxyRoutes);

// ─── Error handler ──────────────────────────────────────────

app.use(errorHandler);

// ─── Start ──────────────────────────────────────────────────

// Expose server for lazy WS proxy init after setup
export { server };

async function start() {
  await initDb(dataDir);

  // One-time migration from config.yaml / options.json → DB
  if (migrateFileConfigToDb(dataDir)) {
    logger.info('Migrated file-based config to database');
  }

  // Reload config from DB (overrides bootstrap values)
  config = loadConfig();
  logger.setLevel(config.LOG_LEVEL);
  logger.debug(`Config loaded from DB: HA_URL=${config.HA_URL} PORT=${config.PORT}`);

  // Only set up WS proxy if HA is configured
  if (config.HA_TOKEN) {
    setupWebSocketProxy(server);
  } else {
    logger.info('HA_TOKEN not configured — WebSocket proxy disabled until setup is complete');
  }

  server.listen(config.PORT, '0.0.0.0', () => {
    logger.info(`Server listening on port ${config.PORT}`);
    if (!config.HA_TOKEN) {
      logger.info(`Open http://localhost:${config.PORT}/setup to configure`);
    } else {
      logger.info(`Guest dashboard: http://localhost:${config.PORT}/`);
      logger.info(`Admin dashboard: http://localhost:${config.PORT}/admin`);
    }
  });
}

start().catch((err) => {
  logger.critical(`Failed to start: ${err}`);
  process.exit(1);
});
