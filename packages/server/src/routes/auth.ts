import { Router, type Request, type Response } from 'express';
import { spawn } from 'child_process';
import {
  getAdminPassword, verifyPassword, setAdminPassword,
} from '../db.js';
import { getConfig, updateConfig, cliPortOverride } from '../config.js';
import { createSession, deleteSession, requireAdmin, hasSession } from '../middleware/admin-auth.js';
import logger from '../logger.js';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { password } = req.body ?? {};
  try {
    const { hash, salt, isDefault } = getAdminPassword();
    if (verifyPassword(password, hash, salt)) {
      const sessionId = createSession();
      const config = getConfig();
      const protocol = req.protocol;
      const host = req.get('host');
      const proxyUrl = `${protocol}://${host}`;
      res.json({
        success: true,
        sessionId,
        hassUrl: proxyUrl,
        hassToken: config.HA_TOKEN,
        isDefaultPassword: isDefault,
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid password' });
    }
  } catch (err) {
    logger.error(`Login error: ${err}`);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Check session & return HA connection info
router.get('/session', (req: Request, res: Response) => {
  const sessionId = req.headers['x-admin-session'] as string | undefined;
  if (sessionId && hasSession(sessionId)) {
    const config = getConfig();
    const { isDefault } = getAdminPassword();
    const protocol = req.protocol;
    const host = req.get('host');
    const proxyUrl = `${protocol}://${host}`;
    res.json({
      valid: true,
      authenticated: true,
      hassUrl: proxyUrl,
      hassToken: config.HA_TOKEN,
      isDefaultPassword: isDefault,
    });
  } else {
    res.json({ valid: false, authenticated: false });
  }
});

// Change password
router.post('/change-password', requireAdmin, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }
  try {
    const { hash, salt } = getAdminPassword();
    if (!verifyPassword(currentPassword, hash, salt)) {
      res.status(401).json({ success: false, error: 'Current password is incorrect' });
      return;
    }
    if (newPassword.length < 4) {
      res.status(400).json({ success: false, error: 'Password must be at least 4 characters' });
      return;
    }
    setAdminPassword(newPassword);
    res.json({ success: true });
  } catch (err) {
    logger.error(`Password change error: ${err}`);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  const sessionId = req.headers['x-admin-session'] as string | undefined;
  if (sessionId) deleteSession(sessionId);
  res.json({ success: true });
});

// Get server config
router.get('/config', requireAdmin, (_req: Request, res: Response) => {
  const config = getConfig();
  const missing: string[] = [];
  if (!config.HA_URL || config.HA_URL === 'http://localhost:8123') missing.push('HA_URL');
  if (!config.HA_TOKEN) missing.push('HA_TOKEN');

  // Port is locked when set externally (env var or CLI) — UI should show a note
  const portLocked = !!(process.env.PORT || cliPortOverride);

  res.json({
    success: true,
    config: {
      HA_URL: config.HA_URL,
      HA_TOKEN: config.HA_TOKEN ? '••••••••' : '',
      PORT: String(config.PORT),
      LOG_LEVEL: config.LOG_LEVEL,
      ALLOWED_ENTITIES: config.ALLOWED_ENTITIES.join(', '),
    },
    portLocked,
    portLockedBy: process.env.PORT ? 'environment variable PORT' : cliPortOverride ? 'CLI --port flag' : null,
    missing,
  });
});

// Update server config
router.post('/config', requireAdmin, (req: Request, res: Response) => {
  const { haUrl, haToken, port, logLevel, allowedEntities } = req.body ?? {};
  try {
    const updates: Record<string, unknown> = {};
    if (haUrl !== undefined) updates.HA_URL = haUrl;
    if (haToken && haToken !== '••••••••') updates.HA_TOKEN = haToken;
    if (port !== undefined) updates.PORT = Number(port);
    if (logLevel !== undefined) updates.LOG_LEVEL = String(logLevel).toUpperCase();
    if (allowedEntities !== undefined) {
      updates.ALLOWED_ENTITIES = typeof allowedEntities === 'string'
        ? allowedEntities.split(',').map((e: string) => e.trim()).filter(Boolean)
        : allowedEntities;
    }

    updateConfig(updates as Partial<import('../config.js').AppConfig>);
    if (logLevel) logger.setLevel(logLevel);
    res.json({ success: true, message: 'Configuration saved.' });
  } catch (err) {
    logger.error(`Config save error: ${err}`);
    res.status(500).json({ success: false, error: 'Failed to save configuration' });
  }
});

/**
 * Detect if a supervisor (systemd, Docker, pm2) is managing this process.
 * In those cases a plain process.exit() is enough — the supervisor restarts us.
 * When running standalone (direct `node` / `npm start`) we self-spawn first so
 * the server comes back up without a process manager.
 */
function hasSupervisor(): boolean {
  // systemd sets INVOCATION_ID and/or NOTIFY_SOCKET
  if (process.env.INVOCATION_ID || process.env.NOTIFY_SOCKET) return true;
  // Docker sets a /.dockerenv file (present inside every Docker container)
  try {
    const { existsSync } = require('fs') as typeof import('fs');
    if (existsSync('/.dockerenv')) return true;
  } catch { /* ignore */ }
  // pm2 sets PM2_HOME or pm_id
  if (process.env.PM2_HOME || process.env.pm_id) return true;
  return false;
}

// Restart server
router.post('/restart', requireAdmin, (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Server restarting...' });
  setTimeout(() => {
    logger.info('Restarting server due to admin request...');
    if (hasSupervisor()) {
      // Supervised (systemd / Docker / pm2) — just exit; supervisor brings us back
      logger.info('Supervised environment detected — exiting for supervisor restart');
      process.exit(0);
    } else {
      // Standalone — spawn a detached replacement before exiting
      logger.info('Standalone environment — self-spawning replacement process');
      const child = spawn(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
        detached: true,
        stdio: 'inherit',
        env: process.env,
        cwd: process.cwd(),
      });
      child.unref();
      setTimeout(() => process.exit(0), 300);
    }
  }, 500);
});

export default router;
