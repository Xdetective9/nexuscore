const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { loadPlugins, reloadPlugin } = require('../middleware/pluginLoader');

// ========== MIDDLEWARE ==========
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.redirect('/admin/login');
};

// ========== ADMIN LOGIN ==========
router.get('/login', (req, res) => {
    if (req.session.user?.role === 'admin') {
        return res.redirect('/admin');
    }
    
    res.render('admin/login', {
        title: 'Admin Login | NexusCore',
        error: null
    });
});

router.post('/login', async (req, res) => {
    try {
        const { password, phone, otp } = req.body;
        
        // Direct password login (for owner)
        if (password === process.env.ADMIN_PASSWORD) {
            req.session.user = {
                id: 'admin',
                name: process.env.OWNER_NAME,
                phone: process.env.OWNER_NUMBER,
                role: 'admin',
                verified: true
            };
            return res.redirect('/admin');
        }
        
        // OTP-based login
        if (phone && otp) {
            const smsService = require('../utils/sms');
            const verification = await smsService.verifyOTP(phone, otp);
            
            if (verification.success && verification.user.role === 'admin') {
                req.session.user = {
                    id: verification.user.id,
                    name: verification.user.name,
                    phone: verification.user.phone,
                    role: 'admin',
                    verified: true
                };
                return res.redirect('/admin');
            }
        }
        
        res.render('admin/login', {
            title: 'Admin Login | NexusCore',
            error: 'Invalid credentials'
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.render('admin/login', {
            title: 'Admin Login | NexusCore',
            error: 'An error occurred'
        });
    }
});

// ========== ADMIN DASHBOARD ==========
router.get('/', isAdmin, async (req, res) => {
    try {
        const db = require('../utils/database').db;
        
        // Get stats
        const [users, plugins, logs, sms] = await Promise.all([
            db.query('SELECT COUNT(*) FROM users'),
            db.query('SELECT COUNT(*) FROM plugins'),
            db.query('SELECT COUNT(*) FROM logs WHERE created_at > NOW() - INTERVAL \'24 hours\''),
            db.query('SELECT COUNT(*) FROM sms_logs WHERE sent_at > NOW() - INTERVAL \'24 hours\'')
        ]);
        
        res.render('admin/dashboard', {
            title: 'Admin Dashboard | NexusCore',
            user: req.session.user,
            stats: {
                totalUsers: parseInt(users.rows[0].count),
                totalPlugins: parseInt(plugins.rows[0].count),
                dailyLogs: parseInt(logs.rows[0].count),
                dailySMS: parseInt(sms.rows[0].count)
            },
            plugins: global.plugins || []
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load dashboard'
        });
    }
});

// ========== PLUGIN MANAGEMENT ==========
router.get('/plugins', isAdmin, (req, res) => {
    res.render('admin/plugins', {
        title: 'Plugin Manager | NexusCore',
        user: req.session.user,
        plugins: global.plugins || []
    });
});

router.get('/plugins/upload', isAdmin, (req, res) => {
    res.render('admin/upload', {
        title: 'Upload Plugin | NexusCore',
        user: req.session.user
    });
});

router.post('/plugins/upload', isAdmin, async (req, res) => {
    try {
        if (!req.files || !req.files.plugin) {
            return res.status(400).json({
                success: false,
                error: 'No plugin file uploaded'
            });
        }

        const pluginFile = req.files.plugin;
        const pluginDir = path.join(__dirname, '../plugins');
        
        // Validate file extension
        if (!pluginFile.name.endsWith('.plugin.js')) {
            return res.json({
                success: false,
                error: 'File must be a .plugin.js file'
            });
        }

        // Save file
        const filePath = path.join(pluginDir, pluginFile.name);
        await pluginFile.mv(filePath);
        
        // Load plugin
        await reloadPlugin(path.basename(filePath, '.plugin.js'));
        
        // Save to database
        const db = require('../utils/database').db;
        await db.query(
            `INSERT INTO plugins (name, enabled) 
             VALUES ($1, $2) 
             ON CONFLICT (name) 
             DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
            [path.basename(filePath, '.plugin.js'), true]
        );
        
        // Emit socket event
        if (global.io) {
            global.io.emit('plugin_uploaded', {
                name: pluginFile.name,
                timestamp: new Date(),
                uploadedBy: req.session.user.name
            });
        }
        
        res.json({
            success: true,
            message: 'Plugin uploaded successfully',
            plugin: pluginFile.name
        });
    } catch (error) {
        console.error('Plugin upload error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// ========== PLUGIN TOGGLE ==========
router.post('/plugins/:pluginId/toggle', isAdmin, async (req, res) => {
    try {
        const { pluginId } = req.params;
        const { enabled } = req.body;
        
        const db = require('../utils/database').db;
        
        await db.query(
            'UPDATE plugins SET enabled = $1, updated_at = CURRENT_TIMESTAMP WHERE name = $2',
            [enabled === 'true', pluginId]
        );
        
        res.json({
            success: true,
            message: `Plugin ${enabled === 'true' ? 'enabled' : 'disabled'}`
        });
    } catch (error) {
        console.error('Plugin toggle error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// ========== PLUGIN DELETE ==========
router.delete('/plugins/:pluginId', isAdmin, async (req, res) => {
    try {
        const { pluginId } = req.params;
        const pluginDir = path.join(__dirname, '../plugins');
        const filePath = path.join(pluginDir, `${pluginId}.plugin.js`);
        
        // Remove file
        await fs.unlink(filePath).catch(() => {});
        
        // Remove from database
        const db = require('../utils/database').db;
        await db.query('DELETE FROM plugins WHERE name = $1', [pluginId]);
        
        // Remove from memory
        const pluginIndex = global.plugins.findIndex(p => p.id === pluginId);
        if (pluginIndex !== -1) {
            global.plugins.splice(pluginIndex, 1);
        }
        
        res.json({
            success: true,
            message: 'Plugin deleted successfully'
        });
    } catch (error) {
        console.error('Plugin delete error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// ========== USER MANAGEMENT ==========
router.get('/users', isAdmin, async (req, res) => {
    try {
        const db = require('../utils/database').db;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;
        
        const [users, total] = await Promise.all([
            db.query(
                'SELECT id, phone, email, name, role, verified, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            ),
            db.query('SELECT COUNT(*) FROM users')
        ]);
        
        res.render('admin/users', {
            title: 'User Management | NexusCore',
            user: req.session.user,
            users: users.rows,
            pagination: {
                page,
                limit,
                total: parseInt(total.rows[0].count),
                pages: Math.ceil(parseInt(total.rows[0].count) / limit)
            }
        });
    } catch (error) {
        console.error('User management error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load users'
        });
    }
});

// ========== SMS LOGS ==========
router.get('/sms-logs', isAdmin, async (req, res) => {
    try {
        const db = require('../utils/database').db;
        const logs = await db.query(
            'SELECT * FROM sms_logs ORDER BY sent_at DESC LIMIT 100'
        );
        
        res.render('admin/sms-logs', {
            title: 'SMS Logs | NexusCore',
            user: req.session.user,
            logs: logs.rows
        });
    } catch (error) {
        console.error('SMS logs error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load SMS logs'
        });
    }
});

// ========== SYSTEM LOGS ==========
router.get('/system-logs', isAdmin, async (req, res) => {
    try {
        const db = require('../utils/database').db;
        const logs = await db.query(
            'SELECT * FROM logs ORDER BY created_at DESC LIMIT 100'
        );
        
        res.render('admin/system-logs', {
            title: 'System Logs | NexusCore',
            user: req.session.user,
            logs: logs.rows
        });
    } catch (error) {
        console.error('System logs error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load system logs'
        });
    }
});

// ========== SETTINGS ==========
router.get('/settings', isAdmin, (req, res) => {
    res.render('admin/settings', {
        title: 'Settings | NexusCore',
        user: req.session.user,
        env: process.env
    });
});

router.post('/settings', isAdmin, async (req, res) => {
    try {
        const { setting, value } = req.body;
        
        // In production, you'd want to update a settings table or .env file
        console.log(`Setting updated: ${setting} = ${value}`);
        
        res.json({
            success: true,
            message: 'Setting updated'
        });
    } catch (error) {
        console.error('Settings update error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
