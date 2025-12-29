// Background Remover Plugin
// Uses: remove.bg API

module.exports = {
    // ========== PLUGIN METADATA ==========
    name: 'Background Remover',
    version: '1.0.0',
    author: 'NexusCore',
    description: 'Remove backgrounds from images using AI',
    icon: '🎨',
    category: 'image-processing',
    
    // ========== CONFIGURATION ==========
    config: {
        enabled: true,
        apiKey: 'xv5aoeuirxTNZBYS5KykZZEK', // Your API key
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp']
    },
    
    // ========== INITIALIZATION ==========
    init: async function(app) {
        console.log('🎨 Background Remover Plugin initialized');
        
        // Register routes
        this.registerRoutes(app);
        
        return { 
            success: true, 
            message: 'Background Remover loaded successfully',
            endpoints: ['/api/plugins/background-remover/*']
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
                        plugin: 'Background Remover',
                        version: this.version,
                        config: {
                            maxFileSize: this.config.maxFileSize,
                            allowedFormats: this.config.allowedFormats
                        }
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
            path: '/remove',
            handler: async (req, res) => {
                try {
                    if (!req.files || !req.files.image) {
                        return res.status(400).json({
                            success: false,
                            error: 'No image file uploaded'
                        });
                    }
                    
                    const imageFile = req.files.image;
                    
                    // Check file size
                    if (imageFile.size > this.config.maxFileSize) {
                        return res.status(400).json({
                            success: false,
                            error: `File too large. Max size: ${this.config.maxFileSize / 1024 / 1024}MB`
                        });
                    }
                    
                    // Check file format
                    const ext = imageFile.name.split('.').pop().toLowerCase();
                    if (!this.config.allowedFormats.includes(ext)) {
                        return res.status(400).json({
                            success: false,
                            error: `Invalid format. Allowed: ${this.config.allowedFormats.join(', ')}`
                        });
                    }
                    
                    console.log('Processing image:', imageFile.name);
                    
                    // Call remove.bg API
                    const result = await this.removeBackground(imageFile.data);
                    
                    res.json({
                        success: true,
                        message: 'Background removed successfully',
                        originalName: imageFile.name,
                        result: result
                    });
                    
                } catch (error) {
                    console.error('Background removal error:', error);
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        },
        {
            method: 'POST',
            path: '/test',
            handler: async (req, res) => {
                try {
                    // Test the API key
                    const testResult = await this.testAPI();
                    
                    res.json({
                        success: true,
                        message: 'API test completed',
                        result: testResult
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
            const fullPath = `/api/plugins/background-remover${route.path}`;
            app[route.method.toLowerCase()](fullPath, route.handler.bind(this));
        });
    },
    
    removeBackground: async function(imageBuffer) {
        try {
            const FormData = require('form-data');
            const fs = require('fs');
            const path = require('path');
            
            // Create temp file
            const tempDir = './temp';
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const tempInput = path.join(tempDir, `input_${Date.now()}.png`);
            const tempOutput = path.join(tempDir, `output_${Date.now()}.png`);
            
            // Save uploaded image
            fs.writeFileSync(tempInput, imageBuffer);
            
            // Prepare form data for remove.bg API
            const formData = new FormData();
            formData.append('image_file', fs.createReadStream(tempInput));
            formData.append('size', 'auto');
            
            // Call remove.bg API
            const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: {
                    'X-Api-Key': this.config.apiKey,
                    ...formData.getHeaders()
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Remove.bg API error: ${response.status} - ${errorText}`);
            }
            
            // Get the result
            const resultBuffer = await response.buffer();
            
            // Save result
            fs.writeFileSync(tempOutput, resultBuffer);
            
            // Convert to base64 for easy display
            const base64Image = resultBuffer.toString('base64');
            const base64Original = imageBuffer.toString('base64');
            
            // Clean up temp files
            try {
                fs.unlinkSync(tempInput);
                fs.unlinkSync(tempOutput);
            } catch (cleanupError) {
                console.warn('Could not clean up temp files:', cleanupError.message);
            }
            
            return {
                success: true,
                imageBase64: `data:image/png;base64,${base64Image}`,
                originalBase64: `data:image/png;base64,${base64Original}`,
                size: resultBuffer.length,
                message: 'Background removed successfully'
            };
            
        } catch (error) {
            console.error('Remove background error:', error);
            throw error;
        }
    },
    
    testAPI: async function() {
        try {
            const response = await fetch('https://api.remove.bg/v1.0/account', {
                method: 'GET',
                headers: {
                    'X-Api-Key': this.config.apiKey
                }
            });
            
            if (!response.ok) {
                return {
                    valid: false,
                    status: response.status,
                    message: 'API key invalid or quota exceeded'
                };
            }
            
            const data = await response.json();
            return {
                valid: true,
                data: data,
                message: 'API key is valid'
            };
            
        } catch (error) {
            return {
                valid: false,
                error: error.message,
                message: 'Failed to test API'
            };
        }
    },
    
    // ========== ADMIN PANEL ==========
    admin: {
        path: '/admin/plugins/background-remover',
        name: 'Background Remover',
        icon: '🎨',
        component: `
            <div class="card">
                <h3>🎨 Background Remover</h3>
                
                <div style="margin: 1rem 0;">
                    <p><strong>Status:</strong> 
                        <span id="removerStatus" style="color: #10b981;">● Active</span>
                    </p>
                    <p><strong>API Key:</strong> 
                        <span id="apiKeyStatus" style="color: #f59e0b;">Testing...</span>
                    </p>
                    <p><strong>Version:</strong> 1.0.0</p>
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button onclick="testRemoverAPI()" class="btn btn-primary">
                        🔍 Test API
                    </button>
                    <button onclick="openRemoverUI()" class="btn btn-secondary">
                        🎨 Open Tool
                    </button>
                </div>
                
                <div id="removerResult" style="margin-top: 1rem;"></div>
                
                <script>
                    // Test API on load
                    window.addEventListener('load', function() {
                        testRemoverAPI();
                    });
                    
                    function testRemoverAPI() {
                        fetch('/api/plugins/background-remover/test', { 
                            method: 'POST' 
                        })
                            .then(res => res.json())
                            .then(data => {
                                const statusEl = document.getElementById('apiKeyStatus');
                                const resultEl = document.getElementById('removerResult');
                                
                                if (data.success && data.result.valid) {
                                    statusEl.innerHTML = '<span style="color: #10b981;">✓ Valid</span>';
                                    resultEl.innerHTML = \`
                                        <div style="color: #10b981; padding: 0.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 4px;">
                                            API Key is working! Credits: \${data.result.data?.data?.attributes?.credits_total || 'N/A'}
                                        </div>
                                    \`;
                                } else {
                                    statusEl.innerHTML = '<span style="color: #ef4444;">✗ Invalid</span>';
                                    resultEl.innerHTML = \`
                                        <div style="color: #ef4444; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px;">
                                            API Key error: \${data.result?.message || 'Check your API key'}
                                        </div>
                                    \`;
                                }
                            })
                            .catch(error => {
                                document.getElementById('apiKeyStatus').innerHTML = 
                                    '<span style="color: #ef4444;">✗ Error</span>';
                                document.getElementById('removerResult').innerHTML = \`
                                    <div style="color: #ef4444; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px;">
                                        Error: \${error.message}
                                    </div>
                                \`;
                            });
                    }
                    
                    function openRemoverUI() {
                        // Open in new tab or show modal
                        window.open('/tools/background-remover', '_blank');
                    }
                </script>
            </div>
        `
    },
    
    // ========== FRONTEND UI ==========
    frontend: {
        css: `
            .remover-container {
                max-width: 800px;
                margin: 2rem auto;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.03);
                border-radius: var(--radius);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .upload-area {
                border: 2px dashed rgba(255, 255, 255, 0.2);
                border-radius: var(--radius);
                padding: 3rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .upload-area:hover {
                border-color: #6366f1;
                background: rgba(99, 102, 241, 0.05);
            }
            
            .upload-area.dragover {
                border-color: #10b981;
                background: rgba(16, 185, 129, 0.1);
            }
            
            .image-preview {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2rem;
                margin-top: 2rem;
            }
            
            .image-box {
                text-align: center;
            }
            
            .image-box img {
                max-width: 100%;
                max-height: 300px;
                border-radius: var(--radius);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .processing {
                text-align: center;
                padding: 2rem;
            }
            
            .download-btn {
                display: inline-block;
                margin-top: 1rem;
                padding: 0.75rem 1.5rem;
                background: #10b981;
                color: white;
                text-decoration: none;
                border-radius: var(--radius);
                font-weight: 600;
            }
        `,
        
        js: `
            // Create Background Remover UI
            function createBackgroundRemoverUI() {
                // Add menu item
                const navMenu = document.querySelector('.nav-menu');
                if (navMenu) {
                    const removerItem = document.createElement('li');
                    removerItem.innerHTML = \`
                        <a href="/tools/background-remover" class="nav-link">
                            🎨 BG Remover
                        </a>
                    \`;
                    navMenu.appendChild(removerItem);
                }
                
                // Add to features page
                const featuresGrid = document.querySelector('.features-grid');
                if (featuresGrid) {
                    const removerCard = document.createElement('div');
                    removerCard.className = 'feature-card';
                    removerCard.innerHTML = \`
                        <div class="feature-icon">🎨</div>
                        <h3>Background Remover</h3>
                        <p>Remove backgrounds from images with AI</p>
                        <a href="/tools/background-remover" class="btn btn-sm btn-primary" style="margin-top: 0.5rem;">
                            Try Now
                        </a>
                    \`;
                    featuresGrid.appendChild(removerCard);
                }
                
                // Add to plugins page
                const pluginsContainer = document.querySelector('.plugins-container, .plugins-grid');
                if (pluginsContainer) {
                    const removerPlugin = document.createElement('div');
                    removerPlugin.className = 'plugin-card';
                    removerPlugin.innerHTML = \`
                        <div class="plugin-icon">🎨</div>
                        <h3>Background Remover</h3>
                        <p>Remove backgrounds using AI</p>
                        <a href="/tools/background-remover" class="btn btn-sm btn-primary" style="margin-top: 0.5rem;">
                            Open Tool
                        </a>
                    \`;
                    pluginsContainer.appendChild(removerPlugin);
                }
            }
            
            // Initialize on page load
            document.addEventListener('DOMContentLoaded', createBackgroundRemoverUI);
        `
    },
    
    // ========== CREATE TOOL PAGE ROUTE ==========
    createToolRoute: function(app) {
        app.get('/tools/background-remover', (req, res) => {
            res.render('tools/background-remover', {
                title: 'Background Remover | NexusCore',
                user: req.session.user
            });
        });
        
        console.log('✅ Created Background Remover tool page');
    }
};
