// NexusCore Plugin Template
// Save this as: plugins/example.plugin.js

module.exports = {
    // ========== PLUGIN METADATA ==========
    name: 'Example Plugin',
    version: '1.0.0',
    author: 'NexusCore Team',
    description: 'An example plugin demonstrating NexusCore plugin system',
    category: 'utility',
    
    // ========== PLUGIN CONFIGURATION ==========
    config: {
        enabled: true,
        autoLoad: true,
        permissions: ['user', 'admin']
    },
    
    // ========== INITIALIZATION ==========
    init: async function(app, io, db) {
        console.log('🔌 Example Plugin initialized');
        
        // Register routes
        this.registerRoutes(app);
        
        // Register socket events
        this.registerSocketEvents(io);
        
        // Create database tables if needed
        await this.createTables(db);
        
        return { success: true, message: 'Plugin initialized' };
    },
    
    // ========== ROUTES ==========
    routes: [
        {
            method: 'GET',
            path: '/example',
            handler: async (req, res) => {
                try {
                    res.json({
                        success: true,
                        message: 'Hello from Example Plugin!',
                        timestamp: new Date(),
                        user: req.session.user
                    });
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            },
            middleware: ['auth'] // Optional middleware
        },
        {
            method: 'POST',
            path: '/example/echo',
            handler: async (req, res) => {
                try {
                    const { message } = req.body;
                    res.json({
                        success: true,
                        echoed: message,
                        processedAt: new Date()
                    });
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        }
    ],
    
    // ========== SOCKET EVENTS ==========
    socketEvents: {
        'example:message': function(data, socket) {
            console.log('📨 Example message received:', data);
            socket.emit('example:response', {
                received: data,
                timestamp: new Date()
            });
        }
    },
    
    // ========== HELPER METHODS ==========
    registerRoutes: function(app) {
        this.routes.forEach(route => {
            const handler = async (req, res) => {
                // Apply middleware if specified
                if (route.middleware) {
                    for (const mw of route.middleware) {
                        if (mw === 'auth' && !req.session.user) {
                            return res.status(401).json({
                                success: false,
                                error: 'Authentication required'
                            });
                        }
                    }
                }
                
                await route.handler(req, res);
            };
            
            app[route.method.toLowerCase()](`/api/plugins/example${route.path}`, handler);
        });
    },
    
    registerSocketEvents: function(io) {
        io.on('connection', (socket) => {
            Object.entries(this.socketEvents).forEach(([event, handler]) => {
                socket.on(event, (data) => handler(data, socket));
            });
        });
    },
    
    createTables: async function(db) {
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS example_logs (
                    id SERIAL PRIMARY KEY,
                    message TEXT,
                    data JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Example plugin tables created');
        } catch (error) {
            console.error('❌ Failed to create example tables:', error);
        }
    },
    
    // ========== ADMIN PANEL INTEGRATION ==========
    admin: {
        path: '/admin/plugins/example',
        name: 'Example Plugin',
        icon: '🛠️',
        component: `
            <div class="card">
                <h3>Example Plugin Admin</h3>
                <p>This is the admin panel for the example plugin.</p>
                <button onclick="alert('Hello from example plugin!')" class="btn btn-primary">
                    Test Plugin
                </button>
            </div>
        `
    },
    
    // ========== FRONTEND INTEGRATION ==========
    frontend: {
        css: `
            .example-plugin-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: var(--radius);
                padding: 1.5rem;
                margin: 1rem 0;
                color: white;
            }
        `,
        js: `
            document.addEventListener('DOMContentLoaded', function() {
                // Example plugin frontend code
                console.log('Example Plugin frontend loaded');
                
                // Add example card to plugins page
                const pluginsContainer = document.querySelector('.plugins-container');
                if (pluginsContainer) {
                    const exampleCard = document.createElement('div');
                    exampleCard.className = 'example-plugin-card';
                    exampleCard.innerHTML = \`
                        <h4>🎯 Example Plugin</h4>
                        <p>This is an example plugin card added dynamically.</p>
                        <button onclick="alert('Example Plugin Action!')" class="btn btn-secondary">
                            Test Action
                        </button>
                    \`;
                    pluginsContainer.appendChild(exampleCard);
                }
            });
        `
    },
    
    // ========== CRON JOBS ==========
    cronJobs: [
        {
            schedule: '0 */6 * * *', // Every 6 hours
            task: async function() {
                console.log('🕒 Example plugin cron job running');
                // Perform scheduled tasks
            }
        }
    ],
    
    // ========== UNINSTALL ==========
    uninstall: async function() {
        console.log('🗑️ Example plugin uninstalled');
        // Clean up resources
    }
};
