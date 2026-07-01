import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import marketplaceRoutes from './routes/marketplace.routes';
import saasRoutes from './routes/saas.routes';
import adminDataRoutes from './routes/admin-data.routes';
import authRoutes from './routes/auth.routes';
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
