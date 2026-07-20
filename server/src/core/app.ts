import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from '../modules/auth/auth.routes';
import dynamicRoutes from '../modules/dynamic/dynamic.routes';
import logsRoutes from '../modules/logs/logs.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import appsRoutes from '../modules/apps/apps.routes';
import uploadRoutes from '../modules/upload/upload.routes';
import marketplaceRoutes from '../modules/marketplace/marketplace.routes';
import settingsRoutes from '../modules/settings/settings.routes';
import shopsRoutes from '../modules/shops/shops.routes';
import adminSystemRoutes from '../modules/admin-system/admin-system.routes';
import invoiceRoutes from '../modules/invoice/invoice.routes';
import billingRoutes from '../modules/billing/billing.routes';
import { broadcastToSse } from '../modules/admin-system/admin-system.controller';
import { BaseService } from './base.service';

import cookieParser from 'cookie-parser';
import path from 'path';

const app = express();
const logService = new BaseService('logs');
const settingsService = new BaseService('settings');

const getSliderDoc = async () => {
  let doc = await settingsService.findOne('hero-slider');
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
    doc = await settingsService.create(defaultDoc);
  }
  return doc;
};

// Hero Slider endpoints
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
    const updated = await settingsService.update(doc.id, { slides });
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
    const updated = await settingsService.update(doc.id, { slides });
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
    slides[idx] = {
      ...slides[idx],
      ...req.body,
      id
    };
    if (req.body.image && !req.body.backgroundImage) {
      slides[idx].backgroundImage = req.body.image;
    }
    if (req.body.backgroundImage && !req.body.image) {
      slides[idx].image = req.body.backgroundImage;
    }
    const updated = await settingsService.update(doc.id, { slides });
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
    const updated = await settingsService.update(doc.id, { slides });
    return res.json({ success: true, slides: updated?.slides || slides });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Middlewares
app.use(helmet({ 
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: (origin, callback) => {
    // Dynamic origin selection to perfectly support AI Studio web iframe & localhost dev
    if (!origin) return callback(null, true);
    if (
      origin.startsWith('http://localhost') || 
      origin.startsWith('https://localhost') || 
      origin.endsWith('.run.app') || 
      origin.includes('google.com') || 
      origin.includes('aistudio')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback to always allow in the sandboxed preview
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Request Logging Middleware & SSE Realtime Stream
app.use(async (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Save to Persistent logs
    logService.create({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      response_time: duration,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }).catch(e => console.error('Auto-Log Error:', e));

    // Push Real-time updates over Server-Sent Events (SSE)
    broadcastToSse({
      type: 'traffic',
      time: new Date().toLocaleTimeString(),
      method: req.method,
      endpoint: req.path,
      status: res.statusCode,
      latency: duration,
      message: `Endpoint hit: ${req.path}`
    });
  });
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/admin/marketplace', marketplaceRoutes);
app.use('/api/admin/marketplace-items', marketplaceRoutes);
app.use('/api/marketplace-items', marketplaceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/apps', appsRoutes);
app.use('/api/admin/upload', uploadRoutes);
app.use('/api/shops', shopsRoutes);
app.use('/api/dynamic', dynamicRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/internal/log', logsRoutes);
app.use('/api/admin/analytics', analyticsRoutes);

// Unified dynamic real-time administrative system APIs
app.use('/api/admin', adminSystemRoutes);
app.use('/api/invoice', invoiceRoutes);

// Serve static invoices PDF
app.use('/public', express.static(path.join(__dirname, '../../../public')));

// Specific Billing Routes
app.use('/api', billingRoutes);

// Shared aliases
app.use('/api', dynamicRoutes);

app.get('/health', (req, res) => res.json({ status: 'UP', timestamp: new Date(), env: process.env['NODE_ENV'] }));

export default app;
