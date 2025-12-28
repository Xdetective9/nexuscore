const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const validator = require('validator');
const smsService = require('../utils/sms');
const db = require('../utils/database').db;

// ========== SIGNUP ROUTES ==========
router.get('/signup', (req, res) => {
    res.render('auth/signup', {
        title: 'Sign Up | NexusCore',
        error: null,
        phone: ''
    });
});

router.post('/signup', async (req, res) => {
    try {
        const { phone, email, name } = req.body;
        
        // Validate phone number
        if (!validator.isMobilePhone(phone, 'any')) {
            return res.render('auth/signup', {
                title: 'Sign Up | NexusCore',
                error: 'Invalid phone number',
                phone
            });
        }

        // Validate email if provided
        if (email && !validator.isEmail(email)) {
            return res.render('auth/signup', {
                title: 'Sign Up | NexusCore',
                error: 'Invalid email address',
                phone
            });
        }

        // Check if user already exists
        const existingUser = await db.query(
            'SELECT * FROM users WHERE phone = $1 OR email = $2',
            [phone, email]
        );

        if (existingUser.rows.length > 0) {
            return res.render('auth/signup', {
                title: 'Sign Up | NexusCore',
                error: 'User already exists',
                phone
            });
        }

        // Store user info in session for verification
        req.session.signupData = { phone, email, name };
        
        // Generate and send OTP
        const otpResult = await smsService.generateAndSendOTP(phone);
        
        if (otpResult.success) {
            res.redirect('/auth/verify');
        } else {
            res.render('auth/signup', {
                title: 'Sign Up | NexusCore',
                error: 'Failed to send OTP. Please try again.',
                phone
            });
        }
    } catch (error) {
        console.error('Signup error:', error);
        res.render('auth/signup', {
            title: 'Sign Up | NexusCore',
            error: 'An error occurred. Please try again.',
            phone: req.body.phone
        });
    }
});

// ========== VERIFICATION ROUTES ==========
router.get('/verify', (req, res) => {
    if (!req.session.signupData) {
        return res.redirect('/auth/signup');
    }
    
    res.render('auth/verify', {
        title: 'Verify Phone | NexusCore',
        phone: req.session.signupData.phone,
        error: null
    });
});

router.post('/verify', async (req, res) => {
    try {
        const { otp } = req.body;
        const signupData = req.session.signupData;
        
        if (!signupData) {
            return res.redirect('/auth/signup');
        }

        // Verify OTP
        const verification = await smsService.verifyOTP(signupData.phone, otp);
        
        if (verification.success) {
            // Create user account
            const userResult = await db.query(
                `INSERT INTO users (phone, email, name, verified) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id, phone, name, role`,
                [signupData.phone, signupData.email, signupData.name, true]
            );

            const user = userResult.rows[0];
            
            // Set session
            req.session.user = {
                id: user.id,
                phone: user.phone,
                name: user.name,
                role: user.role,
                verified: true
            };

            // Clear signup data
            delete req.session.signupData;

            // Redirect to dashboard
            res.redirect('/dashboard');
        } else {
            res.render('auth/verify', {
                title: 'Verify Phone | NexusCore',
                phone: signupData.phone,
                error: 'Invalid OTP. Please try again.'
            });
        }
    } catch (error) {
        console.error('Verification error:', error);
        res.render('auth/verify', {
            title: 'Verify Phone | NexusCore',
            phone: req.session.signupData?.phone,
            error: 'An error occurred. Please try again.'
        });
    }
});

// ========== LOGIN ROUTES ==========
router.get('/login', (req, res) => {
    res.render('auth/login', {
        title: 'Login | NexusCore',
        error: null
    });
});

router.post('/login', async (req, res) => {
    try {
        const { phone } = req.body;
        
        // Check if user exists
        const userResult = await db.query(
            'SELECT * FROM users WHERE phone = $1',
            [phone]
        );

        if (userResult.rows.length === 0) {
            return res.render('auth/login', {
                title: 'Login | NexusCore',
                error: 'User not found. Please sign up first.'
            });
        }

        const user = userResult.rows[0];
        
        // Store phone in session for OTP verification
        req.session.loginPhone = phone;
        
        // Send OTP
        const otpResult = await smsService.generateAndSendOTP(phone);
        
        if (otpResult.success) {
            res.redirect('/auth/login/verify');
        } else {
            res.render('auth/login', {
                title: 'Login | NexusCore',
                error: 'Failed to send OTP. Please try again.'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', {
            title: 'Login | NexusCore',
            error: 'An error occurred. Please try again.'
        });
    }
});

router.get('/login/verify', (req, res) => {
    if (!req.session.loginPhone) {
        return res.redirect('/auth/login');
    }
    
    res.render('auth/verify', {
        title: 'Login Verify | NexusCore',
        phone: req.session.loginPhone,
        error: null
    });
});

router.post('/login/verify', async (req, res) => {
    try {
        const { otp } = req.body;
        const phone = req.session.loginPhone;
        
        if (!phone) {
            return res.redirect('/auth/login');
        }

        // Verify OTP
        const verification = await smsService.verifyOTP(phone, otp);
        
        if (verification.success) {
            // Get user data
            const userResult = await db.query(
                'SELECT id, phone, name, role, verified FROM users WHERE phone = $1',
                [phone]
            );

            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                
                // Set session
                req.session.user = {
                    id: user.id,
                    phone: user.phone,
                    name: user.name,
                    role: user.role,
                    verified: user.verified
                };

                // Clear login phone
                delete req.session.loginPhone;

                // Redirect based on role
                if (user.role === 'admin') {
                    res.redirect('/admin');
                } else {
                    res.redirect('/dashboard');
                }
            } else {
                res.render('auth/verify', {
                    title: 'Login Verify | NexusCore',
                    phone,
                    error: 'User not found.'
                });
            }
        } else {
            res.render('auth/verify', {
                title: 'Login Verify | NexusCore',
                phone,
                error: 'Invalid OTP. Please try again.'
            });
        }
    } catch (error) {
        console.error('Login verification error:', error);
        res.render('auth/verify', {
            title: 'Login Verify | NexusCore',
            phone: req.session.loginPhone,
            error: 'An error occurred. Please try again.'
        });
    }
});

// ========== RESEND OTP ==========
router.post('/resend-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!validator.isMobilePhone(phone, 'any')) {
            return res.json({ success: false, error: 'Invalid phone number' });
        }

        const otpResult = await smsService.generateAndSendOTP(phone);
        
        if (otpResult.success) {
            res.json({ success: true, message: 'OTP resent successfully' });
        } else {
            res.json({ success: false, error: 'Failed to resend OTP' });
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.json({ success: false, error: 'An error occurred' });
    }
});

// ========== LOGOUT ==========
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

// ========== PASSWORD RESET ==========
router.get('/reset', (req, res) => {
    res.render('auth/reset', {
        title: 'Reset Password | NexusCore',
        error: null
    });
});

router.post('/reset', async (req, res) => {
    try {
        const { phone } = req.body;
        
        // Check if user exists
        const userResult = await db.query(
            'SELECT * FROM users WHERE phone = $1',
            [phone]
        );

        if (userResult.rows.length === 0) {
            return res.render('auth/reset', {
                title: 'Reset Password | NexusCore',
                error: 'User not found.'
            });
        }

        // Send OTP for password reset
        const otpResult = await smsService.generateAndSendOTP(phone);
        
        if (otpResult.success) {
            req.session.resetPhone = phone;
            res.redirect('/auth/reset/verify');
        } else {
            res.render('auth/reset', {
                title: 'Reset Password | NexusCore',
                error: 'Failed to send OTP. Please try again.'
            });
        }
    } catch (error) {
        console.error('Reset error:', error);
        res.render('auth/reset', {
            title: 'Reset Password | NexusCore',
            error: 'An error occurred. Please try again.'
        });
    }
});

router.get('/reset/verify', (req, res) => {
    if (!req.session.resetPhone) {
        return res.redirect('/auth/reset');
    }
    
    res.render('auth/verify', {
        title: 'Reset Verify | NexusCore',
        phone: req.session.resetPhone,
        error: null,
        isReset: true
    });
});

router.post('/reset/verify', async (req, res) => {
    try {
        const { otp, password } = req.body;
        const phone = req.session.resetPhone;
        
        if (!phone) {
            return res.redirect('/auth/reset');
        }

        // Verify OTP
        const verification = await smsService.verifyOTP(phone, otp);
        
        if (verification.success) {
            // Hash new password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Update password
            await db.query(
                'UPDATE users SET password = $1 WHERE phone = $2',
                [hashedPassword, phone]
            );

            // Clear reset session
            delete req.session.resetPhone;

            req.session.successMessage = 'Password reset successfully!';
            res.redirect('/auth/login');
        } else {
            res.render('auth/verify', {
                title: 'Reset Verify | NexusCore',
                phone,
                error: 'Invalid OTP. Please try again.',
                isReset: true
            });
        }
    } catch (error) {
        console.error('Reset verification error:', error);
        res.render('auth/verify', {
            title: 'Reset Verify | NexusCore',
            phone: req.session.resetPhone,
            error: 'An error occurred. Please try again.',
            isReset: true
        });
    }
});

module.exports = router;
