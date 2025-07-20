const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// Signup Page
router.get('/signup', (req, res) => res.render('signup'));

// Signup Logic
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).send('User already exists');
        }
        user = new User({ name, email, password });
        await user.save();
        res.redirect('/login');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Login Page
router.get('/login', (req, res) => res.render('login'));

// Login Logic
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('Invalid Credentials');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send('Invalid Credentials');
        }
        req.session.userId = user.id; // Session mein user ID save karein
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;
