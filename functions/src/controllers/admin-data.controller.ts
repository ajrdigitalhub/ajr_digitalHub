import { Request, Response } from 'express';
import { query } from '../db';

export const adminDataController = {
  async getTableData(req: Request, res: Response): Promise<any> {
    try {
      const table = req.params['table'] as string;
      const allowedTables = ['users', 'products', 'orders', 'tickets', 'kanban_tasks', 'subscriptions'];
      if (!allowedTables.includes(table)) return res.status(400).json({ error: 'Invalid table' });

      const result = await query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 100`);
      return res.json(result.rows);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async updateTableData(req: Request, res: Response) {
    try {
      const { table, id } = req.params;
      const data = req.body;
      // Simple generic update logic would go here
      res.json({ success: true, message: `Updated ${table}:${id}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
