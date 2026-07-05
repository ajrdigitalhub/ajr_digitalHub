"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function (o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function (o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Constants
// const PORT = 3000;
const JWT_SECRET = 'saas_forms_super_secret_key_123';
const DATA_FILE = path_1.default.join(__dirname, 'schema_datastores.json');
let db = {
    users: [],
    forms: [],
    responses: [],
    sessions: [],
    purchases: [],
    products: []
};
// Seed & Load helper
function loadDatastore() {
    try {
        if (fs_1.default.existsSync(DATA_FILE)) {
            const parsed = JSON.parse(fs_1.default.readFileSync(DATA_FILE, 'utf-8'));
            db = {
                users: parsed.users || [],
                forms: parsed.forms || [],
                responses: parsed.responses || [],
                sessions: parsed.sessions || [],
                purchases: parsed.purchases || [],
                products: parsed.products || []
            };
            // Seed products if missing
            if (!db.products || db.products.length === 0) {
                db.products = [];
                seedDefaultProducts();
                saveDatastore();
            }
            console.log('Datastore safely reloaded from local schema:', DATA_FILE);
        }
        else {
            // Default seeds
            const adminPass = bcryptjs_1.default.hashSync('demopassword123', 8);
            const userPass = bcryptjs_1.default.hashSync('demopassword123', 8);
            db.users.push({
                id: 'admin-1',
                email: 'admin@saas.com',
                passwordHash: adminPass,
                role: 'admin'
            });
            db.users.push({
                id: 'user-1',
                email: 'owner@saas.com',
                passwordHash: userPass,
                role: 'user'
            });
            seedDefaultProducts();
            // Seed a default form
            db.forms.push({
                id: 'demo-form-id',
                name: 'Sales Inquiry Lead Form',
                description: 'Provide your company parameters to onboarding securely into our SaaS CRM portal.',
                fields: [
                    { id: '1', label: 'Customer Name', type: 'text', required: true, placeholder: 'Jane Doe' },
                    { id: '2', label: 'Business Email', type: 'email', required: true, placeholder: 'jane@company.com' },
                    { id: '3', label: 'SaaS Plan Tier', type: 'dropdown', required: true, placeholder: '', options: ['Startup ($29/mo)', 'Enterprise ($199/mo)', 'Custom Quote'] },
                    { id: '4', label: 'Inbound Message', type: 'textarea', required: false, placeholder: 'Tell us about your organization...' }
                ],
                ownerId: 'user-1',
                isActive: true
            });
            // Seed default submissions over several days for analytics visualizations
            const days = 7;
            const now = new Date();
            for (let i = days; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(now.getDate() - i);
                // Add random count of seeds per day
                const dailyCount = Math.floor(Math.random() * 4) + 1;
                for (let j = 0; j < dailyCount; j++) {
                    db.responses.push({
                        id: `seed-resp-${i}-${j}`,
                        formId: 'demo-form-id',
                        responses: {
                            '1': ['Alex Mercer', 'Chris Redfield', 'Leon Kennedy', 'Claire Redfield'][Math.floor(Math.random() * 4)],
                            '2': 'demo@company.com',
                            '3': ['Startup ($29/mo)', 'Enterprise ($199/mo)', 'Custom Quote'][Math.floor(Math.random() * 3)],
                            '4': 'We are extremely excited to integrate!'
                        },
                        submittedAt: date.toISOString(),
                        metadata: {
                            ip: `192.168.1.${10 + i}`,
                            device: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                        }
                    });
                }
            }
            saveDatastore();
        }
    }
    catch (err) {
        console.error('Failed to parse dynamic JSON datastore:', err);
    }
}
function saveDatastore() {
    try {
        fs_1.default.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
    }
    catch (err) {
        console.error('Failed to lock/persist datastore on disk:', err);
    }
}
function seedDefaultProducts() {
    if (!db.products)
        db.products = [];
    if (db.products.length === 0) {
        db.products.push({
            id: '22222222-2222-4222-a222-222222222222',
            title: 'Premium SaaS Dashboard Template',
            description: 'Enterprise grade dashboard containing clean navigation, pre-configured chart utilities, and dense metrics grids.',
            price: 149.99,
            category: 'Software',
            html_content: '<div class="p-12 bg-slate-900 rounded-3xl text-white"><h1>Master Admin</h1></div>',
            status: 'active',
            image: 'https://picsum.photos/seed/dashboard/800/600'
        });
        db.products.push({
            id: '22222222-2222-4222-a222-222222222223',
            title: 'E-Commerce Retail Toolkit',
            description: 'Sleek frontend e-commerce system optimized for digital sales, complete with cart logic and checkout portals.',
            price: 89.00,
            category: 'E-Commerce',
            html_content: '<div class="p-12 bg-white rounded-3xl text-slate-900"><h1>Digital Checkout</h1></div>',
            status: 'active',
            image: 'https://picsum.photos/seed/shop/800/600'
        });
    }
}
loadDatastore();
// Express Server
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Dynamic origin selection to perfectly support AI Studio web iframe & localhost dev
        if (!origin)
            return callback(null, true);
        if (origin.startsWith('http://localhost') ||
            origin.startsWith('https://localhost') ||
            origin.endsWith('.run.app') ||
            origin.includes('google.com') ||
            origin.includes('aistudio')) {
            return callback(null, true);
        }
        return callback(null, true); // Fallback to always allow in the sandboxed preview
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Authentication Helpers
function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Auth session token missing' });
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Auth session token invalid or expired' });
        }
        req.user = user;
        next();
    });
}
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return next();
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (!err && user) {
            req.user = user;
        }
        next();
    });
}
// Map authenticateToken to requireAuth for retro-compatibility
const authenticateToken = requireAuth;
// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------
// PostgreSQL Setup
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const connectionString = process.env['DATABASE_URL'];
const pool = connectionString ? new pg_1.Pool({ connectionString }) : null;
// Initialize Users Table if Postges is connected
if (pool) {
    pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `).catch(console.error);
}
// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
    }
    const userRole = role === 'admin' ? 'admin' : 'user';
    const hashedPass = bcryptjs_1.default.hashSync(password, 8);
    if (pool) {
        try {
            await pool.query('INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)', [email.toLowerCase(), hashedPass, userRole]);
            return res.status(201).json({ success: true, message: 'User registered successfully' });
        }
        catch (err) {
            if (err.code === '23505') {
                return res.status(400).json({ success: false, message: 'User already exists' });
            }
            return res.status(500).json({ success: false, message: 'Database error' });
        }
    }
    else {
        // In-memory fallback
        const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        const newUser = {
            id: 'usr-' + Date.now().toString(),
            email: email.toLowerCase(),
            passwordHash: hashedPass,
            role: userRole
        };
        db.users.push(newUser);
        saveDatastore();
        return res.status(201).json({ success: true, message: 'User registered successfully' });
    }
});
// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    const email = req.body?.data?.email || req.body?.email;
    const password = req.body?.data?.password || req.body?.password;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password fields required' });
    }
    let dbUser;
    if (pool) {
        try {
            const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
            dbUser = rows[0];
            if (dbUser) {
                dbUser = {
                    id: dbUser.id.toString(),
                    email: dbUser.email,
                    passwordHash: dbUser.password_hash,
                    role: dbUser.role
                };
            }
        }
        catch (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
    }
    else {
        dbUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }
    if (!dbUser) {
        return res.status(401).json({ success: false, message: 'Incorrect email or password combination' });
    }
    const passwordMatch = bcryptjs_1.default.compareSync(password, dbUser.passwordHash);
    if (!passwordMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect email or password combination' });
    }
    const accessToken = jsonwebtoken_1.default.sign({ id: dbUser.id, email: dbUser.email, role: dbUser.role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = 'ref-' + Math.random().toString(36).substr(2, 9);
    if (!db.sessions)
        db.sessions = [];
    db.sessions.push({
        id: 'sess-' + Math.random().toString(36).substr(2, 9),
        userId: dbUser.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        createdAt: new Date().toISOString()
    });
    saveDatastore();
    res.json({
        success: true,
        accessToken,
        refreshToken,
        user: {
            id: dbUser.id,
            email: dbUser.email,
            role: dbUser.role
        }
    });
});
// POST /api/auth/refresh
app.post('/api/auth/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            jsonwebtoken_1.default.verify(token, JWT_SECRET, { ignoreExpiration: true }, (err, decoded) => {
                if (err || !decoded) {
                    return res.status(403).json({ message: 'Unrefreshable' });
                }
                const newToken = jsonwebtoken_1.default.sign({ id: decoded.id, email: decoded.email, role: decoded.role }, JWT_SECRET, { expiresIn: '15m' });
                return res.json({ accessToken: newToken });
            });
            return;
        }
        return res.status(401).json({ message: 'Refresh token required' });
    }
    if (!db.sessions)
        db.sessions = [];
    const session = db.sessions.find(s => s.refreshToken === refreshToken);
    if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
        return res.status(401).json({ message: 'Session expired or invalid. Please login again.' });
    }
    let user;
    if (pool) {
        try {
            const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [session.userId]);
            user = rows[0];
        }
        catch {
            return res.status(500).json({ message: 'Database error' });
        }
    }
    else {
        user = db.users.find(u => u.id === session.userId);
    }
    if (!user) {
        return res.status(401).json({ message: 'Associated account not found.' });
    }
    const accessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ accessToken });
});
// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken && db.sessions) {
        db.sessions = db.sessions.filter(s => s.refreshToken !== refreshToken);
        saveDatastore();
    }
    res.json({ message: 'Logged out successfully' });
});
// GET /api/dynamic/marketplace
app.get('/api/dynamic/marketplace', optionalAuth, (req, res) => {
    let filtered = db.products || [];
    const { category, search } = req.query;
    if (category && category !== 'All') {
        filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
        filtered = filtered.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));
    }
    res.json({ success: true, data: filtered });
});
// GET /api/marketplace-items
app.get('/api/admin/marketplace-items', optionalAuth, (req, res) => {
    res.json({ success: true, data: db.products || [] });
});
// GET /api/marketplace-items/:id
app.get('/api/marketplace-items/:id', optionalAuth, (req, res) => {
    const item = db.products.find(p => p.id === req.params.id);
    if (item) {
        res.json(item);
    }
    else {
        res.status(404).json({ message: 'Product preview layout not found.' });
    }
});
// POST /api/dynamic/orders (Requires Authenticated)
app.post('/api/dynamic/orders', requireAuth, (req, res) => {
    const { productId, amount } = req.body;
    const newOrder = {
        id: 'ord-' + Math.random().toString(36).substr(2, 9),
        userId: req.user.id,
        productId,
        amount: Number(amount) || 0,
        status: 'completed',
        createdAt: new Date().toISOString()
    };
    if (!db.purchases)
        db.purchases = [];
    db.purchases.push(newOrder);
    saveDatastore();
    res.status(201).json(newOrder);
});
// GET /api/dynamic/orders (Requires Authenticated)
app.get('/api/dynamic/orders', requireAuth, (req, res) => {
    const orders = (db.purchases || []).filter(o => o.userId === req.user.id);
    res.json(orders);
});
// GET /api/forms
app.get('/api/forms', authenticateToken, (req, res) => {
    let userForms = [];
    if (req.user.role === 'admin') {
        // Admins view all forms across the environment
        userForms = db.forms;
    }
    else {
        // Owners view their specific forms
        userForms = db.forms.filter(f => f.ownerId === req.user.id);
    }
    // Inject real submissions counts dynamically
    const enriched = userForms.map(f => {
        const subsCount = db.responses.filter(r => r.formId === f.id).length;
        return { ...f, submissionsCount: subsCount };
    });
    res.json(enriched);
});
// POST /api/forms
app.post('/api/forms', authenticateToken, (req, res) => {
    const { name, description, fields, isActive } = req.body;
    if (!name || !fields || !Array.isArray(fields)) {
        return res.status(400).json({ message: 'Invalid payload: Name and fields are required.' });
    }
    const newForm = {
        id: 'frm-' + Math.random().toString(36).substr(2, 9),
        name,
        description: description || '',
        fields,
        ownerId: req.user.id,
        isActive: isActive !== undefined ? isActive : true
    };
    db.forms.push(newForm);
    saveDatastore();
    res.status(201).json(newForm);
});
// GET /api/forms/:id (Public route)
app.get('/api/forms/:id', (req, res) => {
    const form = db.forms.find(f => f.id === req.params.id);
    if (!form) {
        return res.status(404).json({ message: 'Dynamics form schema not found' });
    }
    res.json(form);
});
// DELETE /api/forms/:id
app.delete('/api/forms/:id', authenticateToken, (req, res) => {
    const formIndex = db.forms.findIndex(f => f.id === req.params.id);
    if (formIndex === -1) {
        return res.status(404).json({ message: 'Form not found' });
    }
    const form = db.forms[formIndex];
    if (req.user.role !== 'admin' && form.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied: You are not the form owner.' });
    }
    db.forms.splice(formIndex, 1);
    // Clear associated submissions too
    db.responses = db.responses.filter(r => r.formId !== req.params.id);
    saveDatastore();
    res.json({ message: 'Form and all its associated collected leads deleted successfully.' });
});
// POST /api/forms/:id/submit (Public submit responses)
app.post('/api/forms/:id/submit', (req, res) => {
    const { responses } = req.body;
    const formId = req.params.id;
    const form = db.forms.find(f => f.id === formId);
    if (!form) {
        return res.status(404).json({ message: 'Form does not exist' });
    }
    if (!form.isActive) {
        return res.status(403).json({ message: 'Form submissions are offline or paused by the administrator.' });
    }
    // Server-side dynamic validation
    for (const field of form.fields) {
        const val = responses[field.id];
        if (field.required && (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0))) {
            return res.status(400).json({ message: `Field "${field.label}" is required and cannot be blank.` });
        }
    }
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const device = req.headers['user-agent'] || 'Unknown Crawler';
    const newResponse = {
        id: 'res-' + Math.random().toString(36).substr(2, 9),
        formId,
        responses,
        submittedAt: new Date().toISOString(),
        metadata: {
            ip: typeof ip === 'string' ? ip.replace('::ffff:', '') : '127.0.0.1',
            device: device.length > 80 ? device.substring(0, 80) + '...' : device
        }
    };
    db.responses.push(newResponse);
    saveDatastore();
    res.status(201).json({ message: 'Response submitted successfully!', id: newResponse.id });
});
// GET /api/forms/:id/responses (Owner view CRM)
app.get('/api/forms/:id/responses', authenticateToken, (req, res) => {
    const formId = req.params.id;
    const form = db.forms.find(f => f.id === formId);
    if (!form) {
        return res.status(404).json({ message: 'Form not found' });
    }
    if (req.user.role !== 'admin' && form.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied: Unauthorized ownership' });
    }
    const records = db.responses.filter(r => r.formId === formId);
    // Sort responses by newest submitted date
    records.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    res.json(records);
});
// GET /api/forms/:id/analytics (Performance reporting)
app.get('/api/forms/:id/analytics', authenticateToken, (req, res) => {
    const formId = req.params.id;
    const form = db.forms.find(f => f.id === formId);
    if (!form) {
        return res.status(404).json({ message: 'Form not found' });
    }
    if (req.user.role !== 'admin' && form.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const responses = db.responses.filter(r => r.formId === formId);
    // 1. Total Submissions count
    const totalSubmissions = responses.length;
    // 2. Submissions grouped per day (over active range or last 10 days)
    const submissionsPerDayMap = {};
    // Seed last 10 days with 0 counts to guarantee a nice timeline shape
    const now = new Date();
    for (let i = 9; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        submissionsPerDayMap[dateStr] = 0;
    }
    responses.forEach(r => {
        const dateStr = r.submittedAt.split('T')[0];
        if (submissionsPerDayMap[dateStr] !== undefined) {
            submissionsPerDayMap[dateStr]++;
        }
        else {
            // Out of standard 10 days range, but let's record it anyway
            submissionsPerDayMap[dateStr] = 1;
        }
    });
    const submissionsPerDay = Object.keys(submissionsPerDayMap).map(key => ({
        date: key,
        count: submissionsPerDayMap[key]
    })).sort((a, b) => a.date.localeCompare(b.date));
    // 3. Field-wise choice option distribution (for Dropdown, Radio, Checkboxes)
    const fieldStats = {};
    form.fields.forEach(field => {
        if (['dropdown', 'radio', 'checkbox'].includes(field.type)) {
            fieldStats[field.id] = {};
            // Seed options with 0
            if (field.options) {
                field.options.forEach(opt => {
                    fieldStats[field.id][opt] = 0;
                });
            }
        }
    });
    responses.forEach(r => {
        form.fields.forEach(field => {
            if (['dropdown', 'radio', 'checkbox'].includes(field.type)) {
                const value = r.responses[field.id];
                if (value) {
                    if (Array.isArray(value)) {
                        // Checkbox multi selection options
                        value.forEach(opt => {
                            if (fieldStats[field.id][opt] !== undefined) {
                                fieldStats[field.id][opt]++;
                            }
                        });
                    }
                    else {
                        // Radio, Dropdown single choice strings
                        if (fieldStats[field.id][value] !== undefined) {
                            fieldStats[field.id][value]++;
                        }
                    }
                }
            }
        });
    });
    res.json({
        totalSubmissions,
        submissionsPerDay,
        fieldStats
    });
});
// ----------------------------------------------------
// STATIC SPA ROUTING CATCHALL
// ----------------------------------------------------
// const distPath = path_1.default.join(__dirname, '../dist');
// // Serve static build from dist folder
// app.use(express_1.default.static(distPath));
// Fallback all other client-side routing to index.html to allow SPA working cleanly
// app.get('*', (req, res) => {
//     const indexPath = path_1.default.join(distPath, 'index.html');
//     if (fs_1.default.existsSync(indexPath)) {
//         res.sendFile(indexPath);
//     }
//     else {
//         // Fallback message while building
//         res.status(200).send('<h2>Deploying system assets, please reload in a moment...</h2>');
//     }
// });
// Run Backend Express App
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});
