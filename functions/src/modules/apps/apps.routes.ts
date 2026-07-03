import { Router } from 'express';
import { saasController } from '../../controllers/saas.controller';
import { analyticsController } from '../../controllers/analytics.controller';
import { firebaseController } from '../../controllers/firebase.controller';
import { securityController } from '../../controllers/security.controller';
import { deploymentsController } from '../../controllers/deployments.controller';
import { observabilityController } from '../../controllers/observability.controller';
import { whatsappBillingController } from '../../controllers/whatsapp-billing.controller';
import { authenticate, authorizeAdmin, optionalAuth } from '../../middlewares/auth.middleware';

const router = Router();

// ── Streaming endpoints (SSE) - bypass strict auth ─────────────────────────
// Native EventSource does not easily send Authorization headers in browsers
router.get('/:id/live-stream', optionalAuth, analyticsController.liveStream);
router.get('/:id/firebase/live-logs', optionalAuth, firebaseController.liveLogs);
router.get('/:id/firebase/live-api-hits', optionalAuth, firebaseController.liveApiHits);
router.get('/:id/observability/live-stream', optionalAuth, observabilityController.liveStream);

// ── All other routes require authentication ─────────────────────────────────
router.use(authenticate, authorizeAdmin);

// Apps - list & create
router.get('/', saasController.getApps);
router.post('/provision', saasController.createApp);

// Configs
router.put('/:id/config', saasController.updateConfig);
router.put('/:id/rate-limit', saasController.updateRateLimit);
router.post('/:id/whatsapp-config', saasController.updateWhatsappConfig);
router.post('/:id/email-config', saasController.updateEmailConfig);
router.post('/:id/firebase-config', firebaseController.saveConfig);
router.post('/:id/firebase/test-connection', firebaseController.testConnection);
router.get('/:id/billing-automation-config', saasController.getBillingAutomationConfig);
router.put('/:id/billing-automation-config', saasController.updateBillingAutomationConfig);

// Services & Monitoring
router.post('/:id/services/toggle', saasController.toggleService);
router.get('/:id/status', saasController.getStatus);

// Analytics
router.get('/:id/analytics', analyticsController.getAnalytics);
router.post('/:id/firebase-sync', saasController.syncToFirebase);
router.get('/:id/smart-insights', firebaseController.getSmartInsights);

// ── Firebase Monitoring Integration ─────────────────────────────────────────
// IMPORTANT: All /:id/firebase/* routes MUST be registered BEFORE /:id catch-all
router.get('/:id/firebase/status', firebaseController.getStatus);
router.get('/:id/firebase/logs', firebaseController.getLogs);
router.get('/:id/firebase/analytics', firebaseController.getAnalytics);
router.get('/:id/firebase/storage', firebaseController.getStorage);
router.get('/:id/firebase/billing', firebaseController.getBilling);
router.get('/:id/firebase/realtime-analytics', firebaseController.getRealtimeAnalytics);
router.get('/:id/firebase/api-hits', firebaseController.getFirebaseApiHits);

// ── Observability ────────────────────────────────────────────────────────────
router.get('/:id/observability/logs', observabilityController.getLogs);
router.get('/:id/observability/metrics', observabilityController.getMetrics);
router.get('/:id/observability/chart-data', observabilityController.getChartData);
router.get('/:id/observability/alerts', observabilityController.getAlerts);

// ── Security Center ──────────────────────────────────────────────────────────
router.get('/:id/security/logs', securityController.getLogs);
router.post('/:id/security/ban-ip', securityController.banIp);
router.post('/:id/security/revoke-session', securityController.revokeSession);
router.get('/:id/security/live-stream', optionalAuth, securityController.liveStream);

// ── Deployments Pipeline ─────────────────────────────────────────────────────
router.get('/:id/deployments', deploymentsController.getDeployments);
router.post('/:id/deployments/trigger', deploymentsController.triggerDeployment);
router.get('/:id/deployments/live-stream', optionalAuth, deploymentsController.liveStream);
router.get('/:id/deployments/:depId/logs', optionalAuth, deploymentsController.getDeploymentLogs);

// ── WhatsApp Billing & Analytics ─────────────────────────────────────────────
// IMPORTANT: All /:id/whatsapp/* routes MUST be registered BEFORE /:id catch-all
router.get('/:id/whatsapp/realtime-summary', whatsappBillingController.getRealtimeSummary);
router.get('/:id/whatsapp/templates-live', whatsappBillingController.getTemplatesLive);
router.get('/:id/whatsapp/template/:templateName', whatsappBillingController.getTemplateDetail);
router.get('/:id/whatsapp/realtime-graph', whatsappBillingController.getRealtimeGraph);

// !! /:id catch-all MUST come LAST - after all sub-routes !!
router.get('/:id', saasController.getAppById);

export default router;
