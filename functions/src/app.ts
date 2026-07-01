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
import { usageTracker } from './middlewares/usage';
import { requireAuth, requireRole } from './middlewares/auth.middleware';

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(usageTracker);

// Auth
app.use('/api/auth', authRoutes);

// Module Routes
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/admin/apps', requireAuth, requireRole('admin'), saasRoutes);
app.use('/api/admin/data', requireAuth, requireRole('admin'), adminDataRoutes);
app.use('/api/admin/billing', requireAuth, requireRole('admin'), billingRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/whatsapp-marketing', whatsappMarketingRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/documentation', documentationRoutes);
app.use('/api/billing', customerBillingRoutes);

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
