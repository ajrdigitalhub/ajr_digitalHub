import { Request, Response } from 'express';
import { query } from '../db';

export const saasController = {
  async getApps(req: Request, res: Response) {
    try {
      const result = await query('SELECT * FROM apps ORDER BY id DESC');
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createApp(req: Request, res: Response) {
    try {
      const { name, api_key } = req.body;
      const result = await query('INSERT INTO apps (name, api_key) VALUES ($1, $2) RETURNING *', [name, api_key]);
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
