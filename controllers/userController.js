const User = require("../models/userModel");
const admin = require("../config/firebaseAdmin");

exports.hasDescriptor = async (req, res) => {
  try {
    const idToken = req.body.idToken;

    if (!idToken || typeof idToken !== "string") {
      throw new Error("Invalid or missing ID token");
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken, true);
    const firebaseID = decodedToken.uid;

    const user = await User.findOne({ firebaseID: firebaseID });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.walletDescriptor) {
      return res.json({ message: "true", Descriptor: user.walletDescriptor });
    }

    return res.json({ message: "false" });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

exports.hasPaidAndKeys = async (req, res) => {
  try {
    const idToken = req.body.idToken;

    if (!idToken || typeof idToken !== "string") {
      throw new Error("Invalid or missing ID token");
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken, true);
    const firebaseID = decodedToken.uid;
    var hasKeys;
    const user = await User.findOne({ firebaseID: firebaseID });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.clientKeys) {
      hasKeys = true;
    } else {
      hasKeys = false;
    }

    return res.json({
      keys: hasKeys,
      hasPaid: user.hasPaid,
      hasPaidConsultation: user.hasPaidConsultation,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "could not check if they have made a vault.",
    });
  }
};

exports.sendWallet = async (req, res) => {
  try {
    const idToken = req.body.idToken;
    if (!idToken || typeof idToken !== "string") {
      throw new Error("Invalid or missing ID token");
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken, true);
    const firebaseID = decodedToken.uid;
    const clientKeys = req.body.clientKeys;
    const userInfo = req.body.userInfo;
    const user = await User.findOne({ firebaseID: firebaseID });
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }
    user.clientKeys = clientKeys;
    user.userInformation = userInfo;
    await user.save();
    res.json({
      message:
        "Successfully initiated the vault create process, your vault should be ready shortly",
    });
  } catch (error) {
    console.error("could not create it:", error.message);
    res.status(400).json({
      success: false,
      message: "Could not create your vault, please try again later.",
    });
  }
};

exports.initiateUser = async (req, res) => {
  try {
    const { email, idToken } = req.body;

    if (!idToken || typeof idToken !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing ID token" });
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseID = decodedToken.uid;
    // Check if the user already exists in the database
    const existingUser = await User.findOne({ firebaseID: firebaseID });
    if (existingUser) {
      return res.json({ message: "User already initiated." });
    }

    // Create a new user in the database
    const user = new User({
      email,
      firebaseID,
      hasPaid: false,
    });

    await user.save(); // Save the new user to the database
    return res.json({ success: true, message: "Successfully created user" });
  } catch (error) {
    console.error("Error initializing user:", error.message);
    return res.status(400).json({
      success: false,
      message: "Had trouble initializing your account.",
    });
  }
};
