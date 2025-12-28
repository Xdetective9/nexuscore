const express = require('express');
const router = express.Router();

// ========== PLUGINS HOME ==========
router.get('/', (req, res) => {
    res.render('plugins/index', {
        title: 'Plugins | NexusCore',
        plugins: global.plugins || [],
        user: req.session.user
    });
});

// ========== PLUGIN DETAIL ==========
router.get('/:pluginId', (req, res) => {
    const { pluginId } = req.params;
    const plugin = global.plugins?.find(p => p.id === pluginId);
    
    if (!plugin) {
        return res.redirect('/plugins');
    }
    
    res.render('plugins/detail', {
        title: `${plugin.name || pluginId} | NexusCore`,
        plugin,
        user: req.session.user
    });
});

// ========== API: GET ALL PLUGINS ==========
router.get('/api/all', (req, res) => {
    try {
        const plugins = global.plugins?.map(p => ({
            id: p.id,
            name: p.name,
            version: p.version,
            description: p.description,
            author: p.author,
            enabled: p.enabled
        })) || [];
        
        res.json({
            success: true,
            plugins,
            count: plugins.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== API: GET PLUGIN INFO ==========
router.get('/api/:pluginId', (req, res) => {
    try {
        const { pluginId } = req.params;
        const plugin = global.plugins?.find(p => p.id === pluginId);
        
        if (!plugin) {
            return res.status(404).json({
                success: false,
                error: 'Plugin not found'
            });
        }
        
        res.json({
            success: true,
            plugin: {
                id: plugin.id,
                name: plugin.name,
                version: plugin.version,
                description: plugin.description,
                author: plugin.author,
                enabled: plugin.enabled,
                loadedAt: plugin.loadedAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
