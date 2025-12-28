const express = require('express');
const router = express.Router();

// ========== HOME ROUTE ==========
router.get('/', (req, res) => {
    res.render('index', {
        title: 'Home | NexusCore',
        ownerName: process.env.OWNER_NAME || 'Abdullah',
        ownerNumber: process.env.OWNER_NUMBER || '+923288055104',
        user: req.session.user
    });
});

// ========== HEALTH CHECK ==========
router.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date(),
        uptime: process.uptime(),
        version: '2.0.0'
    });
});

// ========== DASHBOARD ==========
router.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    res.render('dashboard', {
        title: 'Dashboard | NexusCore',
        user: req.session.user
    });
});

// ========== ABOUT ==========
router.get('/about', (req, res) => {
    res.render('about', {
        title: 'About | NexusCore',
        ownerName: process.env.OWNER_NAME || 'Abdullah',
        ownerNumber: process.env.OWNER_NUMBER || '+923288055104'
    });
});

// ========== CONTACT ==========
router.get('/contact', (req, res) => {
    res.render('contact', {
        title: 'Contact | NexusCore',
        ownerName: process.env.OWNER_NAME || 'Abdullah',
        ownerNumber: process.env.OWNER_NUMBER || '+923288055104'
    });
});

// ========== FEATURES ==========
router.get('/features', (req, res) => {
    res.render('features', {
        title: 'Features | NexusCore',
        plugins: global.plugins || []
    });
});

// ========== 404 PAGE ==========
router.get('/404', (req, res) => {
    res.render('404', {
        title: '404 - Page Not Found',
        message: 'The page you are looking for does not exist.'
    });
});

// ========== ERROR PAGE ==========
router.get('/error', (req, res) => {
    res.render('error', {
        title: 'Error',
        message: 'Something went wrong!'
    });
});

module.exports = router;
