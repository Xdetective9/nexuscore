// ========== DOM READY ==========
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initHamburgerMenu();
    initOTPInput();
    initFormValidation();
    initAnimations();
    initTooltips();
    initNotifications();
    
    // Check for session messages
    checkSessionMessages();
});

// ========== HAMBURGER MENU ==========
function initHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
}

// ========== OTP INPUT HANDLING ==========
function initOTPInput() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        // Handle input
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1) {
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            }
            
            // Auto-submit if all inputs are filled
            const allFilled = Array.from(otpInputs).every(i => i.value.length === 1);
            if (allFilled && index === otpInputs.length - 1) {
                submitOTP();
            }
        });
        
        // Handle backspace
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
        
        // Handle paste
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text');
            const numbers = pasteData.replace(/\D/g, '');
            
            numbers.split('').forEach((num, i) => {
                if (otpInputs[i]) {
                    otpInputs[i].value = num;
                }
            });
            
            // Focus last filled input
            const lastIndex = Math.min(numbers.length - 1, otpInputs.length - 1);
            otpInputs[lastIndex].focus();
            
            // Auto-submit if all filled
            if (numbers.length === otpInputs.length) {
                setTimeout(submitOTP, 100);
            }
        });
    });
}

// ========== FORM VALIDATION ==========
function initFormValidation() {
    const forms = document.querySelectorAll('form[data-validate]');
    
    forms.forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            // Show loading
            submitBtn.innerHTML = '<span class="loading"></span> Processing...';
            submitBtn.disabled = true;
            
            try {
                const formData = new FormData(this);
                const action = this.action;
                const method = this.method;
                
                const response = await fetch(action, {
                    method: method,
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showNotification('success', result.message || 'Success!');
                    
                    // Redirect if specified
                    if (result.redirect) {
                        setTimeout(() => {
                            window.location.href = result.redirect;
                        }, 1500);
                    }
                    
                    // Reset form if specified
                    if (result.reset) {
                        this.reset();
                    }
                } else {
                    showNotification('error', result.error || 'An error occurred');
                }
            } catch (error) {
                showNotification('error', 'Network error. Please try again.');
            } finally {
                // Restore button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    });
}

// ========== ANIMATIONS ==========
function initAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, observerOptions);
    
    // Observe elements with animation classes
    document.querySelectorAll('.fade-in, .float, .glow').forEach(el => {
        observer.observe(el);
    });
    
    // Add parallax effect to hero
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.5;
            hero.style.transform = `translateY(${rate}px)`;
        });
    }
}

// ========== TOOLTIPS ==========
function initTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            const tooltipText = element.getAttribute('data-tooltip');
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = tooltipText;
            
            document.body.appendChild(tooltip);
            
            const rect = element.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
        });
        
        element.addEventListener('mouseleave', () => {
            const tooltip = document.querySelector('.tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        });
    });
}

// ========== NOTIFICATIONS ==========
function initNotifications() {
    window.showNotification = function(type, message, duration = 5000) {
        const container = document.getElementById('notification-container') || createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${getIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="notification-progress"></div>
        `;
        
        container.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
        
        return notification;
    };
    
    function createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }
    
    function getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ⓘ'
        };
        return icons[type] || 'ⓘ';
    }
}

// ========== SESSION MESSAGES ==========
function checkSessionMessages() {
    // Check URL for success messages
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success) {
        showNotification('success', decodeURIComponent(success));
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (error) {
        showNotification('error', decodeURIComponent(error));
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// ========== UTILITY FUNCTIONS ==========
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('success', 'Copied to clipboard!');
    }).catch(() => {
        showNotification('error', 'Failed to copy');
    });
}

// ========== PLUGIN SYSTEM HELPERS ==========
async function loadPlugin(pluginId) {
    try {
        showNotification('info', 'Loading plugin...');
        
        const response = await fetch(`/api/v1/plugins/${pluginId}/load`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Plugin loaded successfully!');
            // Refresh the page to show new plugin
            setTimeout(() => location.reload(), 1000);
        } else {
            showNotification('error', result.error);
        }
    } catch (error) {
        showNotification('error', 'Failed to load plugin');
    }
}

async function togglePlugin(pluginId, enabled) {
    try {
        const response = await fetch(`/admin/plugins/${pluginId}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled: enabled.toString() })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', result.message);
            setTimeout(() => location.reload(), 1000);
        } else {
            showNotification('error', result.error);
        }
    } catch (error) {
        showNotification('error', 'Failed to toggle plugin');
    }
}

// ========== EXPORT FOR USE IN PLUGINS ==========
window.NexusCore = {
    showNotification,
    copyToClipboard,
    loadPlugin,
    togglePlugin,
    debounce
};
