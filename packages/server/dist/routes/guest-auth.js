import { Router } from 'express';
import { isGuestPinEnabled, readGuestPins, saveGuestPins, verifyGuestPin, setGuestPinEnabled } from '../db.js';
import { createGuestSession, hasGuestSession } from '../middleware/guest-auth.js';
import { requireAdmin } from '../middleware/admin-auth.js';
import logger from '../logger.js';
const router = Router();
// ─── Public endpoints ───────────────────────────────────────
/** Check if PIN is required and if guest has a valid session */
router.get('/status', (req, res) => {
    const pinEnabled = isGuestPinEnabled();
    const guestSession = req.headers['x-guest-session'];
    const hasValidSession = guestSession ? hasGuestSession(guestSession) : false;
    res.json({
        pinEnabled,
        authenticated: !pinEnabled || hasValidSession,
    });
});
/** Verify a PIN and create a guest session */
router.post('/verify-pin', (req, res) => {
    const { pin } = req.body ?? {};
    if (!isGuestPinEnabled()) {
        // PIN not required — create session anyway for consistency
        const sessionId = createGuestSession();
        res.json({ success: true, guestSessionId: sessionId });
        return;
    }
    if (!pin || typeof pin !== 'string') {
        res.status(400).json({ success: false, error: 'PIN is required' });
        return;
    }
    if (verifyGuestPin(pin)) {
        const sessionId = createGuestSession();
        logger.info('Guest PIN verified successfully');
        res.json({ success: true, guestSessionId: sessionId });
    }
    else {
        logger.warn('Guest PIN verification failed');
        res.status(401).json({ success: false, error: 'Invalid PIN' });
    }
});
/** Check if a guest session is still valid */
router.get('/session', (req, res) => {
    const guestSession = req.headers['x-guest-session'];
    if (guestSession && hasGuestSession(guestSession)) {
        res.json({ valid: true });
    }
    else {
        res.json({ valid: false });
    }
});
// ─── Admin endpoints ────────────────────────────────────────
/** Get PIN settings (admin only) */
router.get('/settings', requireAdmin, (_req, res) => {
    res.json({
        pinEnabled: isGuestPinEnabled(),
        pins: readGuestPins(),
    });
});
/** Update PIN settings (admin only) */
router.post('/settings', requireAdmin, (req, res) => {
    const { pinEnabled, pins } = req.body ?? {};
    if (typeof pinEnabled === 'boolean') {
        setGuestPinEnabled(pinEnabled);
    }
    if (Array.isArray(pins)) {
        // Validate: all pins must be non-empty strings
        const validPins = pins
            .map((p) => String(p).trim())
            .filter((p) => p.length > 0);
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
//# sourceMappingURL=guest-auth.js.map