// -----------------------------------------------------------------
//                         IMPORTS & SETUP
// -----------------------------------------------------------------
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');

// Route imports
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

// WhatsApp Manager import
const { initializeAllClients } = require('./whatsapp-manager');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3000;

// -----------------------------------------------------------------
//                         MIDDLEWARE
// -----------------------------------------------------------------

// Body Parsers for handling POST requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, client-side JS, images) from a 'public' folder
// Aap ek 'public' naam ka folder bana kar usmein apni CSS files rakh sakte hain.
app.use(express.static(path.join(__dirname, 'public')));

// EJS View Engine Setup
// Batata hai ke frontend templates 'views' folder mein hain
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Express Session Middleware for User Authentication
// User login state ko manage karne ke liye
app.use(session({
    secret: 'a-very-strong-and-long-secret-key-for-your-app', // PRODUCTION mein isko environment variable se load karein
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // Agar HTTPS istemal kar rahe hain to isko 'true' karein
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // Session 24 ghante tak valid rahega
    }
}));


// -----------------------------------------------------------------
//                         DATABASE CONNECTION
// -----------------------------------------------------------------

// MongoDB se connect karein
// Note: 'whatsapp-auto-reply-bot' aapke database ka naam hai, aap isse change kar sakte hain.
mongoose.connect('mongodb://localhost:27017/whatsapp-auto-reply-bot', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB Connected Successfully!');
    // Jab database connect ho jaye, tab pehle se saved WhatsApp clients ko initialize karein
    initializeAllClients();
}).catch(err => {
    console.error('MongoDB Connection Error:', err);
});


// -----------------------------------------------------------------
//                             ROUTES
// -----------------------------------------------------------------

// Root URL (/) ko seedha login page par redirect karein
app.get('/', (req, res) => {
    // Agar user pehle se logged in hai to usay dashboard par bhej do
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    // Warna login page par bhej do
    res.redirect('/login');
});

// Authentication routes (Signup, Login, Logout)
app.use('/', authRoutes);

// Dashboard and device management routes
app.use('/dashboard', dashboardRoutes);


// -----------------------------------------------------------------
//                         SERVER START
// -----------------------------------------------------------------

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Open your browser and navigate to the URL to begin.');
});
