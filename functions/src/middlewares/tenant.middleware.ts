import { Request, Response, NextFunction } from 'express';

export interface TenantContext {
  organizationId: string;
  workspaceId: string;
  applicationId: string;
  authenticatedUserId: string;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract values from headers or fallback queries
  const organizationId = (req.headers['x-organization-id'] || req.query['organizationId'] || 'org-default-sandbox-id') as string;
  const workspaceId = (req.headers['x-workspace-id'] || req.query['workspaceId'] || 'ws-default-sandbox-id') as string;
  const applicationId = (req.headers['x-application-id'] || req.query['applicationId'] || 'app-default-sandbox-id') as string;
  
  const authenticatedUserId = req.user?.id || 'anonymous-user-id';

  // Inject tenant context into the Express Request object
  req.tenantContext = {
    organizationId,
    workspaceId,
    applicationId,
    authenticatedUserId
  };

  // Perform tenant isolation validation checks
  if (req.headers['x-organization-id'] && !/^[a-z0-9_-]+$/i.test(organizationId)) {
    res.status(400).json({ error: 'Invalid organization identifier format' });
    return;
  }

  next();
};
