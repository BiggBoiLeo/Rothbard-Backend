const express = require('express');
const corsMiddleware = require('./middleware/corsMiddleware');
const dbConnect = require('./config/db');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dotenv = require('dotenv');
const accountController = require('./controllers/accountController');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Apply security headers and middleware
app.use(helmet());
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

// CORS middleware
app.use(corsMiddleware);

// Initialize Firebase Admin SDK
require('./config/firebaseAdmin');

// Define routes
app.use('/api', userRoutes);
app.use('/api', paymentRoutes);
app.post('/api/isPrivate', accountController.isPrivate);
app.post('/api/accountDelete', accountController.accountDelete);
module.exports = app;