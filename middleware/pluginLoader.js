const fs = require('fs').promises;
const path = require('path');
const vm = require('vm');

class PluginLoader {
    constructor() {
        this.plugins = [];
        this.pluginRoutes = [];
        this.pluginDir = path.join(__dirname, '../plugins');
        this.viewsDir = path.join(__dirname, '../plugins/views');
    }

    async loadPlugins() {
        try {
            await fs.access(this.pluginDir);
        } catch {
            await fs.mkdir(this.pluginDir, { recursive: true });
        }

        const files = await fs.readdir(this.pluginDir);
        
        for (const file of files) {
            if (file.endsWith('.plugin.js')) {
                await this.loadPlugin(path.join(this.pluginDir, file));
            }
        }
        
        console.log(`✅ Loaded ${this.plugins.length} plugins`);
        global.plugins = this.plugins;
    }

    async loadPlugin(filePath) {
        try {
            const code = await fs.readFile(filePath, 'utf8');
            const pluginName = path.basename(filePath, '.plugin.js');
            
            const sandbox = {
                console,
                require,
                module: { exports: {} },
                __filename: filePath,
                __dirname: path.dirname(filePath),
                process: {
                    ...process,
                    env: { ...process.env }
                }
            };
            
            vm.createContext(sandbox);
            vm.runInContext(code, sandbox);
            
            const plugin = {
                ...sandbox.module.exports,
                id: pluginName,
                file: filePath,
                loadedAt: new Date(),
                enabled: true
            };
            
            this.plugins.push(plugin);
            
            // Load plugin routes if exists
            if (plugin.routes) {
                this.pluginRoutes.push({
                    plugin: pluginName,
                    routes: plugin.routes
                });
            }
            
            // Load plugin views if exists
            if (plugin.views) {
                await this.loadPluginViews(pluginName, plugin.views);
            }
            
            console.log(`📦 Loaded plugin: ${pluginName}`);
            
        } catch (error) {
            console.error(`❌ Failed to load plugin ${filePath}:`, error);
        }
    }

    async loadPluginViews(pluginName, views) {
        try {
            const pluginViewDir = path.join(this.viewsDir, pluginName);
            await fs.mkdir(pluginViewDir, { recursive: true });
            
            for (const [viewName, content] of Object.entries(views)) {
                const viewPath = path.join(pluginViewDir, `${viewName}.ejs`);
                await fs.writeFile(viewPath, content);
            }
        } catch (error) {
            console.error(`❌ Failed to load views for ${pluginName}:`, error);
        }
    }

    async reloadPlugin(pluginId) {
        const pluginIndex = this.plugins.findIndex(p => p.id === pluginId);
        if (pluginIndex !== -1) {
            const plugin = this.plugins[pluginIndex];
            this.plugins.splice(pluginIndex, 1);
            await this.loadPlugin(plugin.file);
            return true;
        }
        return false;
    }

    getPluginRoutes() {
        const routes = [];
        this.pluginRoutes.forEach(pr => {
            pr.routes.forEach(route => {
                routes.push({
                    ...route,
                    plugin: pr.plugin
                });
            });
        });
        return routes;
    }
}

const pluginLoader = new PluginLoader();

module.exports = {
    loadPlugins: () => pluginLoader.loadPlugins(),
    reloadPlugin: (pluginId) => pluginLoader.reloadPlugin(pluginId),
    getPlugins: () => pluginLoader.plugins,
    getPluginRoutes: () => pluginLoader.getPluginRoutes(),
    pluginLoader
};
