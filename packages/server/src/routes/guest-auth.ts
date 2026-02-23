import { Router, type Request, type Response } from 'express';
import { isGuestPinEnabled, readGuestPins, saveGuestPins, verifyGuestPin, setGuestPinEnabled, type GuestPin } from '../db.js';
import { createGuestSession, hasGuestSession } from '../middleware/guest-auth.js';
import { requireAdmin } from '../middleware/admin-auth.js';
import logger from '../logger.js';

const router = Router();

// ─── Public endpoints ───────────────────────────────────────

/** Check if PIN is required and if guest has a valid session */
router.get('/status', (req: Request, res: Response) => {
  const pinEnabled = isGuestPinEnabled();
  const guestSession = req.headers['x-guest-session'] as string | undefined;
  const hasValidSession = guestSession ? hasGuestSession(guestSession) : false;

  res.json({
    pinEnabled,
    authenticated: !pinEnabled || hasValidSession,
  });
});

/** Verify a PIN and create a guest session */
router.post('/verify-pin', (req: Request, res: Response) => {
  const { pin } = req.body ?? {};

  if (!isGuestPinEnabled()) {
    // PIN not required — create session anyway for consistency
    const sessionId = createGuestSession(false);
    res.json({ success: true, guestSessionId: sessionId });
    return;
  }

  if (!pin || typeof pin !== 'string') {
    res.status(400).json({ success: false, error: 'PIN is required' });
    return;
  }

  const matched = verifyGuestPin(pin);
  if (matched) {
    const sessionId = createGuestSession(matched.permanent);
    logger.info(`Guest PIN verified successfully (permanent=${matched.permanent})`);
    res.json({ success: true, guestSessionId: sessionId });
  } else {
    logger.warn('Guest PIN verification failed');
    res.status(401).json({ success: false, error: 'Invalid PIN' });
  }
});

/** Check if a guest session is still valid */
router.get('/session', (req: Request, res: Response) => {
  const guestSession = req.headers['x-guest-session'] as string | undefined;
  if (guestSession && hasGuestSession(guestSession)) {
    res.json({ valid: true });
  } else {
    res.json({ valid: false });
  }
});

// ─── Admin endpoints ────────────────────────────────────────

/** Get PIN settings (admin only) */
router.get('/settings', requireAdmin, (_req: Request, res: Response) => {
  res.json({
    pinEnabled: isGuestPinEnabled(),
    pins: readGuestPins(),
  });
});

/** Update PIN settings (admin only) */
router.post('/settings', requireAdmin, (req: Request, res: Response) => {
  const { pinEnabled, pins } = req.body ?? {};

  if (typeof pinEnabled === 'boolean') {
    setGuestPinEnabled(pinEnabled);
  }

  if (Array.isArray(pins)) {
    // Support both legacy plain strings and new {pin, permanent} objects
    const validPins: GuestPin[] = pins
      .map((p: unknown): GuestPin | null => {
        if (typeof p === 'string') {
          const trimmed = p.trim();
          return trimmed.length > 0 ? { pin: trimmed, permanent: false } : null;
        }
        if (p && typeof p === 'object' && 'pin' in p) {
          const obj = p as { pin: string; permanent?: boolean };
          const trimmed = String(obj.pin).trim();
          return trimmed.length > 0 ? { pin: trimmed, permanent: obj.permanent === true } : null;
        }
        return null;
      })
      .filter((p): p is GuestPin => p !== null);
    saveGuestPins(validPins);
  }

  logger.info(`Guest PIN settings updated: enabled=${isGuestPinEnabled()}, pin count=${readGuestPins().length}`);

  res.json({
    success: true,
    pinEnabled: isGuestPinEnabled(),
    pins: readGuestPins(),
  });
});

export default router;
