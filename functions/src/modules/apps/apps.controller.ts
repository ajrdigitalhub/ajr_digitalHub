import { Request, Response } from 'express';
import { appsService } from '../../services/apps.service';
import { successResponse, errorResponse } from '../../utils/response';

export const appsController = {
  async provision(req: Request, res: Response): Promise<any> {
    try {
      console.log('Provisioning new app:', req.body);
      const data = await appsService.provisionApp(req.body);
      return res.status(201).json(successResponse(data));
    } catch (err: any) {
      console.error('Provisioning error:', err);
      const status = err.message.includes('exists') ? 409 : 400;
      return res.status(status).json(errorResponse(err.message, status));
    }
  },

  async list(req: Request, res: Response): Promise<any> {
    try {
      const { data, meta } = await appsService.findAll(req.query as any);
      
      // Map to UI specific structure if needed
      const apps = data.map(app => ({
        id: app.id,
        name: app.name,
        status: app.status,
        apiKey: app.apiKey,
        createdAt: app.createdAt || app.created_at
      }));

      return res.json({
        success: true,
        data: apps,
        meta
      });
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  }
};
