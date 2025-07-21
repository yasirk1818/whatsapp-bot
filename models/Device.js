const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    number: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        // Humne yahan 'pending' add kiya hai
        enum: ['pending', 'qr', 'connected', 'disconnected'],
        // Nayi default value ab 'pending' hai
        default: 'pending'
    },
    keywords: [{
        keyword: String,
        reply: String
    }],
    settings: {
        autoRead: { type: Boolean, default: true },
        alwaysOnline: { type:Boolean, default: false },
        rejectCalls: { type: Boolean, default: false }
    }
});

module.exports = mongoose.model('Device', DeviceSchema);
