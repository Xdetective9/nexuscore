const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static('public'));

// Session (Memory store for now)
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Routes
app.get('/', (req, res) => {
    res.render('index', {
        title: 'NexusCore',
        ownerName: process.env.OWNER_NAME || 'Abdullah',
        ownerNumber: process.env.OWNER_NUMBER || '+923288055104'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', time: new Date() });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║     🚀 NexusCore Started            ║
║     📍 Port: ${PORT}                ║
║     🌐 http://localhost:${PORT}     ║
╚══════════════════════════════════════╝
    
👤 Owner: ${process.env.OWNER_NAME || 'Abdullah'}
📞 Contact: ${process.env.OWNER_NUMBER || '+923288055104'}
    `);
});
