const express = require('express');
const router = express.Router();
const qrcode = require('qrcode');
const Device = require('../models/Device');
const { initializeClient, getClient, getQrFromStore } = require('../whatsapp-manager');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// Main Dashboard Page
router.get('/', isAuthenticated, async (req, res) => {
    const devices = await Device.find({ userId: req.session.userId });
    res.render('dashboard', { devices });
});

// Add a New Device
router.post('/add-device', isAuthenticated, async (req, res) => {
    const { deviceName } = req.body;
    const clientId = `user${req.session.userId}-device${Date.now()}`;
    const device = new Device({ userId: req.session.userId, clientId, name: deviceName });
    await device.save();
    initializeClient(device);
    res.redirect(`/dashboard/device/${device._id}`);
});

// Manage a Specific Device Page
router.get('/device/:id', isAuthenticated, async (req, res) => {
    try {
        const device = await Device.findOne({ _id: req.params.id, userId: req.session.userId });
        if (!device) return res.redirect('/dashboard');
        res.render('devices', { device, query: req.query });
    } catch (err) {
        res.redirect('/dashboard');
    }
});

// API Route for Frontend to fetch QR code
router.get('/device/:id/qr', isAuthenticated, async (req, res) => {
    try {
        const device = await Device.findOne({ _id: req.params.id, userId: req.session.userId });
        if (!device) return res.status(404).json({ error: 'Device not found' });
        
        const storedQr = getQrFromStore(device.clientId);

        if (storedQr) {
            const qrCodeDataUrl = await qrcode.toDataURL(storedQr);
            return res.json({ qrCodeDataUrl: qrCodeDataUrl, status: 'qr' });
        } else {
            return res.json({ qrCodeDataUrl: null, status: device.status });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

// ==========================================================
//      SABHI ACTION ROUTES AB YAHAN THEEK HAIN
// ==========================================================

// Delete Device
router.post('/device/:id/delete', isAuthenticated, async (req, res) => {
    const device = await Device.findOne({ _id: req.params.id, userId: req.session.userId });
    if (device) {
        const client = getClient(device.clientId);
        if (client) await client.destroy();
        await Device.findByIdAndDelete(req.params.id);
    }
    res.redirect('/dashboard');
});

// Add Keyword
router.post('/device/:id/add-keyword', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { keyword, reply } = req.body;
        await Device.updateOne(
            { _id: id, userId: req.session.userId },
            { $push: { keywords: { keyword, reply } } }
        );
        res.redirect(`/dashboard/device/${id}?success=keyword_added`);
    } catch (err) {
        console.error('Error adding keyword:', err);
        res.redirect('back');
    }
});

// Update Settings
router.post('/device/:id/settings', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const settings = {
            autoRead: !!req.body.autoRead,
            alwaysOnline: !!req.body.alwaysOnline,
            rejectCalls: !!req.body.rejectCalls
        };
        await Device.updateOne({ _id: id, userId: req.session.userId }, { $set: { settings } });
        res.redirect(`/dashboard/device/${id}?success=settings_saved`);
    } catch (err) {
        console.error('Error saving settings:', err);
        res.redirect('back');
    }
});

// Delete Keyword
router.post('/device/:id/delete-keyword/:keywordId', isAuthenticated, async (req, res) => {
    try {
        const { id, keywordId } = req.params;
        await Device.updateOne(
            { _id: id, userId: req.session.userId },
            { $pull: { keywords: { _id: keywordId } } }
        );
        res.redirect(`/dashboard/device/${id}?success=keyword_deleted`);
    } catch (err) {
        console.error('Error deleting keyword:', err);
        res.redirect('back');
    }
});


module.exports = router;
