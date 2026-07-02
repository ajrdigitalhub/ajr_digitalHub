import { Router } from 'express';
import { saasController } from '../controllers/saas.controller';
import { analyticsController } from '../controllers/analytics.controller';
import { firebaseController } from '../controllers/firebase.controller';
import { observabilityController } from '../controllers/observability.controller';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticateAdmin);

// Apps - list & create
router.get('/', saasController.getApps);
router.post('/provision', saasController.createApp);

// Configs
router.put('/:id/config', saasController.updateConfig);
router.put('/:id/rate-limit', saasController.updateRateLimit);
router.post('/:id/whatsapp-config', saasController.updateWhatsappConfig);
router.post('/:id/email-config', saasController.updateEmailConfig);

// Services & Monitoring
router.post('/:id/services/toggle', saasController.toggleService);
router.get('/:id/status', saasController.getStatus);

// Analytics & Live Stream
router.get('/:id/analytics', analyticsController.getAnalytics);
router.get('/:id/live-stream', analyticsController.liveStream);
router.post('/:id/firebase-sync', saasController.syncToFirebase);

// Observability
router.get('/:id/observability/logs', observabilityController.getLogs);
router.get('/:id/observability/metrics', observabilityController.getMetrics);
router.get('/:id/observability/chart-data', observabilityController.getChartData);
router.get('/:id/observability/alerts', observabilityController.getAlerts);
router.get('/:id/observability/live-stream', observabilityController.liveStream);

// Firebase Integration Routes (must come before /:id catch-all)
router.get('/:id/firebase/status', firebaseController.getStatus);
router.get('/:id/firebase/logs', firebaseController.getLogs);
router.get('/:id/firebase/analytics', firebaseController.getAnalytics);
router.get('/:id/firebase/storage', firebaseController.getStorage);
router.get('/:id/firebase/billing', firebaseController.getBilling);
router.get('/:id/firebase/realtime-analytics', firebaseController.getRealtimeAnalytics);
router.get('/:id/firebase/live-logs', firebaseController.liveLogs);
router.get('/:id/firebase/api-hits', firebaseController.getFirebaseApiHits);
router.get('/:id/firebase/live-api-hits', firebaseController.liveApiHits);
router.post('/:id/firebase-config', firebaseController.saveConfig);
router.post('/:id/firebase/test', firebaseController.testConnection);

// !! IMPORTANT: This /:id catch-all MUST come last to avoid swallowing sub-routes !!
router.put('/:id', saasController.updateApp);
router.delete('/:id', saasController.deleteApp);
router.get('/:id', saasController.getAppById);

export default router;
