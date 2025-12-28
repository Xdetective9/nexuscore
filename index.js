const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// ========== MIDDLEWARE ==========
app.use(helmet({
    contentSecurityPolicy: false // Temporarily disable for development
}));
app.use(cors());
app.use(morgan('dev'));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    limits: { fileSize: 50 * 1024 * 1024 }
}));

// ========== SESSION ==========
const sessionStore = new (require('connect-pg-simple')(session))({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'nexuscore-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));

// ========== RATE LIMITING ==========
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
});
app.use(limiter);

// ========== VIEW ENGINE ==========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ========== STATIC FILES ==========
app.use('/static', express.static(path.join(__dirname, 'public')));

// ========== GLOBAL PLUGINS ==========
global.plugins = [];
// ========== PLUGIN LOADER ==========
const fs = require('fs').promises;
const path = require('path');

async function loadPlugins() {
    const pluginDir = path.join(__dirname, 'plugins');
    
    try {
        await fs.access(pluginDir);
    } catch {
        await fs.mkdir(pluginDir, { recursive: true });
        console.log('📁 Created plugins directory');
        return;
    }
    
    const files = await fs.readdir(pluginDir);
    
    for (const file of files) {
        if (file.endsWith('.plugin.js')) {
            try {
                const pluginPath = path.join(pluginDir, file);
                const pluginModule = require(pluginPath);
                
                const plugin = {
                    ...pluginModule,
                    id: file.replace('.plugin.js', ''),
                    file: file,
                    loadedAt: new Date(),
                    enabled: true
                };
                
                // Initialize plugin
                if (typeof plugin.init === 'function') {
                    const initResult = await plugin.init(app, null, null);
                    console.log(`✅ Loaded plugin: ${plugin.name || plugin.id}`, initResult);
                }
                
                global.plugins.push(plugin);
                
            } catch (error) {
                console.error(`❌ Failed to load plugin ${file}:`, error.message);
            }
        }
    }
    
    console.log(`📦 Total plugins loaded: ${global.plugins.length}`);
}

// Load plugins on startup
loadPlugins().catch(console.error);
// ========== ROUTES ==========

// Home
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Home | NexusCore',
        ownerName: process.env.OWNER_NAME || 'Abdullah',
        ownerNumber: process.env.OWNER_NUMBER || '+923288055104',
        user: req.session.user
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date(),
        uptime: process.uptime(),
        version: '2.0.0'
    });
});

// Features
app.get('/features', (req, res) => {
    res.render('features', {
        title: 'Features | NexusCore',
        user: req.session.user,
        plugins: global.plugins || []
    });
});

// Plugins
app.get('/plugins', (req, res) => {
    res.render('plugins/index', {
        title: 'Plugins | NexusCore',
        user: req.session.user,
        plugins: global.plugins || []
    });
});

// ========== AUTH ROUTES ==========
app.get('/auth/login', (req, res) => {
    res.render('auth/login', {
        title: 'Login | NexusCore',
        error: null,
        phone: ''
    });
});

app.post('/auth/login', async (req, res) => {
    const { phone } = req.body;
    
    // Simple demo - always send success
    req.session.loginPhone = phone;
    res.redirect('/auth/verify');
});

app.get('/auth/signup', (req, res) => {
    res.render('auth/signup', {
        title: 'Sign Up | NexusCore',
        error: null,
        phone: ''
    });
});

app.post('/auth/signup', async (req, res) => {
    const { phone, name, email } = req.body;
    
    // Store in session
    req.session.signupData = { phone, name, email };
    req.session.loginPhone = phone;
    
    res.redirect('/auth/verify');
});

app.get('/auth/verify', (req, res) => {
    const phone = req.session.loginPhone || req.session.signupData?.phone;
    
    if (!phone) {
        return res.redirect('/auth/login');
    }
    
    res.render('auth/verify', {
        title: 'Verify OTP | NexusCore',
        phone: phone,
        error: null
    });
});

app.post('/auth/verify', async (req, res) => {
    const { otp } = req.body;
    const phone = req.session.loginPhone || req.session.signupData?.phone;
    
    if (!phone) {
        return res.redirect('/auth/login');
    }
    
    // Demo verification - accept any 6-digit OTP
    if (otp && otp.length === 6 && /^\d+$/.test(otp)) {
        // Get user data
        const userData = req.session.signupData || { phone, name: 'User' };
        
        // Create user session
        req.session.user = {
            id: 'user_' + Date.now(),
            phone: userData.phone,
            name: userData.name || 'User',
            email: userData.email,
            role: phone === process.env.OWNER_NUMBER ? 'admin' : 'user',
            verified: true
        };
        
        // Clear temp data
        delete req.session.loginPhone;
        delete req.session.signupData;
        
        // Redirect based on role
        if (req.session.user.role === 'admin') {
            res.redirect('/admin');
        } else {
            res.redirect('/dashboard');
        }
    } else {
        res.render('auth/verify', {
            title: 'Verify OTP | NexusCore',
            phone: phone,
            error: 'Invalid OTP. Please try again.'
        });
    }
});

app.get('/auth/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ========== DASHBOARD ==========
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    res.render('dashboard', {
        title: 'Dashboard | NexusCore',
        user: req.session.user
    });
});

// ========== ADMIN ROUTES ==========
app.get('/admin/login', (req, res) => {
    if (req.session.user?.role === 'admin') {
        return res.redirect('/admin');
    }
    
    res.render('admin/login', {
        title: 'Admin Login | NexusCore',
        error: null
    });
});

app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    
    if (password === process.env.ADMIN_PASSWORD || password === 'Rana0986') {
        req.session.user = {
            id: 'admin',
            name: process.env.OWNER_NAME || 'Abdullah',
            phone: process.env.OWNER_NUMBER || '+923288055104',
            role: 'admin',
            verified: true
        };
        return res.redirect('/admin');
    }
    
    res.render('admin/login', {
        title: 'Admin Login | NexusCore',
        error: 'Incorrect password'
    });
});

app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/admin/login');
    }
    
    res.render('admin/dashboard', {
        title: 'Admin Dashboard | NexusCore',
        user: req.session.user,
        plugins: global.plugins || [],
        stats: {
            totalUsers: 1,
            totalPlugins: global.plugins.length,
            dailyLogs: 0,
            dailySMS: 0
        }
    });
});

app.get('/admin/plugins', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/admin/login');
    }
    
    res.render('admin/plugins', {
        title: 'Plugin Manager | NexusCore',
        user: req.session.user,
        plugins: global.plugins || []
    });
});

app.get('/admin/plugins/upload', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/admin/login');
    }
    
    res.render('admin/upload', {
        title: 'Upload Plugin | NexusCore',
        user: req.session.user
    });
});

app.post('/admin/plugins/upload', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    try {
        if (!req.files || !req.files.plugin) {
            return res.json({
                success: false,
                error: 'No plugin file uploaded'
            });
        }
        
        const pluginFile = req.files.plugin;
        const pluginName = pluginFile.name.replace('.plugin.js', '');
        
        // Add to global plugins
        const newPlugin = {
            id: pluginName,
            name: pluginName.charAt(0).toUpperCase() + pluginName.slice(1),
            version: '1.0.0',
            author: 'Uploaded by ' + req.session.user.name,
            description: 'Uploaded plugin',
            enabled: true,
            loadedAt: new Date()
        };
        
        global.plugins.push(newPlugin);
        
        res.json({
            success: true,
            message: 'Plugin uploaded successfully',
            plugin: newPlugin
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// ========== API ROUTES ==========
app.get('/api/v1/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date(),
        plugins: global.plugins.length
    });
});

app.get('/api/v1/plugins', (req, res) => {
    res.json({
        success: true,
        plugins: global.plugins,
        count: global.plugins.length
    });
});

// ========== ERROR HANDLING ==========
app.use((req, res) => {
    res.status(404).render('404', {
        title: '404 - Page Not Found',
        message: 'The page you are looking for does not exist.'
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('error', {
        title: 'Error',
        message: 'Something went wrong!'
    });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║         🚀 NexusCore Started           ║
╠══════════════════════════════════════════╣
║ 📍 Port: ${PORT}                        ║
║ 🌐 URL: http://localhost:${PORT}        ║
╠══════════════════════════════════════════╣
║         ✅ ALL SYSTEMS GO              ║
╚══════════════════════════════════════════╝

👤 Owner: ${process.env.OWNER_NAME || 'Abdullah'}
📞 Contact: ${process.env.OWNER_NUMBER || '+923288055104'}
🔐 Admin: /admin/login (Password: Rana0986)
🧩 Plugins: /plugins
📱 Auth: /auth/login
🏥 Health: /health
    `);
});
