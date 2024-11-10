const User = require("../models/userModel");
const admin = require("../config/firebaseAdmin");
const { stripe } = require("../utils/stripe");

const verifyToken = async (idToken) => {
  return await admin.auth().verifyIdToken(idToken, true);
};

exports.setPayment = async (req, res) => {
  try {
    const idToken = req.body.idToken;

    if (!idToken || typeof idToken !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing ID token" });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(idToken);
    } catch (error) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid ID token" });
    }

    const firebaseID = decodedToken.uid;

    const user = await User.findOne({ firebaseID: firebaseID });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.hasPaid = true;
    await user.save();

    return res.json({ message: "Payment Successful" });
  } catch (error) {
    console.error(error); // Log errors for debugging purposes
    return res
      .status(500)
      .json({ success: false, message: "Error setting payment." });
  }
};

exports.getCheckoutDetails = async (req, res) => {
  try {
    let { sessionId } = req.query;
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product"],
    });

    const customer = await stripe.customers.retrieve(session.customer);

    let productName = "Unknown Product";
    if (session.line_items && session.line_items.data.length > 0) {
      const lineItem = session.line_items.data[0];
      productName = lineItem.price.product.name;
    }

    return res.status(200).json({
      message: "Checkout details fetched!",
      result: {
        plan: productName,
        amount: session.amount_total / 100,
        currency: session.currency,
        customer: customer.email,
        status: session.status,
      },
    });
  } catch (err) {
    console.error("Error getting checkout session:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create checkout session" });
  }
};

exports.createCheckout = async (req, res) => {
  try {
    const { userEmail, priceId } = req.body;

    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!priceId) {
      return res
        .status(400)
        .json({ success: false, message: "Price ID is required" });
    }

    if (user.subscriptionStatus === "active")
      return res
        .status(400)
        .json({ success: false, message: "User already subscribed!" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${
        req.headers.origin || "http://localhost:3000"
      }/vault?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || "http://localhost:3000"}/vault`,
      subscription_data: {
        metadata: {
          userId: user._id.toString(),
          userEmail: user.email,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Checkout session created successfully",
      sessionId: session.id,
    });
  } catch (err) {
    console.error("Error creating checkout session:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create checkout session" });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing ID token" });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(idToken);
    } catch (error) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid ID token" });
    }

    const firebaseID = decodedToken.uid;

    const user = await User.findOne({ firebaseID: firebaseID });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.subscriptionID === null) {
      return res
        .status(400)
        .json({ success: false, message: "No active subscription found" });
    }

    const subscription = await stripe.subscriptions.retrieve(
      user.subscriptionID
    );

    if (subscription.status === "active") {
      await stripe.subscriptions.cancel(user.subscriptionID);

      return res.status(200).json({
        success: true,
        message: "Subscription cancelled successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Subscription is not active",
      });
    }
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return res.status(500).json({
      success: false,
      message: "Error canceling subscription",
    });
  }
};

exports.verifyToken = verifyToken;
