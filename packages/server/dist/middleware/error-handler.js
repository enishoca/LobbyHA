import logger from '../logger.js';
export function errorHandler(err, _req, res, _next) {
    logger.error(`Unhandled error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
}
//# sourceMappingURL=error-handler.js.map