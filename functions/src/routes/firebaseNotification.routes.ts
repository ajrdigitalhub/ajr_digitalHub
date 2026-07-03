import { Router } from 'express';
import { firebaseNotificationController } from '../controllers/firebaseNotification.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Dashboard (REST & SSE Stream)
router.get('/dashboard', requireAuth, requireRole('admin'), firebaseNotificationController.getDashboard);
router.get('/dashboard/realtime', requireAuth, requireRole('admin'), firebaseNotificationController.getRealtimeStream);

// Applications
router.get('/applications', requireAuth, requireRole('admin'), firebaseNotificationController.getApplications);
router.get('/applications/:id', requireAuth, requireRole('admin'), firebaseNotificationController.getApplicationDetails);

// Subscribers
router.get('/subscribers', requireAuth, requireRole('admin'), firebaseNotificationController.getSubscribers);
router.post('/subscribers/revoke', requireAuth, requireRole('admin'), firebaseNotificationController.revokeToken);
router.post('/subscribers/disable', requireAuth, requireRole('admin'), firebaseNotificationController.disableNotifications);
router.post('/subscribers/refresh', requireAuth, requireRole('admin'), firebaseNotificationController.refreshToken);

// Billing
router.get('/billing', requireAuth, requireRole('admin'), firebaseNotificationController.getBilling);

// Logs
router.get('/logs', requireAuth, requireRole('admin'), firebaseNotificationController.getLogs);

// Reports
router.get('/reports', requireAuth, requireRole('admin'), firebaseNotificationController.getReports);
router.post('/reports/create', requireAuth, requireRole('admin'), firebaseNotificationController.createReport);

// Configuration
router.post('/configuration', requireAuth, requireRole('admin'), firebaseNotificationController.saveConfiguration);

// Actions
router.post('/test-notification', requireAuth, requireRole('admin'), firebaseNotificationController.testNotification);
router.post('/refresh-tokens', requireAuth, requireRole('admin'), firebaseNotificationController.refreshTokens);

export default router;
