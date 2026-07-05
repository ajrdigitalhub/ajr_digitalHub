import { Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { firebaseMessagingService } from '../services/firebase-messaging.service';

function resolvePlaceholder(path: string, obj: any): string {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return '';
    current = current[part];
  }
  return current != null ? String(current) : '';
}

function renderTemplate(template: string, context: any): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    return resolvePlaceholder(path.trim(), context);
  });
}

export function notificationTrigger(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  const originalSend = res.send;

  let responseBody: any = null;
  let intercepted = false;

  res.json = function (body) {
    if (!intercepted) {
      intercepted = true;
      responseBody = body;
      handleTrigger(req, res, responseBody);
    }
    return originalJson.call(this, body);
  };

  res.send = function (body) {
    if (!intercepted) {
      intercepted = true;
      try {
        responseBody = JSON.parse(body);
      } catch (e) {
        responseBody = body;
      }
      handleTrigger(req, res, responseBody);
    }
    return originalSend.call(this, body);
  };

  next();
}

async function handleTrigger(req: Request, res: Response, responseBody: any) {
  res.on('finish', async () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    try {
      const path = req.path || req.originalUrl.split('?')[0];
      const method = req.method;

      // 1. Fetch matching active configs
      const configsRes = await query(
        `SELECT * FROM notification_events_config WHERE enabled = true AND api_endpoint = $1 AND http_method = $2`,
        [path, method]
      );

      for (const config of configsRes.rows) {
        console.log(`[FCM Trigger] Found matching config for endpoint: ${method} ${path} -> Event: ${config.event_code}`);
        
        // 2. Build context for template rendering
        const context = {
          request: {
            body: req.body,
            query: req.query,
            params: req.params,
            user: (req as any).user || {}
          },
          response: {
            body: responseBody
          },
          user: (req as any).user || {}
        };

        // 3. Resolve target users
        let targetUsers: string[] = [];
        let broadcast = false;
        let targetRole: string | undefined = undefined;
        let targetDepartment: string | undefined = undefined;

        if (config.target_type === 'broadcast') {
          broadcast = true;
        } else if (config.target_type === 'role') {
          targetRole = config.target_value;
        } else if (config.target_type === 'department') {
          targetDepartment = config.target_value;
        } else if (config.target_type === 'user') {
          let resolvedUserId = config.target_value;
          if (resolvedUserId.includes('{{')) {
            resolvedUserId = renderTemplate(resolvedUserId, context);
          }
          if (resolvedUserId) {
            targetUsers = [resolvedUserId];
          }
        }

        // 4. Render title & body templates
        const title = renderTemplate(config.title_template, context) || config.name;
        const body = renderTemplate(config.body_template, context) || 'Dynamic update occurred.';
        let navigationUrl = config.navigation_url;
        if (navigationUrl && navigationUrl.includes('{{')) {
          navigationUrl = renderTemplate(navigationUrl, context);
        }

        // 5. Send notification via generic service
        await firebaseMessagingService.sendGenericNotification({
          eventCode: config.event_code,
          targetUsers: targetUsers.length > 0 ? targetUsers : undefined,
          targetRole,
          targetDepartment,
          broadcast,
          title,
          body,
          navigationUrl,
          data: {
            eventCode: config.event_code,
            timestamp: new Date().toISOString(),
            requestBody: req.body,
            responseBody: responseBody
          }
        });
      }
    } catch (err: any) {
      console.error('[FCM Trigger Error]: Failed to handle notification triggering:', err);
    }
  });
}
