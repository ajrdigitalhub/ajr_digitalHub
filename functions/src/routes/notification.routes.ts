import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Customer/Client endpoints
router.post('/token', requireAuth, notificationController.saveToken);
router.delete('/token', requireAuth, notificationController.deleteToken);
router.get('/settings', requireAuth, notificationController.getSettings);

// Admin endpoints
router.post('/admin/settings', requireAuth, requireRole('admin'), notificationController.saveSettings);
router.get('/admin/history', requireAuth, requireRole('admin'), notificationController.getHistory);
router.get('/admin/logs', requireAuth, requireRole('admin'), notificationController.getLogs);
router.post('/admin/send-to-user', requireAuth, requireRole('admin'), notificationController.sendToUser);
router.post('/admin/send-broadcast', requireAuth, requireRole('admin'), notificationController.sendBroadcast);
router.post('/admin/test', requireAuth, requireRole('admin'), notificationController.testNotification);

export default router;
