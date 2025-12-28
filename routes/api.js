const express = require('express');
const router = express.Router();

// ========== API HEALTH ==========
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        apiVersion: '1.0.0',
        timestamp: new Date(),
        uptime: process.uptime()
    });
});

// ========== USER INFO ==========
router.get('/user', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authenticated'
        });
    }
    
    res.json({
        success: true,
        user: {
            id: req.session.user.id,
            name: req.session.user.name,
            phone: req.session.user.phone,
            role: req.session.user.role,
            verified: req.session.user.verified
        }
    });
});

// ========== SYSTEM INFO ==========
router.get('/system', (req, res) => {
    const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        pluginsLoaded: global.plugins?.length || 0
    };
    
    res.json({
        success: true,
        system: systemInfo
    });
});

// ========== PLUGINS API ==========
router.get('/plugins', (req, res) => {
    const plugins = global.plugins?.map(p => ({
        id: p.id,
        name: p.name,
        version: p.version,
        description: p.description,
        enabled: p.enabled
    })) || [];
    
    res.json({
        success: true,
        plugins,
        count: plugins.length
    });
});

// ========== SMS TEST ==========
router.post('/sms/test', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }
        
        const smsService = require('../utils/sms');
        const result = await smsService.generateAndSendOTP(phone);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== ECHO (Test endpoint) ==========
router.post('/echo', (req, res) => {
    const { message } = req.body;
    
    res.json({
        success: true,
        echoed: message,
        timestamp: new Date(),
        receivedBy: 'NexusCore API'
    });
});

module.exports = router;
