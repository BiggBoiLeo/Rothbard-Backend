const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    clientID: { type: String, default: null },
    hasPaid: { type: Boolean, required: true, default: false },
    walletDescriptor: { type: String, default: null },
    clientKeys: { type: String, default: null },
    userInformation: { type: String, default: null },
    wantsDelete: { type: Boolean, default: false },
    firebaseID: { type: String, unique: true, required: true },
});

const User = mongoose.model('clientVault', userSchema);

module.exports = User;