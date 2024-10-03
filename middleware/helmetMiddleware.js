const helmet = require('helmet');

// Security middleware
const helmetMiddleware = (req, res, next) => {
  helmet({
    frameguard: { action: 'deny' },  // Prevent clickjacking
    xssFilter: true                   // Protect against XSS attacks
  })(req, res, next);
};

module.exports = helmetMiddleware;
