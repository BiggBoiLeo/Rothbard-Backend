const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Apply security headers with Helmet
app.use(helmet());

app.set('trust proxy', 1);

// CORS configuration
const allowedOrigins = [
    'https://rothbardbitcoin.com',
    'https://rothbardbitcoin.web.app'
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // Allow cookies to be sent
}));

// JSON and cookie parsing middleware
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

// Connect to MongoDB
mongoose.connect(process.env.DB_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

// Define User model
const userSchema = new mongoose.Schema({
    email: {type: String, unique: true, required: true },
    clientID: {type: String, default: null},
    hasPaid: {type: Boolean, required: true, default: false },
    walletDescriptor: {type: String, default: null},
    clientKeys: {type: String, default: null },
    userInformation: {type: String, default: null},
    firebaseID: {type: String, unique: true, required: true}
});

const User = mongoose.model('clientVault', userSchema);

app.post('/api/hasDescriptor', async (req, res) => {
    try {
        const idToken = req.body.idToken;

        if (!idToken || typeof idToken !== 'string') {
            throw new Error('Invalid or missing ID token');
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken, true);
        const firebaseID = decodedToken.uid;

       
        const user = await User.findOne({ firebaseID: firebaseID });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.walletDescriptor) {
            return res.json({ message: 'true', Descriptor: user.walletDescriptor });
        } 
        
        return res.json({ message: 'false' });
    } catch (error) {
        if (error.code === 'auth/id-token-revoked') {
            return res.status(401).json({ success: false, message: 'Token has been revoked.' });
        } else if (error.code === 'auth/argument-error') {
            return res.status(400).json({ success: false, message: 'Invalid ID token.' });
        } else {
            return res.status(400).json({ success: false, message: 'Could not check if the user has a descriptor.' });
        }
    }
});


app.post('/api/hasPaidandKeys', async (req, res) =>  {
    try {
        const idToken = req.body.idToken;

        if (!idToken || typeof idToken !== 'string') {
            throw new Error('Invalid or missing ID token');
        }
        
        const decodedToken = await admin.auth().verifyIdToken(idToken, true);
        const firebaseID = decodedToken.uid;
        var hasKeys;
        const user = await User.findOne({firebaseID: firebaseID});
        if(!user){
            return res.status(404).json({ message: 'User not found' });
        }
        if(user.clientKeys){
            hasKeys = true;
        } else {
            hasKeys = false;
        }

        return res.json({keys: hasKeys, hasPaid: user.hasPaid});
    } catch (error) {
        res.status(400).json({ success: false, message: 'could not check if they have made a vault.' });
    }
});

app.post('/api/sendWallet', async (req, res) =>  {
    try {
        const idToken = req.body.idToken;

        if (!idToken || typeof idToken !== 'string') {
            throw new Error('Invalid or missing ID token');
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken, true);
        const firebaseID = decodedToken.uid;
        const clientKeys = req.body.clientKeys;
        const userInfo = req.body.userInfo;

        const user = await User.findOne({firebaseID: firebaseID});

        if (!user) {
             return res.status(404).json({ message: 'User not found' });
        }

        user.clientKeys = clientKeys;
        user.userInformation = userInfo;

        await user.save();
        console.log('Successfully make user');
        res.json({ message: 'Successfully initiated the vault create process, your vault should be ready shortly' });
    } catch (error) {
        console.error('could not create it:', error.message);
        res.status(400).json({ success: false, message: 'Could not create your vault, please try again later.' });
    }
});

app.post('/api/initiateUser', async (req, res) => {
    try {
        const email = req.body.email;
        const idToken = req.body.idToken;

        if (!idToken || typeof idToken !== 'string') {
            throw new Error('Invalid or missing ID token');
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken, true);
        const firebaseID = decodedToken.uid;
        
        const existingUser = await User.findOne({ firebaseID: firebaseID });
        
        if (existingUser) {
            return res.json({ message: 'User already initiated.' });
        }
        
            const user = new User({
                email: email,
                firebaseID: firebaseID,
                hasPaid: false
            });
        
        await user.save();

        console.log('Successfully made user');

        return res.json({ message: 'Successfully created user' });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: 'had trouble initializing your account.' });
    }
});

app.post('/api/setPayment', async (req, res) =>  {
    try {
        const idToken = req.body.idToken;

        if (!idToken || typeof idToken !== 'string') {
            throw new Error('Invalid or missing ID token');
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken, true);
        const firebaseID = decodedToken.uid;

        const user = await User.findOne({firebaseID: firebaseID});
        if(!user){
            return res.status(404).json({ message: 'User not found' });
        }

        user.hasPaid = true;
        
        await user.save();

        return res.json({message: 'Payment Successful'});
    } catch (error) {
        res.status(400).json({ success: false, message: 'could not check if they have made a vault.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
