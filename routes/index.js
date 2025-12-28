const express = require('express');
const router = express.Router();
const path = require('path');

// Home page
router.get('/', (req, res) => {
    res.render('index', {
        title: 'Home | NexusCore',
        ownerName: process.env.OWNER_NAME || 'Abdullah',
        ownerNumber: process.env.OWNER_NUMBER || '+923288055104',
        user: req.session.user
    });
});

// Health check
router.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date(),
        uptime: process.uptime(),
        version: '2.0.0',
        node: process.version
    });
});

// Dashboard
router.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    res.render('dashboard', {
        title: 'Dashboard | NexusCore',
        user: req.session.user
    });
});

// Plugins page
router.get('/plugins', (req, res) => {
    res.render('plugins/index', {
        title: 'Plugins | NexusCore',
        plugins: global.plugins || []
    });
});

// About page
router.get('/about', (req, res) => {
    res.render('about', {
        title: 'About | NexusCore',
        ownerName: process.env.OWNER_NAME,
        ownerNumber: process.env.OWNER_NUMBER
    });
});

// Contact page
router.get('/contact', (req, res) => {
    res.render('contact', {
        title: 'Contact | NexusCore'
    });
});

module.exports = router;
