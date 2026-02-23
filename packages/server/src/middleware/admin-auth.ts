import { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';

// In-memory session store (resets on restart — by design)
const adminSessions = new Map<string, { created: number }>();

export function createSession(): string {
  const sessionId = crypto.randomBytes(32).toString('hex');
  adminSessions.set(sessionId, { created: Date.now() });
  return sessionId;
}

export function hasSession(sessionId: string): boolean {
  return adminSessions.has(sessionId);
}

export function deleteSession(sessionId: string): void {
  adminSessions.delete(sessionId);
}

/** Express middleware: require admin session via X-Admin-Session header */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const sessionId = req.headers['x-admin-session'] as string | undefined;
  if (!sessionId || !adminSessions.has(sessionId)) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  next();
}
