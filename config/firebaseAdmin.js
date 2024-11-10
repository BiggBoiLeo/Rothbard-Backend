const admin = require("firebase-admin");
require("dotenv").config();

if (process.env.NODE_ENV !== "test") {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
