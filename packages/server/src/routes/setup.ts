import { Router, type Request, type Response } from 'express';
import { needsSetup, getConfig, saveConfig, loadConfig, type AppConfig } from '../config.js';
import { getAdminPassword, setAdminPassword, setGuestPinEnabled, saveGuestPins } from '../db.js';
import { setupWebSocketProxy } from '../ws-proxy.js';
import { server } from '../server.js';
import logger from '../logger.js';

const router = Router();

// Check if first-run setup is needed, and return existing config for pre-fill
router.get('/status', (_req: Request, res: Response) => {
  const config = getConfig();
  res.json({
    needsSetup: needsSetup(),
    config: {
      HA_URL: config.HA_URL,
      HA_TOKEN: config.HA_TOKEN ? '(set)' : '',
      PORT: String(config.PORT),
      LOG_LEVEL: config.LOG_LEVEL,
    },
  });
});

// Perform setup: validate HA connection, save config, set admin password
router.post('/configure', async (req: Request, res: Response) => {
  const { haUrl, haToken, adminPassword } = req.body ?? {};

  if (!haUrl || !haToken) {
    res.status(400).json({ success: false, error: 'HA URL and token are required' });
    return;
  }

  // Test connection to HA
  try {
    logger.info(`Setup: testing connection to ${haUrl}`);
    const response = await fetch(`${haUrl}/api/`, {
      headers: { Authorization: `Bearer ${haToken}` },
    });
    if (!response.ok) {
      res.status(400).json({
        success: false,
        error: `Home Assistant returned ${response.status}. Check URL and token.`,
      });
      return;
    }
    const data = await response.json() as { message?: string };
    logger.info(`Setup: HA connection successful — ${data.message ?? 'OK'}`);
  } catch (err) {
    logger.error(`Setup: connection failed: ${err}`);
    res.status(400).json({
      success: false,
      error: `Cannot connect to ${haUrl}. Check the URL and ensure HA is running.`,
    });
    return;
  }

  // Save config to DB, preserving existing values for PORT/LOG_LEVEL
  const existing = getConfig();
  const config: AppConfig = {
    HA_URL: haUrl,
    HA_TOKEN: haToken,
    PORT: existing.PORT || 3000,
    LOG_LEVEL: existing.LOG_LEVEL || 'INFO',
    ALLOWED_ENTITIES: existing.ALLOWED_ENTITIES || [],
  };
  saveConfig(config);
  // Reload so the rest of the app picks it up
  loadConfig();

  // Set admin password if provided
  if (adminPassword && adminPassword.length >= 4) {
    setAdminPassword(adminPassword);
  }

  // Save guest PIN settings if provided (during initial setup, no admin session exists yet)
  const { pinEnabled, pins } = req.body ?? {};
  if (typeof pinEnabled === 'boolean') {
    setGuestPinEnabled(pinEnabled);
  }
  if (Array.isArray(pins)) {
    const validPins = pins.map((p: unknown) => String(p).trim()).filter((p: string) => p.length > 0);
    saveGuestPins(validPins);
    logger.info(`Setup: saved ${validPins.length} guest PIN(s), enabled=${pinEnabled}`);
  }

  // Initialize WebSocket proxy if this is the first configuration
  try {
    setupWebSocketProxy(server);
    logger.info('Setup: WebSocket proxy initialized after configuration');
  } catch {
    // Already initialized — that's fine
  }

  res.json({ success: true, message: 'Setup complete! Redirecting...' });
});

// Test HA connection (used during setup wizard and settings panel)
router.post('/test-connection', async (req: Request, res: Response) => {
  const { haUrl, haToken } = req.body ?? {};
  // Use provided values, or fall back to current config for token
  const currentConfig = getConfig();
  const testUrl = haUrl || currentConfig.HA_URL;
  const testToken = haToken || currentConfig.HA_TOKEN;
  if (!testUrl || !testToken) {
    res.status(400).json({ success: false, error: 'URL and token required' });
    return;
  }
  try {
    const response = await fetch(`${testUrl}/api/`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    if (!response.ok) {
      res.json({ success: false, error: `HA returned ${response.status}` });
      return;
    }
    const data = await response.json() as { message?: string };
    res.json({ success: true, message: data.message ?? 'Connected!' });
  } catch (err) {
    res.json({ success: false, error: `Connection failed: ${(err as Error).message}` });
  }
});

export default router;
