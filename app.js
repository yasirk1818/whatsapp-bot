// =================================================================
//                         IMPORTS & SETUP
// =================================================================
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');

// Apne banaye hue modules ko import karna
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const { initializeAllClients } = require('./whatsapp-manager');

// Express app ko initialize karna
const app = express();
const PORT = process.env.PORT || 3000;


// =================================================================
//                         MIDDLEWARE
// =================================================================

// Form ka data parhne ke liye (e.g., email, password from login form)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Yeh line 'public' folder ko register karti hai. Agar aap custom CSS/JS
// files rakhenge to woh is folder mein aayengi.
app.use(express.static(path.join(__dirname, 'public')));

// View Engine (EJS) ko set karna taake hum HTML pages dikha sakein
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// User login session ko manage karne ke liye
app.use(session({
    secret: 'koi-bhi-lamba-aur-mushkil-sa-secret-yahan-likh-dein',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Agar HTTPS istemal karein to isay 'true' kar dein
}));


// =================================================================
//                      DATABASE CONNECTION
// =================================================================
const MONGO_URI = 'mongodb://127.0.0.1:27017/whatsapp-bot';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected Successfully!');
        // Database connect hone ke baad hi WhatsApp clients ko start karein
        initializeAllClients();
    })
    .catch(err => {
        console.error('DATABASE CONNECTION FAILED:', err.message);
        console.error('Tip: Check karein ke aapka MongoDB service (sudo systemctl status mongod) chal rahi hai ya nahi.');
    });


// =================================================================
//                             ROUTES
// =================================================================

// Website ke main URL ('/') par kya karna hai
app.get('/', (req, res) => {
    // Agar user logged in hai to dashboard par bhejo, warna login page par
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.redirect('/login');
});

// Authentication (login/signup) aur Dashboard ke routes ko istemal karna
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);


// =================================================================
//                         START THE SERVER
// =================================================================
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
