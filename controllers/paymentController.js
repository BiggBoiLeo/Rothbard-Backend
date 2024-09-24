const User = require('../models/userModel');
const admin = require('../config/firebaseAdmin');

// Create a separate function to verify the token, which can be mocked in unit tests
const verifyToken = async (idToken) => {
    return await admin.auth().verifyIdToken(idToken, true);
};

exports.setPayment = async (req, res) => {
    try {
        const idToken = req.body.idToken;

        // Check if idToken is provided and is a valid string
        if (!idToken || typeof idToken !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid or missing ID token' });
        }

        let decodedToken;
        try {
            // Verify the token using Firebase Admin SDK
            decodedToken = await verifyToken(idToken);
        } catch (error) {
            // If token verification fails, send an appropriate response
            return res.status(401).json({ success: false, message: 'Invalid ID token' });
        }

        const firebaseID = decodedToken.uid;

        const user = await User.findOne({ firebaseID: firebaseID });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.hasPaid = true;
        await user.save();

        return res.json({ message: 'Payment Successful' });
    } catch (error) {
        console.error(error); // Log errors for debugging purposes
        return res.status(500).json({ success: false, message: 'Error setting payment.' });
    }
};


// Export the verifyToken function for testing purposes
exports.verifyToken = verifyToken;
