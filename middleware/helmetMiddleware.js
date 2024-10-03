const helmet = require('helmet');

// Security middleware
const helmetMiddleware = (req, res, next) => {
  helmet()(req, res, next);
  helmet.frameguard({ action: 'deny' })(req, res, next); 
  helmet.xssFilter()(req, res, next); 
};

module.exports = helmetMiddleware;