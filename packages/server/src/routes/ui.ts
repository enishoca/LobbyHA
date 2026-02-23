import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../middleware/admin-auth.js';
import { requireGuestPin } from '../middleware/guest-auth.js';
import {
  readHiddenEntities, setHiddenEntities, setEntityHidden,
  readLayout, saveLayout,
  readGuestEntities, readGuestTitle, saveGuestEntities, saveGuestTitle,
  readModules, createModule, updateModule, deleteModule, setModuleEntities, reorderModules,
  readAllEntityDisplayProps, readEntityDisplayProps, saveEntityDisplayProps, deleteEntityDisplayProps,
  type Module,
} from '../db.js';

const router = Router();

// ─── Hidden entities ────────────────────────────────────────

router.get('/hidden', async (_req: Request, res: Response) => {
  res.json({ hidden: readHiddenEntities() });
});

router.post('/hidden', requireAdmin, (req: Request, res: Response) => {
  const hidden = Array.isArray(req.body?.hidden) ? req.body.hidden : [];
  setHiddenEntities(hidden);
  res.json({ hidden });
});

router.post('/hidden/:entityId', requireAdmin, (req: Request, res: Response) => {
  const entityId = req.params.entityId;
  const hidden = Boolean(req.body?.hidden);
  setEntityHidden(entityId, hidden);
  res.json({ entityId, hidden });
});

// ─── Layout (flat entity order) ─────────────────────────────

router.get('/layout', async (_req: Request, res: Response) => {
  res.json({ order: readLayout() });
});

router.post('/layout', requireAdmin, (req: Request, res: Response) => {
  const order = Array.isArray(req.body?.order) ? req.body.order : [];
  saveLayout(order);
  res.json({ order });
});

// ─── Guest entities & title ─────────────────────────────────

router.get('/guest-entities', async (_req: Request, res: Response) => {
  res.json({ entities: readGuestEntities(), title: readGuestTitle() });
});

router.post('/guest-entities', requireAdmin, (req: Request, res: Response) => {
  const title = typeof req.body?.title === 'string' ? req.body.title : undefined;
  if (req.body?.entities !== undefined) {
    const entities = Array.isArray(req.body.entities) ? req.body.entities : [];
    saveGuestEntities(entities);
  }
  if (title !== undefined) {
    saveGuestTitle(title);
  }
  res.json({ entities: readGuestEntities(), title: readGuestTitle() });
});

// ─── Modules ────────────────────────────────────────────────

router.get('/modules', async (_req: Request, res: Response) => {
  res.json({ modules: readModules() });
});

router.post('/modules', requireAdmin, (req: Request, res: Response) => {
  const { name, icon } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: 'Module name is required' });
    return;
  }
  const module = createModule(name, icon);
  res.json({ module });
});

router.put('/modules/:id', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, icon, position, visible } = req.body ?? {};
  updateModule(id, { name, icon, position, visible });
  res.json({ success: true });
});

router.delete('/modules/:id', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  deleteModule(id);
  res.json({ success: true });
});

router.post('/modules/:id/entities', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const entities = Array.isArray(req.body?.entities) ? req.body.entities : [];
  setModuleEntities(id, entities);
  res.json({ success: true, entities });
});

router.post('/modules/reorder', requireAdmin, (req: Request, res: Response) => {
  const moduleIds = Array.isArray(req.body?.moduleIds) ? req.body.moduleIds : [];
  reorderModules(moduleIds);
  res.json({ success: true });
});

// ─── Guest modules (read-only, for guest dashboard — PIN protected) ─────────

router.get('/guest-modules', requireGuestPin, async (_req: Request, res: Response) => {
  const allModules = readModules();
  // Only return visible modules with their entities
  const visibleModules = allModules.filter(m => m.visible);
  const title = readGuestTitle();
  res.json({ modules: visibleModules, title });
});

// ─── Entity display props ───────────────────────────────────

router.get('/entity-props', requireAdmin, (_req: Request, res: Response) => {
  res.json({ props: readAllEntityDisplayProps() });
});

router.get('/entity-props/:entityId', requireAdmin, (req: Request, res: Response) => {
  const props = readEntityDisplayProps(req.params.entityId);
  res.json({ props: props ?? { entity_id: req.params.entityId, custom_name: null, custom_icon: null } });
});

router.post('/entity-props/:entityId', requireAdmin, (req: Request, res: Response) => {
  const entityId = req.params.entityId;
  const { custom_name, custom_icon } = req.body ?? {};
  saveEntityDisplayProps(entityId, { custom_name: custom_name ?? null, custom_icon: custom_icon ?? null });
  res.json({ props: readEntityDisplayProps(entityId) });
});

router.delete('/entity-props/:entityId', requireAdmin, (req: Request, res: Response) => {
  deleteEntityDisplayProps(req.params.entityId);
  res.json({ success: true });
});

export default router;
