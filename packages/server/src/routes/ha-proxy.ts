import { Router, type Request, type Response } from 'express';
import { getConfig } from '../config.js';
import logger from '../logger.js';

const router = Router();

async function fetchHa(path: string, options: RequestInit = {}): Promise<{ status: number; text: string }> {
  const config = getConfig();
  const response = await fetch(`${config.HA_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.HA_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  const text = await response.text();
  return { status: response.status, text };
}

// Return proxy URL and token for guest connections (public endpoint)
router.get('/config', (req: Request, res: Response) => {
  const config = getConfig();
  const protocol = req.protocol;
  const host = req.get('host');
  const proxyUrl = `${protocol}://${host}`;
  res.json({
    haUrl: proxyUrl,
    hassUrl: proxyUrl,
    hassToken: config.HA_TOKEN,
    configured: !!config.HA_TOKEN,
  });
});

// Get all states (with entity filtering)
router.get('/states', async (_req: Request, res: Response) => {
  try {
    const config = getConfig();
    const { status, text } = await fetchHa('/api/states');
    const data = JSON.parse(text);
    const filtered = config.ALLOWED_ENTITIES.length
      ? data.filter((e: { entity_id: string }) => config.ALLOWED_ENTITIES.includes(e.entity_id))
      : data;
    res.status(status).json(filtered);
  } catch (err) {
    logger.error(`Failed to fetch states: ${err}`);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

// Get single entity state
router.get('/states/:entityId', async (req: Request, res: Response) => {
  try {
    const config = getConfig();
    const { status, text } = await fetchHa(`/api/states/${req.params.entityId}`);
    const data = JSON.parse(text);
    if (config.ALLOWED_ENTITIES.length && !config.ALLOWED_ENTITIES.includes(data.entity_id)) {
      res.status(404).json({ error: 'Entity not found' });
      return;
    }
    res.status(status).json(data);
  } catch (err) {
    logger.error(`Failed to fetch entity: ${err}`);
    res.status(500).json({ error: 'Failed to fetch entity' });
  }
});

// Call HA service
router.post('/services/:domain/:service', async (req: Request, res: Response) => {
  try {
    const { status, text } = await fetchHa(
      `/api/services/${req.params.domain}/${req.params.service}`,
      { method: 'POST', body: JSON.stringify(req.body ?? {}) },
    );
    res.status(status).send(text);
  } catch (err) {
    logger.error(`Failed to call service: ${err}`);
    res.status(500).json({ error: 'Failed to call service' });
  }
});

// Catch-all HA API proxy
router.get('/*', async (req: Request, res: Response) => {
  try {
    const path = req.path + (req.url.includes('?') ? `?${req.url.split('?')[1]}` : '');
    const { status, text } = await fetchHa(`/api${path}`);
    res.status(status).send(text);
  } catch (err) {
    logger.error(`Failed to proxy API: ${err}`);
    res.status(500).json({ error: 'Failed to proxy API' });
  }
});

export default router;
export { fetchHa };
