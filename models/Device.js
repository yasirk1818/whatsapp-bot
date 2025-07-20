const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientId: { // e.g., 'user123-device1'
        type: String,
        required: true,
        unique: true
    },
    name: { // User-defined name for the device
        type: String,
        required: true
    },
    number: { // WhatsApp number
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['disconnected', 'connected', 'qr'],
        default: 'disconnected'
    },
    // Keywords for auto-reply
    keywords: [{
        keyword: String,
        reply: String
    }],
    // Extra Controls
    settings: {
        autoRead: { type: Boolean, default: true },
        alwaysOnline: { type: Boolean, default: false },
        rejectCalls: { type: Boolean, default: false }
    }
});

module.exports = mongoose.model('Device', DeviceSchema);```

#### **WhatsApp Logic (`whatsapp-manager.js`)**

Ek alag file banayein jo saare WhatsApp clients ko manage karegi. `whatsapp-manager.js` naam dein.

```javascript
// (Yeh file routes folder mein nahi, root folder mein banayein)
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const Device = require('./models/Device');

const clients = {}; // Yahan saare active clients store honge

const initializeClient = async (device) => {
    const clientId = device.clientId;
    console.log(`Initializing client for ${clientId}`);

    const client = new Client({
        authStrategy: new LocalAuth({ clientId, dataPath: './sessions' }),
        puppeteer: { headless: true, args: ['--no-sandbox'] }
    });

    client.on('qr', async (qr) => {
        console.log(`QR received for ${clientId}`);
        // QR code ko database mein ya kisi temporary storage mein save karein
        // Hum yahan status 'qr' set kar rahe hain
        await Device.updateOne({ clientId }, { status: 'qr' });
        // Aap socket.io ka istemal karke QR frontend par live bhej sakte hain
    });

    client.on('ready', async () => {
        console.log(`Client is ready for ${clientId}!`);
        const number = client.info.wid.user;
        await Device.updateOne({ clientId }, { status: 'connected', number });
        clients[clientId] = client;
    });

    client.on('message', async (msg) => {
        const deviceData = await Device.findOne({ clientId });
        if (!deviceData) return;

        // Auto-read messages
        if (deviceData.settings.autoRead) {
            const chat = await msg.getChat();
            chat.sendSeen();
        }

        // Auto-reply logic
        const matchedKeyword = deviceData.keywords.find(kw => msg.body.toLowerCase() === kw.keyword.toLowerCase());
        if (matchedKeyword) {
            msg.reply(matchedKeyword.reply);
        }
    });

    client.on('call', async (call) => {
        const deviceData = await Device.findOne({ clientId });
        if (deviceData && deviceData.settings.rejectCalls) {
            await call.reject();
            console.log(`Call rejected for ${clientId}`);
        }
    });

    client.on('disconnected', async (reason) => {
        console.log(`Client was disconnected for ${clientId}:`, reason);
        await Device.updateOne({ clientId }, { status: 'disconnected' });
        delete clients[clientId];
    });

    await client.initialize();
};

// Server start hone par saare saved devices ko initialize karein
const initializeAllClients = async () => {
    const devices = await Device.find({ status: { $ne: 'disconnected' } });
    devices.forEach(device => initializeClient(device));
};

module.exports = { initializeClient, initializeAllClients, clients };
