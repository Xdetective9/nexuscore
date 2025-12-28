// WhatsApp Bot Plugin
// Save as: plugins/whatsappbot.plugin.js

module.exports = {
    // ========== PLUGIN METADATA ==========
    name: 'WhatsApp Bot',
    version: '1.0.0',
    author: 'NexusCore Team',
    description: 'Automated WhatsApp messaging bot with AI responses',
    icon: '🤖',
    category: 'bots',
    
    // ========== CONFIGURATION ==========
    config: {
        enabled: true,
        autoStart: true,
        sessionPath: './whatsapp-sessions/',
        greetingMessage: 'Hello! I am NexusCore WhatsApp Bot 🤖\nHow can I help you today?'
    },
    
    // ========== INITIALIZATION ==========
    init: async function(app, io, db) {
        console.log('🤖 WhatsApp Bot Plugin initialized');
        
        // Register routes
        this.registerRoutes(app);
        
        // Initialize WhatsApp client (will be loaded when needed)
        this.whatsappClient = null;
        this.isConnected = false;
        
        return { 
            success: true, 
            message: 'WhatsApp Bot plugin loaded successfully',
            endpoints: ['/api/plugins/whatsappbot/*']
        };
    },
    
    // ========== ROUTES ==========
    routes: [
        {
            method: 'GET',
            path: '/status',
            handler: async (req, res) => {
                try {
                    res.json({
                        success: true,
                        plugin: 'WhatsApp Bot',
                        version: this.version,
                        connected: this.isConnected,
                        config: this.config
                    });
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        },
        {
            method: 'POST',
            path: '/start',
            handler: async (req, res) => {
                try {
                    if (this.isConnected) {
                        return res.json({
                            success: true,
                            message: 'WhatsApp bot is already connected'
                        });
                    }
                    
                    // In a real implementation, this would start the WhatsApp client
                    this.isConnected = true;
                    
                    res.json({
                        success: true,
                        message: 'WhatsApp bot started successfully',
                        qrRequired: false // Set to true if QR needs to be scanned
                    });
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        },
        {
            method: 'POST',
            path: '/send',
            handler: async (req, res) => {
                try {
                    const { to, message } = req.body;
                    
                    if (!to || !message) {
                        return res.status(400).json({
                            success: false,
                            error: 'Phone number and message are required'
                        });
                    }
                    
                    // Simulate sending message
                    console.log(`📱 WhatsApp message to ${to}: ${message}`);
                    
                    // In real implementation:
                    // await this.whatsappClient.sendMessage(to, message);
                    
                    res.json({
                        success: true,
                        message: 'Message sent successfully',
                        to: to,
                        text: message,
                        timestamp: new Date()
                    });
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        },
        {
            method: 'GET',
            path: '/qr',
            handler: async (req, res) => {
                try {
                    // Generate QR code for WhatsApp Web
                    res.json({
                        success: true,
                        qrCode: 'data:image/png;base64,...', // Base64 QR code
                        message: 'Scan this QR code with WhatsApp'
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
    
    // ========== HELPER METHODS ==========
    registerRoutes: function(app) {
        this.routes.forEach(route => {
            const fullPath = `/api/plugins/whatsappbot${route.path}`;
            app[route.method.toLowerCase()](fullPath, route.handler.bind(this));
        });
    },
    
    // ========== ADMIN PANEL ==========
    admin: {
        path: '/admin/plugins/whatsappbot',
        name: 'WhatsApp Bot',
        icon: '🤖',
        component: `
            <div class="card">
                <h3>🤖 WhatsApp Bot Control Panel</h3>
                
                <div style="margin: 1rem 0;">
                    <p><strong>Status:</strong> 
                        <span id="botStatus" style="color: #10b981;">● Connected</span>
                    </p>
                    <p><strong>Version:</strong> 1.0.0</p>
                    <p><strong>Session:</strong> Active</p>
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button onclick="startWhatsAppBot()" class="btn btn-primary">
                        ▶️ Start Bot
                    </button>
                    <button onclick="getQRCode()" class="btn btn-secondary">
                        📱 Get QR Code
                    </button>
                    <button onclick="testMessage()" class="btn btn-secondary">
                        📤 Test Message
                    </button>
                </div>
                
                <div id="botResponse" style="margin-top: 1rem;"></div>
                
                <script>
                    function startWhatsAppBot() {
                        fetch('/api/plugins/whatsappbot/start', { method: 'POST' })
                            .then(res => res.json())
                            .then(data => {
                                document.getElementById('botResponse').innerHTML = 
                                    '<div style="color: #10b981; padding: 0.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 4px;">' +
                                    data.message + '</div>';
                            });
                    }
                    
                    function getQRCode() {
                        fetch('/api/plugins/whatsappbot/qr')
                            .then(res => res.json())
                            .then(data => {
                                if (data.success) {
                                    document.getElementById('botResponse').innerHTML = 
                                        '<div style="padding: 1rem; text-align: center;">' +
                                        '<p>Scan QR with WhatsApp:</p>' +
                                        '<img src="' + data.qrCode + '" style="max-width: 200px; margin: 1rem auto;">' +
                                        '</div>';
                                }
                            });
                    }
                    
                    function testMessage() {
                        const phone = prompt('Enter phone number (with country code):', '+923288055104');
                        if (phone) {
                            fetch('/api/plugins/whatsappbot/send', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    to: phone,
                                    message: 'Hello from NexusCore WhatsApp Bot! 🚀'
                                })
                            })
                            .then(res => res.json())
                            .then(data => {
                                document.getElementById('botResponse').innerHTML = 
                                    '<div style="color: #10b981; padding: 0.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 4px;">' +
                                    'Message sent: ' + data.text + '</div>';
                            });
                        }
                    }
                </script>
            </div>
        `
    },
    
    // ========== FRONTEND INTEGRATION ==========
    frontend: {
        css: `
            .whatsapp-bot-card {
                background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                color: white;
                border-radius: var(--radius);
                padding: 1.5rem;
                margin: 1rem 0;
            }
            
            .whatsapp-bot-card h4 {
                color: white;
                margin-bottom: 0.5rem;
            }
        `,
        js: `
            document.addEventListener('DOMContentLoaded', function() {
                // Add WhatsApp bot card to plugins page
                const pluginsContainer = document.querySelector('.plugins-container');
                if (pluginsContainer) {
                    const whatsappCard = document.createElement('div');
                    whatsappCard.className = 'whatsapp-bot-card';
                    whatsappCard.innerHTML = \`
                        <h4>🤖 WhatsApp Bot</h4>
                        <p>Send automated messages, AI responses, and more!</p>
                        <button onclick="startWhatsAppBot()" class="btn" style="background: white; color: #25D366; margin-top: 0.5rem;">
                            Start Bot
                        </button>
                    \`;
                    pluginsContainer.appendChild(whatsappCard);
                }
                
                // Add to features page
                const featuresContainer = document.querySelector('.features-grid');
                if (featuresContainer) {
                    const whatsappFeature = document.createElement('div');
                    whatsappFeature.className = 'feature-card';
                    whatsappFeature.innerHTML = \`
                        <div class="feature-icon">🤖</div>
                        <h3>WhatsApp Bot</h3>
                        <p>Automated WhatsApp messaging with AI responses</p>
                        <a href="/plugins" class="btn btn-sm btn-primary" style="margin-top: 0.5rem;">
                            Get Started
                        </a>
                    \`;
                    featuresContainer.appendChild(whatsappFeature);
                }
            });
            
            function startWhatsAppBot() {
                fetch('/api/plugins/whatsappbot/start', { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                        alert(data.message);
                    });
            }
        `
    },
    
    // ========== UNINSTALL ==========
    uninstall: async function() {
        console.log('🗑️ WhatsApp Bot plugin uninstalled');
        // Clean up sessions, etc.
    }
};
