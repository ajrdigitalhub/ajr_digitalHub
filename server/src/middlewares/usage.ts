import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { query } from '../db';

export const usageTracker = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (
    req.path.includes('.') || 
    req.path.startsWith('/_angular') || 
    req.path.startsWith('/media') || 
    req.path.startsWith('/assets') ||
    req.path.startsWith('/api/internal/log')
  ) {
    return next();
  }

  const startTime = Date.now();
  
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime;
    const appIdStr = req.headers['x-app-identifier'] as string || req.query['appId'] as string || '1';
    const appId = parseInt(appIdStr);

    try {
      await analyticsService.logUsage({
        appId,
        path: req.path,
        method: req.method,
        status: res.statusCode,
        responseTime,
        deviceInfo: req.headers['user-agent'] || 'Unknown'
      });
    } catch (e) {
      console.warn('Silent fail for usage log:', e);
    }
  });

  next();
};
