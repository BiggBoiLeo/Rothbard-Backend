const admin = require('firebase-admin');
const User = require('../models/userModel');

// Function for isPrivate API
exports.isPrivate = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken || typeof idToken !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid or missing ID token' });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const firebaseID = decodedToken.uid;
        const user = await User.findOne({ firebaseID: firebaseID });

        if (!user) {
            return res.status(404).json({message: 'User not found' });
        }

        const isPrivate = user.userInformation && user.userInformation.startsWith('null');
        return res.status(200).json({isPrivate });
    } catch (error) {
        return res.status(400).json({ success: false, message: 'Error checking privacy mode' });
    }
};

// Function for accountDelete API
exports.accountDelete = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken || typeof idToken !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid or missing ID token' });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const firebaseID = decodedToken.uid;

        const user = await User.findOne({ firebaseID: firebaseID });
        if (!user) {
            return res.status(404).json({message: 'User not found' });
        }

        user.wantsDelete = true;
        await user.save();

        return res.json({message: 'Successfully initiated the deletion process.' });
    } catch (error) {
        return res.status(400).json({ success: false, message: 'Error initiating the deletion process.' });
    }
};