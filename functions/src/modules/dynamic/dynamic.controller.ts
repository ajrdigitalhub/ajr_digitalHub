import { Request, Response } from 'express';
import { BaseService } from '../../core/base.service';
import { z } from 'zod';
import { successResponse, errorResponse } from '../../utils/response';
import { query, isPostgresEnabled } from '../../config/db';

const CollectionSchema = z.string().regex(/^[a-z0-9_]+$/i);

export const dynamicController = {
  async getAll(req: Request, res: Response): Promise<any> {
    try {
      const col = CollectionSchema.parse(req.params['collection']);
      const service = new BaseService(col);
      
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 20;
      const search = req.query['search'] as string;
      const sortBy = req.query['sortBy'] as string;
      const order = (req.query['order'] as string === 'ASC' ? 'ASC' : 'DESC');
      
      // Extract filters from query params (everything except our pagination/search/sort keys)
      const specialKeys = ['page', 'limit', 'search', 'sortBy', 'order'];
      const filters: Record<string, any> = {};
      Object.entries(req.query).forEach(([key, val]) => {
        if (!specialKeys.includes(key)) filters[key] = val;
      });

      const { data, meta } = await service.findAll({ page, limit, search, sortBy, order, filters });
      
      const singletonCollections = ['landing_config', 'website_config', 'rate_limiter', 'settings'];
      if (singletonCollections.includes(col)) {
        return res.json(successResponse(data[0] || {}));
      }

      return res.json({
        success: true,
        data,
        meta
      });
    } catch (err: any) {
      console.error(`Dynamic GET ALL error [${req.params['collection']}]:`, err);
      return res.json(successResponse([]));
    }
  },

  async getOne(req: Request, res: Response): Promise<any> {
    try {
      const col = CollectionSchema.parse(req.params['collection']);
      const id = req.params['id'] as string;
      const service = new BaseService(col);
      const data = await service.findOne(id);
      if (!data) return res.status(404).json(errorResponse('Record not found', 404));
      return res.json(successResponse(data));
    } catch (err: any) {
      const status = err instanceof z.ZodError ? 400 : 500;
      return res.status(status).json(errorResponse(err.message, status));
    }
  },

  async create(req: Request, res: Response): Promise<any> {
    try {
      const col = CollectionSchema.parse(req.params['collection']);
      const service = new BaseService(col);
      const data = await service.create(req.body);
      return res.status(201).json(successResponse(data));
    } catch (err: any) {
      const status = err instanceof z.ZodError ? 400 : 500;
      return res.status(status).json(errorResponse(err.message, status));
    }
  },

  async update(req: Request, res: Response): Promise<any> {
    try {
      const col = CollectionSchema.parse(req.params['collection']);
      const id = req.params['id'] as string;
      const service = new BaseService(col);
      const data = await service.update(id, req.body);
      if (!data) return res.status(404).json(errorResponse('Record not found', 404));
      return res.json(successResponse(data));
    } catch (err: any) {
      const status = err instanceof z.ZodError ? 400 : 500;
      return res.status(status).json(errorResponse(err.message, status));
    }
  },

  async delete(req: Request, res: Response): Promise<any> {
    try {
      const col = CollectionSchema.parse(req.params['collection']);
      const id = req.params['id'] as string;
      const service = new BaseService(col);
      const success = await service.delete(id);
      return res.json(successResponse({ success }));
    } catch (err: any) {
      const status = err instanceof z.ZodError ? 400 : 500;
      return res.status(status).json(errorResponse(err.message, status));
    }
  },

  async submitFormResponse(req: Request, res: Response): Promise<any> {
    try {
      const formId = req.params['id'] as string;
      const { responses } = req.body;
      
      const formsService = new BaseService('forms');
      const form = await formsService.findOne(formId);
      if (!form) {
        return res.status(404).json(errorResponse('Form not found', 404));
      }

      const submissionsService = new BaseService('form_submissions');
      const submissionData = {
        formId,
        responses: responses || {},
        submittedAt: new Date().toISOString(),
        metadata: {
          ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
          device: req.headers['user-agent'] || 'Unknown Device'
        }
      };

      const saved = await submissionsService.create(submissionData);

      // Increment submissionsCount on form
      const currentCount = Number(form.submissionsCount) || 0;
      await formsService.update(formId, {
        submissionsCount: currentCount + 1
      });

      return res.status(201).json(successResponse(saved));
    } catch (err: any) {
      console.error('Submit form response error:', err);
      return res.status(500).json(errorResponse(err.message || 'Internal server error'));
    }
  },

  async getFormResponses(req: Request, res: Response): Promise<any> {
    try {
      const formId = req.params['id'] as string;
      let data: any[] = [];

      if (isPostgresEnabled) {
        const result = await query(
          'SELECT id, data FROM records WHERE collection = $1 AND data->>\'formId\' = $2 ORDER BY created_at DESC',
          ['form_submissions', formId]
        );
        data = result.rows.map(r => ({ ...r.data, id: r.id }));
      } else {
        const submissionsService = new BaseService('form_submissions');
        const result = await submissionsService.findAll({ limit: 10000 });
        data = result.data.filter((r: any) => r.formId === formId);
      }

      return res.json(data);
    } catch (err: any) {
      console.error('Get form responses error:', err);
      return res.status(500).json([]);
    }
  },

  async getFormAnalytics(req: Request, res: Response): Promise<any> {
    try {
      const formId = req.params['id'] as string;
      let data: any[] = [];

      if (isPostgresEnabled) {
        const result = await query(
          'SELECT id, data FROM records WHERE collection = $1 AND data->>\'formId\' = $2',
          ['form_submissions', formId]
        );
        data = result.rows.map(r => ({ ...r.data, id: r.id }));
      } else {
        const submissionsService = new BaseService('form_submissions');
        const result = await submissionsService.findAll({ limit: 10000 });
        data = result.data.filter((r: any) => r.formId === formId);
      }

      const totalSubmissions = data.length;

      // Group submissions per day
      const dayGroups: Record<string, number> = {};
      data.forEach(r => {
        if (r.submittedAt) {
          const dateStr = new Date(r.submittedAt).toISOString().split('T')[0];
          dayGroups[dateStr] = (dayGroups[dateStr] || 0) + 1;
        }
      });
      const submissionsPerDay = Object.entries(dayGroups)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Group choices distribution
      const fieldStats: Record<string, Record<string, number>> = {};
      data.forEach(r => {
        if (r.responses) {
          Object.entries(r.responses).forEach(([fieldId, val]) => {
            if (val !== undefined && val !== null) {
              if (!fieldStats[fieldId]) {
                fieldStats[fieldId] = {};
              }
              if (Array.isArray(val)) {
                val.forEach((opt: string) => {
                  fieldStats[fieldId][opt] = (fieldStats[fieldId][opt] || 0) + 1;
                });
              } else {
                const optStr = String(val);
                fieldStats[fieldId][optStr] = (fieldStats[fieldId][optStr] || 0) + 1;
              }
            }
          });
        }
      });

      return res.json({
        totalSubmissions,
        submissionsPerDay,
        fieldStats
      });
    } catch (err: any) {
      console.error('Get form analytics error:', err);
      return res.status(500).json({
        totalSubmissions: 0,
        submissionsPerDay: [],
        fieldStats: {}
      });
    }
  }
};
