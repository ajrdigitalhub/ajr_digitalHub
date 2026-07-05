import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Customer/Client endpoints
router.post('/token', requireAuth, notificationController.saveToken);
router.delete('/token', requireAuth, notificationController.deleteToken);
router.get('/settings', requireAuth, notificationController.getSettings);

// User Notifications History
router.get('/my-notifications', requireAuth, notificationController.getMyNotifications);
router.get('/unread-count', requireAuth, notificationController.getUnreadCount);
router.post('/mark-read', requireAuth, notificationController.markRead);
router.post('/mark-all-read', requireAuth, notificationController.markAllRead);
router.delete('/delete/:id', requireAuth, notificationController.deleteNotification);

// Admin endpoints
router.post('/admin/settings', requireAuth, requireRole('admin'), notificationController.saveSettings);
router.get('/admin/history', requireAuth, requireRole('admin'), notificationController.getHistory);
router.get('/admin/logs', requireAuth, requireRole('admin'), notificationController.getLogs);
router.post('/admin/send-to-user', requireAuth, requireRole('admin'), notificationController.sendToUser);
router.post('/admin/send-broadcast', requireAuth, requireRole('admin'), notificationController.sendBroadcast);
router.post('/admin/test', requireAuth, requireRole('admin'), notificationController.testNotification);

// Admin Dynamic Event Configurations CRUD
router.get('/admin/config', requireAuth, requireRole('admin'), notificationController.getConfigs);
router.post('/admin/config', requireAuth, requireRole('admin'), notificationController.createConfig);
router.put('/admin/config/:id', requireAuth, requireRole('admin'), notificationController.updateConfig);
router.delete('/admin/config/:id', requireAuth, requireRole('admin'), notificationController.deleteConfig);

export default router;
