const cors = require("cors");

const allowedOrigins = [
  "https://rothbardbitcoin.com",
  "https://rothbardbitcoin.web.app",
  "https://api.rothbardbitcoin.com",
  "http://localhost:3001",
  "http://localhost:5173",
];

const corsMiddleware = cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
});

module.exports = corsMiddleware;
