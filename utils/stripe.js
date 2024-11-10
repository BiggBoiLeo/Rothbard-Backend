require("dotenv").config();
const Stripe = require("stripe");

const isDevelopment =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
const stripeSecretKey = isDevelopment
  ? process.env.STRIPE_SECRET_KEY_TEST
  : process.env.STRIPE_SECRET_KEY_LIVE;
const stripeWebhookSecret = isDevelopment
  ? process.env.STRIPE_WEBHOOK_SECRET_TEST
  : process.env.STRIPE_WEBHOOK_SECRET_LIVE;

const stripe = new Stripe(stripeSecretKey);

function handleWebhook(req) {
  const sig = req.headers["stripe-signature"];
  try {
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      stripeWebhookSecret
    );
    return event;
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    throw error;
  }
}

module.exports = {
  stripe,
  handleWebhook,
};
