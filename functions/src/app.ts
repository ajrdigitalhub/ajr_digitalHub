import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import marketplaceRoutes from './routes/marketplace.routes';
import saasRoutes from './routes/saas.routes';
import adminDataRoutes from './routes/admin-data.routes';
import authRoutes from './routes/auth.routes';
import billingRoutes from './routes/billing.routes';
import crmRoutes from './routes/crm.routes';
import whatsappMarketingRoutes from './routes/whatsapp-marketing.routes';
import adsRoutes from './routes/ads.routes';
import aiAssistantRoutes from './routes/ai-assistant.routes';
import customersRoutes from './routes/customers.routes';
import documentationRoutes from './routes/documentation.routes';
import customerBillingRoutes from './routes/customer-billing.routes';
import notificationRoutes from './routes/notification.routes';
import firebaseNotificationRoutes from './routes/firebaseNotification.routes';
import whatsappWebhookRoutes from './routes/whatsapp-webhook.routes';
import settingsRoutes from './modules/settings/settings.routes';
import { BaseService } from './core/base.service';
import { usageTracker } from './middlewares/usage';
import { requireAuth, requireRole } from './middlewares/auth.middleware';
import { initDynamicDb } from './utils/dynamic-db';
import { seedDatabase } from './seed';
import { notificationTrigger } from './middlewares/notification-trigger.middleware';

// Import correct module routes
import appsRoutes from './modules/apps/apps.routes';
import shopsRoutes from './modules/shops/shops.routes';
import uploadRoutes from './modules/upload/upload.routes';
import adminSystemRoutes from './modules/admin-system/admin-system.routes';
import invoiceRoutes from './modules/invoice/invoice.routes';
import moduleMarketplaceRoutes from './modules/marketplace/marketplace.routes';

// Initialize and seed database schemas asynchronously on cloud function cold start
initDynamicDb()
  .then(() => seedDatabase())
  .catch(err => console.error('Database initialization/seeding failed:', err));

const app = express();

const ALLOWED_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,           // Any localhost port (dev)
  /^https:\/\/localhost(:\d+)?$/,          // HTTPS localhost
  /\.web\.app$/,                           // Firebase Hosting (*.web.app)
  /\.firebaseapp\.com$/,                   // Firebase legacy hosting
  /\.run\.app$/,                           // Cloud Run services
  /ajrdigitalhub\.com$/,
  /ajrdigitalhub\.in$/,                    // Custom domain
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (server-to-server, Postman, curl)
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.some(pattern => pattern.test(origin));
    if (allowed) return callback(null, true);
    return callback(new Error(`CORS: Origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-organization-id', 'x-workspace-id', 'x-application-id'],
};

app.use(cors(corsOptions));

// Explicitly handle preflight for all routes (must use same corsOptions!)
app.options('*', cors(corsOptions));
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(cookieParser());
app.use(usageTracker);
app.use(notificationTrigger);

// Auth
app.use('/api/auth', authRoutes);

// Module Routes
app.use('/api/marketplace', moduleMarketplaceRoutes);
app.use('/api/admin/marketplace', moduleMarketplaceRoutes);
app.use('/api/admin/marketplace-items', moduleMarketplaceRoutes);
app.use('/api/marketplace-items', moduleMarketplaceRoutes);

app.use('/api/admin/apps', appsRoutes);
app.use('/api/admin/data', requireAuth, requireRole('admin'), adminDataRoutes);
app.use('/api/admin/billing', requireAuth, requireRole('admin'), billingRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/whatsapp-marketing', whatsappMarketingRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/documentation', documentationRoutes);
app.use('/api/billing', customerBillingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/firebase', firebaseNotificationRoutes);
app.use('/api/whatsapp/webhook', whatsappWebhookRoutes);

app.use('/api/shops', shopsRoutes);
app.use('/api/admin/upload', uploadRoutes);
app.use('/api/admin', adminSystemRoutes);
app.use('/api/invoice', invoiceRoutes);

// Settings routes (landing_config, growth/track, hero-slider key, etc.)
app.use('/api/settings', settingsRoutes);
app.use('/api/admin/settings', requireAuth, requireRole('admin'), settingsRoutes);

// --- Hero Slider CRUD (inline, matching core/app.ts) ---
const heroSliderService = new BaseService('settings');

const getSliderDoc = async () => {
  let doc = await heroSliderService.findOne('hero-slider');
  if (!doc) {
    const defaultDoc = {
      key: 'hero-slider',
      slides: [
        {
          id: 'slide_1',
          title: 'Orchestrate Your Enterprise Workspace',
          subtitle: 'The Premier Digital Hub',
          description: 'Deploy lightning-fast cloud applications with real-time analytics, dynamic billing models, and a centralized control center.',
          backgroundImage: 'https://picsum.photos/seed/cyber/1920/1080',
          image: 'https://picsum.photos/seed/cyber/1920/1080',
          buttonText: 'Deploy SaaS Now',
          buttonLink: '/dashboard',
          overlayGradient: 'from-slate-950 via-slate-900/40 to-slate-950',
          animationType: 'zoom',
          isActive: true
        },
        {
          id: 'slide_2',
          title: 'Discover Premium Marketplace Assets',
          subtitle: 'Custom Crafted UI Elements',
          description: 'Browse, preview, and deploy high-performance widgets, landing pages, and theme components directly from our live dynamic marketplace.',
          backgroundImage: 'https://picsum.photos/seed/tech/1920/1080',
          image: 'https://picsum.photos/seed/tech/1920/1080',
          buttonText: 'Explore Marketplace',
          buttonLink: '/marketplace',
          overlayGradient: 'from-slate-950 via-slate-900/60 to-slate-950',
          animationType: 'slide',
          isActive: true
        }
      ]
    };
    doc = await heroSliderService.create(defaultDoc);
  }
  return doc;
};

app.get('/api/settings/hero-slider', async (req, res) => {
  try {
    const doc = await getSliderDoc();
    return res.json({ success: true, slides: doc.slides || [], data: doc });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/hero-slider', async (req, res) => {
  try {
    const doc = await getSliderDoc();
    const slides = doc.slides || [];
    const newSlide = {
      id: 'slide_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: req.body.title || 'New Slide',
      subtitle: req.body.subtitle || '',
      description: req.body.description || '',
      backgroundImage: req.body.backgroundImage || req.body.image || 'https://picsum.photos/seed/placeholder/1920/1080',
      image: req.body.backgroundImage || req.body.image || 'https://picsum.photos/seed/placeholder/1920/1080',
      buttonText: req.body.buttonText || 'Click Here',
      buttonLink: req.body.buttonLink || '#',
      overlayGradient: req.body.overlayGradient || 'from-slate-950 via-slate-900/50 to-slate-950',
      animationType: req.body.animationType || 'fade',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    };
    slides.push(newSlide);
    const updated = await heroSliderService.update(doc.id, { slides });
    return res.json({ success: true, data: newSlide, slides: updated?.slides || slides });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/hero-slider', async (req, res) => {
  try {
    const doc = await getSliderDoc();
    const { slides } = req.body;
    if (!Array.isArray(slides)) {
      return res.status(400).json({ success: false, error: 'Slides must be an array' });
    }
    const updated = await heroSliderService.update(doc.id, { slides });
    return res.json({ success: true, slides: updated?.slides || slides });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/hero-slider/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await getSliderDoc();
    const slides = doc.slides || [];
    const idx = slides.findIndex((s: any) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Slide not found' });
    }
    slides[idx] = { ...slides[idx], ...req.body, id };
    if (req.body.image && !req.body.backgroundImage) slides[idx].backgroundImage = req.body.image;
    if (req.body.backgroundImage && !req.body.image) slides[idx].image = req.body.backgroundImage;
    const updated = await heroSliderService.update(doc.id, { slides });
    return res.json({ success: true, data: slides[idx], slides: updated?.slides || slides });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/hero-slider/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await getSliderDoc();
    let slides = doc.slides || [];
    slides = slides.filter((s: any) => s.id !== id);
    const updated = await heroSliderService.update(doc.id, { slides });
    return res.json({ success: true, slides: updated?.slides || slides });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Dynamic Data Handler (The Dynamic Schema system requested)
import dynamicRoutes from './routes/dynamic.routes';
app.use('/api/dynamic', dynamicRoutes);

// Generic Aliases for Dynamic Collections
app.use('/api/settings', dynamicRoutes);
app.use('/api/menus', dynamicRoutes);
app.use('/api/categories', dynamicRoutes);
app.use('/api/pages', dynamicRoutes);
app.use('/api/testimonials', dynamicRoutes);
app.use('/api/admin/settings', requireAuth, requireRole('admin'), dynamicRoutes);
app.use('/api/admin/menus', requireAuth, requireRole('admin'), dynamicRoutes);
app.use('/api/admin/categories', requireAuth, requireRole('admin'), dynamicRoutes);
app.use('/api/admin/pages', requireAuth, requireRole('admin'), dynamicRoutes);

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'AJR Digital HUB Backend' }));

export default app;
export { billingService } from './services/billingService';
export { analyticsService } from './services/analytics.service';
