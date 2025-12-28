const { Pool } = require('pg');
const chalk = require('chalk');

class Database {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
            idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
            connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        this.pool.on('connect', () => {
            console.log(chalk.green('📊 Database connected'));
        });

        this.pool.on('error', (err) => {
            console.error(chalk.red('❌ Database error:', err));
        });
    }

    async query(text, params) {
        try {
            const start = Date.now();
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            if (process.env.NODE_ENV === 'development') {
                console.log(chalk.cyan(`📝 Executed query in ${duration}ms`));
            }
            
            return result;
        } catch (error) {
            console.error(chalk.red('❌ Query error:', error));
            throw error;
        }
    }

    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

const db = new Database();

async function initDatabase() {
    try {
        // Create tables if they don't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE,
                name VARCHAR(255),
                password VARCHAR(255),
                otp VARCHAR(6),
                otp_expires_at TIMESTAMP,
                verified BOOLEAN DEFAULT false,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS plugins (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                version VARCHAR(50),
                author VARCHAR(255),
                enabled BOOLEAN DEFAULT true,
                config JSONB,
                installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS user_sessions (
                sid VARCHAR PRIMARY KEY,
                sess JSON NOT NULL,
                expire TIMESTAMP(6) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS logs (
                id SERIAL PRIMARY KEY,
                level VARCHAR(50),
                message TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sms_logs (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20),
                message TEXT,
                status VARCHAR(50),
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_plugins_enabled ON plugins(enabled);
            CREATE INDEX IF NOT EXISTS idx_sessions_expire ON user_sessions(expire);
            CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);
        `);

        console.log(chalk.green('✅ Database tables created/verified'));

        // Check if admin user exists
        const adminCheck = await db.query(
            'SELECT * FROM users WHERE phone = $1',
            [process.env.OWNER_NUMBER]
        );

        if (adminCheck.rows.length === 0 && process.env.ADMIN_PASSWORD) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
            
            await db.query(
                `INSERT INTO users (phone, name, password, verified, role) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (phone) DO NOTHING`,
                [
                    process.env.OWNER_NUMBER,
                    process.env.OWNER_NAME,
                    hashedPassword,
                    true,
                    'admin'
                ]
            );
            console.log(chalk.green('✅ Admin user created'));
        }

        return true;
    } catch (error) {
        console.error(chalk.red('❌ Database initialization failed:', error));
        throw error;
    }
}

module.exports = {
    db,
    initDatabase,
    Database
};
