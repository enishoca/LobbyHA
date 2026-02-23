import { type Request, type Response, type NextFunction } from 'express';
export declare function createGuestSession(): string;
export declare function hasGuestSession(sessionId: string): boolean;
export declare function deleteGuestSession(sessionId: string): void;
/**
 * Express middleware: require guest PIN session via X-Guest-Session header.
 * If PIN is disabled globally, passes through immediately.
 * Admin sessions also bypass PIN checks.
 */
export declare function requireGuestPin(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=guest-auth.d.ts.map