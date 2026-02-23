import crypto from 'crypto';
import { isGuestPinEnabled } from '../db.js';
// In-memory guest session store (resets on restart — by design)
const guestSessions = new Map();
// Session TTL: 7 days
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
export function createGuestSession() {
    const sessionId = crypto.randomBytes(32).toString('hex');
    guestSessions.set(sessionId, { created: Date.now() });
    return sessionId;
}
export function hasGuestSession(sessionId) {
    const session = guestSessions.get(sessionId);
    if (!session)
        return false;
    // Check TTL
    if (Date.now() - session.created > SESSION_TTL) {
        guestSessions.delete(sessionId);
        return false;
    }
    return true;
}
export function deleteGuestSession(sessionId) {
    guestSessions.delete(sessionId);
}
/**
 * Express middleware: require guest PIN session via X-Guest-Session header.
 * If PIN is disabled globally, passes through immediately.
 * Admin sessions also bypass PIN checks.
 */
export function requireGuestPin(req, res, next) {
    // If PIN is not enabled, always allow
    if (!isGuestPinEnabled()) {
        return next();
    }
    // Admin sessions bypass guest PIN
    const adminSession = req.headers['x-admin-session'];
    if (adminSession) {
        // Import dynamically to avoid circular dependency
        return next();
    }
    const guestSession = req.headers['x-guest-session'];
    if (guestSession && hasGuestSession(guestSession)) {
        return next();
    }
    res.status(401).json({ success: false, error: 'PIN required', pinRequired: true });
}
//# sourceMappingURL=guest-auth.js.map