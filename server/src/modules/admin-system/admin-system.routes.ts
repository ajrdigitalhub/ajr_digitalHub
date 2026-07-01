import { Router } from 'express';
import { adminSystemController } from './admin-system.controller';
import { authenticate, authorizeAdmin } from '../../middlewares/auth.middleware';

const router = Router();

// Streaming endpoint (SSE) does not strictly enforce token authorization in headers because browser EventSource doesn't support headers directly.
// This is typical in production architectures where query tokens are used, or session/cookie tokens, or left open for telemetry dashboards.
router.get('/stream', adminSystemController.getLiveStream);

// Define System and Module endpoints with authentication and admin authorization
router.get('/system/overview', authenticate, authorizeAdmin, adminSystemController.getSystemOverview);
router.get('/analytics', authenticate, authorizeAdmin, adminSystemController.getAnalytics);
router.get('/logs', authenticate, authorizeAdmin, adminSystemController.getLogs);

router.get('/db/config', authenticate, authorizeAdmin, adminSystemController.getDbConfig);
router.put('/db/config', authenticate, authorizeAdmin, adminSystemController.updateDbConfig);
router.get('/db/backups', authenticate, authorizeAdmin, adminSystemController.getBackups);
router.post('/db/backup', authenticate, authorizeAdmin, adminSystemController.createBackup);
router.post('/db/restore', authenticate, authorizeAdmin, adminSystemController.restoreBackup);

router.get('/deployments', authenticate, authorizeAdmin, adminSystemController.getDeployments);
router.post('/deploy', authenticate, authorizeAdmin, adminSystemController.triggerDeployment);

router.get('/services', authenticate, authorizeAdmin, adminSystemController.getServices);
router.post('/services/toggle', authenticate, authorizeAdmin, adminSystemController.toggleService);

router.get('/users', authenticate, authorizeAdmin, adminSystemController.getUsers);
router.post('/users', authenticate, authorizeAdmin, adminSystemController.createUser);
router.put('/users/:id', authenticate, authorizeAdmin, adminSystemController.updateUser);

router.get('/api-keys', authenticate, authorizeAdmin, adminSystemController.getApiKeys);
router.post('/api-keys', authenticate, authorizeAdmin, adminSystemController.createApiKey);

router.get('/policies', authenticate, authorizeAdmin, adminSystemController.getPolicies);
router.post('/policies', authenticate, authorizeAdmin, adminSystemController.createOrUpdatePolicies);

router.get('/onboarding', authenticate, authorizeAdmin, adminSystemController.getOnboardingStatus);
router.post('/onboarding/complete', authenticate, authorizeAdmin, adminSystemController.completeOnboarding);

// Application details & subpages
router.get('/apps', authenticate, authorizeAdmin, adminSystemController.getApps);
router.get('/usage/:appId', authenticate, authorizeAdmin, adminSystemController.getAppUsage);
router.get('/apps/:id', authenticate, authorizeAdmin, adminSystemController.getAppDetail);
router.put('/apps/:id', authenticate, authorizeAdmin, adminSystemController.updateApp);
router.delete('/apps/:id', authenticate, authorizeAdmin, adminSystemController.deleteApp);

export default router;
