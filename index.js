const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// ========== MIDDLEWARE ==========
app.use(helmet());
app.use(cors());
app.use(morgan('tiny'));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
});
app.use(limiter);

// ========== SESSION ==========
const sessionStore = new (require('connect-pg-simple')(session))({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
    }
}));

// ========== VIEW ENGINE ==========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ========== STATIC FILES ==========
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== ROUTES ==========

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date(),
        uptime: process.uptime()
    });
});

// Home page
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Home | NexusCore',
        ownerName: process.env.OWNER_NAME || 'Abdullah',
        ownerNumber: process.env.OWNER_NUMBER || '+923288055104'
    });
});

// Admin login
app.get('/admin/login', (req, res) => {
    res.render('admin/login', {
        title: 'Admin Login | NexusCore'
    });
});

app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        req.session.user = {
            id: 'admin',
            name: process.env.OWNER_NAME,
            role: 'admin'
        };
        return res.redirect('/admin');
    }
    res.render('admin/login', {
        title: 'Admin Login | NexusCore',
        error: 'Incorrect password'
    });
});

// Admin dashboard
app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/admin/login');
    }
    res.render('admin/dashboard', {
        title: 'Admin Dashboard | NexusCore',
        user: req.session.user
    });
});

// Plugins page
app.get('/plugins', (req, res) => {
    res.render('plugins/index', {
        title: 'Plugins | NexusCore',
        plugins: [] // Empty for now
    });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║         🚀 NexusCore Started           ║
╠══════════════════════════════════════════╣
║ 📍 Port: ${PORT}                        ║
║ 🌐 URL: https://your-site.onrender.com  ║
║ ⚡ Environment: ${process.env.NODE_ENV || 'production'} ║
╠══════════════════════════════════════════╣
║         ✅ ALL SYSTEMS GO              ║
╚══════════════════════════════════════════╝
    
👤 Owner: ${process.env.OWNER_NAME || 'Abdullah'}
📞 Contact: ${process.env.OWNER_NUMBER || '+923288055104'}
📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}
🔐 Admin: /admin/login
🧩 Plugins: /plugins
🏥 Health: /health
    `);
});
