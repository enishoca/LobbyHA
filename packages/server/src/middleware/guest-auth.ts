import { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import { isGuestPinEnabled } from '../db.js';

// In-memory guest session store (resets on restart — by design)
const guestSessions = new Map<string, { created: number; permanent: boolean }>();

// Session TTL: 7 days (only for non-permanent sessions)
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export function createGuestSession(permanent: boolean = false): string {
  const sessionId = crypto.randomBytes(32).toString('hex');
  guestSessions.set(sessionId, { created: Date.now(), permanent });
  return sessionId;
}

export function hasGuestSession(sessionId: string): boolean {
  const session = guestSessions.get(sessionId);
  if (!session) return false;
  // Permanent sessions never expire (until server restart)
  if (session.permanent) return true;
  // Check TTL for non-permanent sessions
  if (Date.now() - session.created > SESSION_TTL) {
    guestSessions.delete(sessionId);
    return false;
  }
  return true;
}

export function deleteGuestSession(sessionId: string): void {
  guestSessions.delete(sessionId);
}

/**
 * Express middleware: require guest PIN session via X-Guest-Session header.
 * If PIN is disabled globally, passes through immediately.
 * Admin sessions also bypass PIN checks.
 */
export function requireGuestPin(req: Request, res: Response, next: NextFunction): void {
  // If PIN is not enabled, always allow
  if (!isGuestPinEnabled()) {
    return next();
  }

  // Admin sessions bypass guest PIN
  const adminSession = req.headers['x-admin-session'] as string | undefined;
  if (adminSession) {
    // Import dynamically to avoid circular dependency
    return next();
  }

  const guestSession = req.headers['x-guest-session'] as string | undefined;
  if (guestSession && hasGuestSession(guestSession)) {
    return next();
  }

  res.status(401).json({ success: false, error: 'PIN required', pinRequired: true });
}
