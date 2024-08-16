const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/subscribe', async (req, res) => {
    const { email } = req.body;
    const apiKey = process.env.API_KEY;
    const listId = process.env.LIST_ID;

    try {
        const response = await fetch(`https://emailoctopus.com/api/1.6/lists/${listId}/contacts?api_key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email_address: email,
                status: 'SUBSCRIBED'
            })
        });

        const data = await response.json();

        console.log('Response data:', data); // Log the response data for debugging

        if (data.error) {
            console.error('Error:', data.error.message);
            return res.status(400).json({ error: data.error.message });
        }

        res.status(200).json({ message: 'Thank you for signing up! You will receive an email with more details soon.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});


//SIGN UP HANDLER

app.use(express.json());

const mongoPass = process.env.DB_STRING;
// Database connection
mongoose.connect(mongoPass, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));

// Define User model
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String}
});

const User = mongoose.model('User', userSchema);


const gmailPass = process.env.GML_PASS;
// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'Gmail', // You can use different email services
    auth: {
        user: 'rothbardhelp@gmail.com',
        pass: gmailPass
    }
});

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

        res.redirect('https://rothbardbitcoin.com/login.html');
    } catch (error) {
        console.error('Error during email verification:', error);
        res.status(500).send({ success: false, message: 'Server error' });
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
               <a href="https://rothbard-backend.onrender.com/api/verify-email?token=${token}">Verify Email</a>`
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
