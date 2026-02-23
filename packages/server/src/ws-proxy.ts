import type { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { getConfig } from './config.js';
import logger from './logger.js';

export function setupWebSocketProxy(server: Server): void {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (clientWs) => {
    const config = getConfig();
    const haWsUrl = config.HA_URL.replace(/^http/, 'ws') + '/api/websocket';
    logger.debug('WS: client connected');

    const haWs = new WebSocket(haWsUrl);

    haWs.on('open', () => {
      logger.debug('WS: haWs open, sending auth');
      haWs.send(JSON.stringify({ type: 'auth', access_token: config.HA_TOKEN }));
    });

    haWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        logger.debug('WS: haWs -> client: ' + (msg.type ?? 'message'));

        // Filter state_changed events by ALLOWED_ENTITIES
        if (msg.type === 'event' && msg.event?.event_type === 'state_changed') {
          const entityId = msg.event.data?.entity_id;
          if (config.ALLOWED_ENTITIES.length > 0 && !config.ALLOWED_ENTITIES.includes(entityId)) {
            return;
          }
        }

        clientWs.send(data.toString());
      } catch {
        logger.debug('WS: error parsing haWs message, forwarding raw');
        clientWs.send(data.toString());
      }
    });

    haWs.on('close', (code, reason) => {
      logger.debug(`WS: haWs closed ${code} ${reason?.toString() ?? ''}`);
      clientWs.close();
    });

    haWs.on('error', (err) => {
      logger.debug(`WS: haWs error ${err?.message ?? ''}`);
      clientWs.close();
    });

    clientWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        logger.debug('WS: client -> haWs: ' + (msg.type ?? 'message'));

        // Swallow client auth messages — proxy handles auth
        if (msg.type === 'auth') return;

        haWs.send(data.toString());
      } catch {
        logger.debug('WS: error parsing client message, forwarding raw');
        haWs.send(data.toString());
      }
    });

    clientWs.on('close', (code, reason) => {
      logger.debug(`WS: client closed ${code} ${reason?.toString() ?? ''}`);
      haWs.close();
    });
  });

  logger.info('WebSocket proxy initialized');
}
