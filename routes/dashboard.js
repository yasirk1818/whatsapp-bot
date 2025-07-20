const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const { initializeClient, clients } = require('../whatsapp-manager');
const qrcode = require('qrcode');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// Dashboard Main Page
router.get('/', isAuthenticated, async (req, res) => {
    const devices = await Device.find({ userId: req.session.userId });
    res.render('dashboard', { devices });
});

// Add a New Device
router.post('/add-device', isAuthenticated, async (req, res) => {
    const { deviceName } = req.body;
    const clientId = `user${req.session.userId}-device${Date.now()}`;

    const device = new Device({
        userId: req.session.userId,
        clientId,
        name: deviceName,
    });
    await device.save();

    initializeClient(device); // Client ko initialize karein

    // Thora wait karke redirect karein taake QR generate ho jaye
    setTimeout(() => res.redirect(`/dashboard/device/${device._id}`), 3000);
});

// View a Specific Device (for QR and settings)
router.get('/device/:id', isAuthenticated, async (req, res) => {
    const device = await Device.findById(req.params.id);
    if (!device || device.userId.toString() !== req.session.userId) {
        return res.redirect('/dashboard');
    }

    let qrCodeDataUrl = null;
    if (device.status === 'qr') {
        const client = clients[device.clientId];
        if (client) {
            // NOTE: 'qr' event se QR code lena behtar hai.
            // Yeh tareeqa reliable nahi hai. Hum frontend se API call kareinge.
        }
    }
    res.render('devices', { device });
});


// API Endpoint to get QR Code
router.get('/device/:id/qr', isAuthenticated, async (req, res) => {
    const device = await Device.findById(req.params.id);
    if (!device || device.userId.toString() !== req.session.userId) {
        return res.status(404).send('Device not found');
    }

    const client = Object.values(clients).find(c => c.options.authStrategy.clientId === device.clientId);
    if (device.status === 'qr' && client) {
       client.once('qr', async (qr) => {
            const qrCodeDataUrl = await qrcode.toDataURL(qr);
            res.json({ qrCodeDataUrl });
        });
    } else {
        res.json({ qrCodeDataUrl: null });
    }
});


// Delete Device
router.post('/device/:id/delete', isAuthenticated, async (req, res) => {
    const device = await Device.findById(req.params.id);
    if (device && device.userId.toString() === req.session.userId) {
        const client = clients[device.clientId];
        if (client) {
            await client.destroy(); // Session destroy karein
        }
        // Session folder se data delete karein
        // const fs = require('fs');
        // fs.rmdirSync(`./sessions/session-${device.clientId}`, { recursive: true });
        
        await Device.findByIdAndDelete(req.params.id);
    }
    res.redirect('/dashboard');
});


// Keywords Management
router.post('/device/:id/add-keyword', isAuthenticated, async (req, res) => {
    const { keyword, reply } = req.body;
    await Device.updateOne(
        { _id: req.params.id, userId: req.session.userId },
        { $push: { keywords: { keyword, reply } } }
    );
    res.redirect(`/dashboard/device/${req.params.id}`);
});

// Settings Update
router.post('/device/:id/settings', isAuthenticated, async (req, res) => {
    const settings = {
        autoRead: !!req.body.autoRead,
        alwaysOnline: !!req.body.alwaysOnline,
        rejectCalls: !!req.body.rejectCalls
    };
    await Device.updateOne(
        { _id: req.params.id, userId: req.session.userId },
        { $set: { settings } }
    );
    res.redirect(`/dashboard/device/${req.params.id}`);
});


module.exports = router;
