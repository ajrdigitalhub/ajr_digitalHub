import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as dynamicDb from './dynamic-db';

const router = Router();

// Validation Schemas
const CollectionSchema = z.string().regex(/^[a-z0-9_]+$/i);
const DataSchema = z.record(z.string(), z.any());

// Public data fetch
router.get('/:collection', async (req: Request, res: Response): Promise<any> => {
  try {
    const rawCollection = req.params['collection'] as string;
    const collection = CollectionSchema.parse(rawCollection);
    const data = await dynamicDb.getRecords(collection);
    return res.json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid collection name' });
    return res.status(500).json({ error: err.message });
  }
});

// Admin data fetch
router.get('/admin/:collection', async (req: Request, res: Response): Promise<any> => {
  try {
    const rawCollection = req.params['collection'] as string;
    const collection = CollectionSchema.parse(rawCollection);
    const data = await dynamicDb.getRecords(collection);
    return res.json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid collection name' });
    return res.status(500).json({ error: err.message });
  }
});

// Admin create record
router.post('/admin/:collection', async (req: Request, res: Response): Promise<any> => {
  try {
    const rawCollection = req.params['collection'] as string;
    const collection = CollectionSchema.parse(rawCollection);
    const body = DataSchema.parse(req.body);
    const data = await dynamicDb.createRecord(collection, body);
    return res.json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid data format', details: err.issues });
    return res.status(500).json({ error: err.message });
  }
});

// Admin update record
router.put('/admin/:collection/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const rawCollection = req.params['collection'] as string;
    const collection = CollectionSchema.parse(rawCollection);
    const body = DataSchema.parse(req.body);
    const id = parseInt(req.params['id'] as string);
    const data = await dynamicDb.updateRecord(collection, id, body);
    if (!data) return res.status(404).json({ error: 'Record not found' });
    return res.json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid data format', details: err.issues });
    return res.status(500).json({ error: err.message });
  }
});

// Admin delete record
router.delete('/admin/:collection/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const collection = req.params['collection'] as string;
    const id = parseInt(req.params['id'] as string);
    const success = await dynamicDb.deleteRecord(collection, id);
    return res.json({ success });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Logging endpoint
router.post('/internal/log', async (req: Request, res: Response): Promise<any> => {
  try {
    const data = await dynamicDb.createRecord('system_logs', req.body);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
