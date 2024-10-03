const express = require('express');
const corsMiddleware = require('./middleware/corsMiddleware');
const helmetMiddleware = require('./middleware/helmetMiddleware');
const dbConnect = require('./config/db');
const cookieParser = require('cookie-parser');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dotenv = require('dotenv');
const accountController = require('./controllers/accountController');

// Environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;


// Apply security headers and middleware
app.use(helmetMiddleware);
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');  // Disable caching for testing
    next();
  });
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

// CORS middleware
app.use(corsMiddleware);

// Firebase Admin SDK
require('./config/firebaseAdmin');

// MongoDB
dbConnect();

app.use('/api', userRoutes);
app.use('/api', paymentRoutes);
app.post('/api/isPrivate', accountController.isPrivate);
app.post('/api/accountDelete', accountController.accountDelete);

// Start
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;
