import { Request, Response } from 'express';
import { BaseService } from '../../core/base.service';
import { successResponse, errorResponse } from '../../utils/response';

const logService = new BaseService('logs');

export const logsController = {
  async createLog(req: Request, res: Response): Promise<any> {
    try {
      const data = await logService.create({
        ...req.body,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
      return res.status(201).json(successResponse(data));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async getLogs(req: Request, res: Response): Promise<any> {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const { data, meta } = await logService.findAll({ page, limit, sortBy: 'created_at', order: 'DESC' });
      return res.json({
        success: true,
        data,
        meta
      });
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  }
};
