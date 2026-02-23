import crypto from 'crypto';
// In-memory session store (resets on restart — by design)
const adminSessions = new Map();
export function createSession() {
    const sessionId = crypto.randomBytes(32).toString('hex');
    adminSessions.set(sessionId, { created: Date.now() });
    return sessionId;
}
export function hasSession(sessionId) {
    return adminSessions.has(sessionId);
}
export function deleteSession(sessionId) {
    adminSessions.delete(sessionId);
}
/** Express middleware: require admin session via X-Admin-Session header */
export function requireAdmin(req, res, next) {
    const sessionId = req.headers['x-admin-session'];
    if (!sessionId || !adminSessions.has(sessionId)) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
    }
    next();
}
//# sourceMappingURL=admin-auth.js.map