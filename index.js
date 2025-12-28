const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
require('dotenv').config();

// ========== INITIALIZE APP ==========
const app = express();
const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

// ========== DATABASE CONNECTION ==========
const { initDatabase, db } = require('./utils/database');

// ========== SOCKET.IO SETUP ==========
const { createServer } = require('http');
const { Server } = require('socket.io');
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ========== GLOBAL VARIABLES ==========
global.plugins = [];
global.io = io;
global.db = db;

// ========== MIDDLEWARE ==========
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    }
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
    limits: { fileSize: 50 * 1024 * 1024 },
    safeFileNames: true,
    preserveExtension: true
}));

// ========== SESSION CONFIGURATION ==========
const sessionStore = new (require('connect-pg-simple')(session))({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    tableName: 'user_sessions'
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-64-character-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'strict'
    },
    name: 'nexuscore.sid'
}));

// ========== RATE LIMITING ==========
const { rateLimiterMiddleware } = require('./middleware/rateLimiter');
app.use(rateLimiterMiddleware);

// ========== VIEW ENGINE ==========
app.set('view engine', 'ejs');
app.set('views', [
    path.join(__dirname, 'views'),
    path.join(__dirname, 'plugins/views')
]);

// ========== STATIC FILES ==========
app.use('/static', express.static(path.join(__dirname, 'public'), {
    maxAge: '1y',
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// ========== PLUGIN LOADER ==========
const { loadPlugins, loadPluginRoutes } = require('./middleware/pluginLoader');
app.use((req, res, next) => {
    res.locals.plugins = global.plugins;
    res.locals.user = req.session.user;
    next();
});

// ========== ROUTES ==========
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const pluginRoutes = require('./routes/plugins');
const apiRoutes = require('./routes/api');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/plugins', pluginRoutes);
app.use('/api/v1', apiRoutes);

// ========== ERROR HANDLING ==========
app.use((req, res) => {
    res.status(404).render('404', {
        title: '404 - Page Not Found',
        message: 'The page you are looking for does not exist.'
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(err.status || 500).render('error', {
        title: 'Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
});

// ========== SOCKET.IO EVENTS ==========
io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);
    
    socket.on('plugin_upload', (data) => {
        socket.broadcast.emit('plugin_update', data);
    });
    
    socket.on('admin_notification', (data) => {
        socket.to('admin-room').emit('notification', data);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// ========== INITIALIZE AND START ==========
async function startServer() {
    try {
        await initDatabase();
        console.log('✅ Database initialized');
        
        await loadPlugins();
        console.log('✅ Plugins loaded');
        
        server.listen(PORT, HOST, () => {
            console.log(`
╔══════════════════════════════════════════════════════════╗
║              🚀 NEXUSCORE v2.0 STARTED                  ║
╠══════════════════════════════════════════════════════════╣
║ 📍 Host: ${HOST}:${PORT}                                ║
║ 🌐 URL: http://${HOST}:${PORT}                          ║
║ ⚡ Environment: ${process.env.NODE_ENV || 'development'} ║
║ 🔌 Plugins Loaded: ${global.plugins.length}             ║
╠══════════════════════════════════════════════════════════╣
║              ✅ ALL SYSTEMS OPERATIONAL                 ║
╚══════════════════════════════════════════════════════════╝

👤 Owner: ${process.env.OWNER_NAME || 'Abdullah'}
📞 Contact: ${process.env.OWNER_NUMBER || '+923288055104'}
🔐 Admin Panel: /admin/login
🔑 Default Password: ${process.env.ADMIN_PASSWORD || 'Rana0986'}
🧩 Plugins Directory: /plugins
📱 SMS Auth: Enabled
🤖 WhatsApp Bot: Ready
📊 Database: Connected
🛡️ Security: Active
            `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = { app, server, io };
