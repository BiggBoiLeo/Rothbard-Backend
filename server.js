const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Apply security headers with Helmet
app.use(helmet());

app.set('trust proxy', 1);

// CORS configuration
const allowedOrigins = [
    'https://rothbardbitcoin.com',
    'https://test.rothbardbitcoin.com'
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

// Define User model
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    firstName: {type: String, default: null},
    lastName: {type: String, default: null},
    DOB: {type: String, default: null}
});

const User = mongoose.model('User', userSchema);

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.GML_USER,
        pass: process.env.GML_PASS
    }
});

// // Rate limiting middleware for login attempts
// const loginLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 5, // Limit each IP to 5 login attempts per windowMs
//     message: 'Too many login attempts from this IP, please try again later.'
// });

// app.use('/api/login', loginLimiter);

// Sign-Up Endpoint
app.post('/api/signup', async (req, res) => {
    try {
        const email = req.body.email.trim();
        const password = req.body.password;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).send({ success: false, message: 'Email already exists' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Create new user
        user = new User({
            email,
            password: hashedPassword,
            verificationToken
        });

        await user.save();

        // Send verification email
        sendVerificationEmail(user.email, user.verificationToken);

        res.send({ success: true, message: 'User registered successfully. Please check your email to verify your account.' });

    } catch (error) {
        console.error('Error during sign-up:', error);
        res.status(500).send({ success: false, message: 'Server error' });
    }
});

// Resend Verification Email Endpoint
app.post('/api/resend-verify', async (req, res) => {
    try {
        const email = req.body.email.trim();
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).send({ success: false, message: 'There is no account using that email.' });
        }
        if (user.isVerified) {
            return res.status(400).send({ success: false, message: 'Account is already verified.' });
        }

        sendVerificationEmail(user.email, user.verificationToken);
        res.send({ success: true, message: 'Please check your email to verify your account.' });
    } catch (error) {
        console.error('Error resending email:', error);
        res.status(500).send({ success: false, message: 'Server error' });
    }
});

// Email Verification Endpoint
app.get('/api/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        // Find user with matching verification token
        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).send({ success: false, message: 'Invalid token' });
        }

        // Update user to verified
        await User.findByIdAndUpdate(user._id, {
            isVerified: true,
            $unset: { verificationToken: "" }
        });

        res.redirect('https://test.rothbardbitcoin.com/login.html');
    } catch (error) {
        console.error('Error during email verification:', error);
        res.status(500).send({ success: false, message: 'Server error' });
    }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send({ success: false, message: 'Invalid email or password' });
        }

        // Check the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send({ success: false, message: 'Invalid email or password' });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(400).send({ success: false, message: 'Email not verified' });
        }

        // Create a JWT token and store it in a cookie
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, { 
            httpOnly: true, 
            sameSite: 'lax', 
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week 
        });
        res.send({ success: true, message: 'User logged in successfully.' });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send({ success: false, message: 'Server error' });
    }
});

// Logout Endpoint
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.send({ success: true, message: 'Logout successful' });
});

app.post('/api/updateProfile', async (req, res) => {
    try {
        const userId = req.user.userId;
        const first = req.body.enterFirst.trim();
        const last = req.body.enterLast.trim();
        const DOB = req.body.enterDOB.trim();
        const user = await User.findOne( userId);
        
        if (!user) {
            return res.status(400).send({ success: false, message: 'There is no account using that email.' });
        }
        if(first.length > 20){
            return res.status(400).send({ success: false, message: 'First name you inputted was too long.' });
        }
        if(last.length > 20){
            return res.status(400).send({ success: false, message: 'Last name you inputted was too long.' });
        }

        user.firstName = first;
        user.lastName = last;
        user.DOB = DOB;


        res.send({ success: true, message: 'Successfully changed user info.' });
    } catch (error) {
        console.error('Error changing user info:', error);
        res.status(500).send({ success: false, message: 'Server error' });
    }
});

// User Status Endpoint
app.get('/api/user-status', (req, res) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.json({ loggedIn: false });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.json({ loggedIn: false });
        }
        
        res.json({ loggedIn: true });
    });
});

//gets the information from their profile to use on the website
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        // Use req.user to get user information
        const userId = req.user.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ email: user.email, first:user.firstName, last:user.lastName, DOB:user.DOB, isVerified: user.isVerified });
    } catch (error) {
        console.error('Error retrieving user profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Function to send verification email
function sendVerificationEmail(email, token) {
    const mailOptions = {
        from: 'no-reply@rothbardbitcoin.com',
        to: email,
        subject: 'Email Verification',
        html: `<h3>Thank you for signing up with Rothbard!</h3>
               <p>Please click the link below to verify your email:</p>
               <a href="${process.env.API_BASE_URL}/api/verify-email?token=${token}">Verify Email</a>`
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

function authenticateToken(req, res, next) {
    const token = req.cookies.token; // Get the token from the cookies
    
    if (!token) {
        return res.status(401).json({ message: 'Access denied' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        
        // Attach user info to request object
        req.user = user;
        next();
    });
}

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
