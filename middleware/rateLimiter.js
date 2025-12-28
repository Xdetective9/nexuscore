const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: 'Too many requests from this IP',
        retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        error: 'Too many login attempts',
        retryAfter: 3600
    }
});

const pluginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: {
        error: 'Too many plugin operations',
        retryAfter: 600
    }
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
        error: 'Too many admin requests',
        retryAfter: 900
    }
});

const rateLimiterMiddleware = (req, res, next) => {
    const path = req.path;
    
    if (path.startsWith('/auth/login') || path.startsWith('/auth/signup')) {
        return authLimiter(req, res, next);
    }
    
    if (path.startsWith('/admin') || path.startsWith('/plugins/upload')) {
        return adminLimiter(req, res, next);
    }
    
    if (path.startsWith('/api')) {
        return apiLimiter(req, res, next);
    }
    
    next();
};

module.exports = {
    rateLimiterMiddleware,
    apiLimiter,
    authLimiter,
    pluginLimiter,
    adminLimiter
};
