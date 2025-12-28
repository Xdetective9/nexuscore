const twilio = require('twilio');
const db = require('./database').db;

class SMSService {
    constructor() {
        this.client = null;
        
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.client = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );
        }
    }

    async sendOTP(phone, otp) {
        if (!this.client) {
            console.log('📱 Mock SMS sent to:', phone, 'OTP:', otp);
            
            // Log to database
            await db.query(
                'INSERT INTO sms_logs (phone, message, status) VALUES ($1, $2, $3)',
                [phone, `OTP: ${otp}`, 'mock_sent']
            );
            
            return { success: true, sid: 'mock_sid' };
        }

        try {
            const message = await this.client.messages.create({
                body: `Your NexusCore verification code is: ${otp}. Valid for 5 minutes.`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phone
            });

            await db.query(
                'INSERT INTO sms_logs (phone, message, status) VALUES ($1, $2, $3)',
                [phone, `OTP: ${otp}`, 'sent']
            );

            return { success: true, sid: message.sid };
        } catch (error) {
            console.error('❌ SMS sending failed:', error);
            
            await db.query(
                'INSERT INTO sms_logs (phone, message, status) VALUES ($1, $2, $3)',
                [phone, `OTP: ${otp}`, 'failed']
            );
            
            return { success: false, error: error.message };
        }
    }

    async verifyOTP(phone, otp) {
        try {
            const result = await db.query(
                `SELECT * FROM users 
                 WHERE phone = $1 
                 AND otp = $2 
                 AND otp_expires_at > NOW()`,
                [phone, otp]
            );

            if (result.rows.length > 0) {
                // Clear OTP after verification
                await db.query(
                    'UPDATE users SET otp = NULL, otp_expires_at = NULL WHERE phone = $1',
                    [phone]
                );
                
                return { success: true, user: result.rows[0] };
            }
            
            return { success: false, error: 'Invalid or expired OTP' };
        } catch (error) {
            console.error('❌ OTP verification failed:', error);
            return { success: false, error: error.message };
        }
    }

    async generateAndSendOTP(phone) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        
        try {
            // Store OTP in database
            await db.query(
                `INSERT INTO users (phone, otp, otp_expires_at) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (phone) 
                 DO UPDATE SET otp = $2, otp_expires_at = $3`,
                [phone, otp, expiresAt]
            );

            // Send OTP via SMS
            const result = await this.sendOTP(phone, otp);
            
            if (result.success) {
                return { success: true, otp, expiresAt };
            } else {
                return { success: false, error: 'Failed to send OTP' };
            }
        } catch (error) {
            console.error('❌ OTP generation failed:', error);
            return { success: false, error: error.message };
        }
    }

    async sendWhatsAppOTP(phone, otp) {
        // This requires WhatsApp Business API integration
        console.log('📱 WhatsApp OTP would be sent to:', phone, 'OTP:', otp);
        return { success: true, method: 'whatsapp' };
    }
}

module.exports = new SMSService();
