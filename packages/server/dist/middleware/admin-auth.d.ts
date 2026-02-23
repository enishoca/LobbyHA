import { type Request, type Response, type NextFunction } from 'express';
export declare function createSession(): string;
export declare function hasSession(sessionId: string): boolean;
export declare function deleteSession(sessionId: string): void;
/** Express middleware: require admin session via X-Admin-Session header */
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=admin-auth.d.ts.map