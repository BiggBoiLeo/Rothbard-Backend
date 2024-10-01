const express = require('express');
const corsMiddleware = require('./middleware/corsMiddleware');
const dbConnect = require('./config/db');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dotenv = require('dotenv');
const accountController = require('./controllers/accountController');

// Environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: false,  // Disable CSP from Helmet because I'm setting it manually
    frameguard: { action: 'deny' }
}));
  

// Manually set Content-Security-Policy header
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' maxcdn.bootstrapcdn.com");
    next();
});


// Apply security headers and middleware
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

// CORS middleware
app.use(corsMiddleware);

// Initialize Firebase Admin SDK
require('./config/firebaseAdmin');

// Connect to MongoDB
dbConnect();

// Define routes
app.use('/api', userRoutes);
app.use('/api', paymentRoutes);
app.post('/api/isPrivate', accountController.isPrivate);
app.post('/api/accountDelete', accountController.accountDelete);

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});


module.exports = app;
