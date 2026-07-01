import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateAdmin } from '../middlewares/auth';
import { 
  getRecords, 
  getRecordById, 
  createRecord, 
  updateRecord, 
  deleteRecord 
} from '../utils/dynamic-db';

const router = Router();

const CollectionSchema = z.string().regex(/^[a-z0-9_]+$/i);
const DataSchema = z.record(z.string(), z.any());

router.get('/:collection', async (req: Request, res: Response): Promise<any> => {
  try {
    const colRaw = req.params['collection'] as string;
    const col = CollectionSchema.parse(colRaw);
    
    const id = req.query['id'] ? parseInt(req.query['id'] as string) : null;
    
    if (id) {
       const record = await getRecordById(col, id);
       if (!record) return res.status(404).json({ error: 'Not found' });
       return res.json(record);
    }

    const data = await getRecords(col);

    // HEURISTIC: If it's a settings collection and we only have one item, return that item directly
    if (data.length > 0 && (colRaw === 'settings' || colRaw === 'landing_config' || colRaw === 'website_config' || colRaw === 'rate_limiter')) {
       return res.json(data[0]);
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:collection/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const col = CollectionSchema.parse(req.params['collection']);
    const id = parseInt(req.params['id'] as string);
    const record = await getRecordById(col, id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    return res.json(record);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:collection', authenticateAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const col = CollectionSchema.parse(req.params['collection']);
    const body = DataSchema.parse(req.body);
    const record = await createRecord(col, body);
    return res.json(record);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:collection/:id', authenticateAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const col = CollectionSchema.parse(req.params['collection']);
    const id = parseInt(req.params['id'] as string);
    const body = DataSchema.parse(req.body);
    const record = await updateRecord(col, id, body);
    if (!record) return res.status(404).json({ error: 'Not found' });
    return res.json(record);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:collection/:id', authenticateAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const col = CollectionSchema.parse(req.params['collection']);
    const id = parseInt(req.params['id'] as string);
    const success = await deleteRecord(col, id);
    return res.json({ success });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
