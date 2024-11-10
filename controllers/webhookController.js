const User = require("../models/userModel");
const { handleWebhook } = require("../utils/stripe");

exports.handleStripeEvent = async (req, res) => {
  const event = handleWebhook(req);
  const data = event.data.object;

  try {
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(data);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(data);
        break;
      case "customer.subscription.paused":
        await handleSubscriptionPaused(data);
        break;
      case "customer.subscription.resumed":
        await handleSubscriptionResumed(data);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(data);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).send({ received: true });
  } catch (error) {
    console.error("Error handling Stripe event:", error);
    res.status(400).send({ error: "Webhook handler failed" });
  }
};

const handleSubscriptionCreated = async (subscription) => {
  const user = await User.findById(subscription.metadata.userId);
  if (user) {
    user.subscriptionStatus = subscription.status;
    user.subscriptionID = subscription.id;
    if (subscription.status === "active") {
      user.hasPaid = true;
    } else if (subscription.status === "incomplete") {
      console.log(
        "Subscription created, but status is incomplete. Waiting for payment."
      );
    }

    user.subscriptionPlan = subscription.items.data[0].price.product;
    await user.save();
  }
};

const handleSubscriptionDeleted = async (subscription) => {
  const user = await User.findById(subscription.metadata.userId);
  if (user) {
    user.subscriptionStatus = "cancelled";
    user.hasPaid = false;
    await user.save();
  }
};

const handleSubscriptionPaused = async (subscription) => {
  const user = await User.findById(subscription.metadata.userId);
  if (user) {
    user.subscriptionStatus = "paused";
    user.hasPaid = false;
    await user.save();
  }
};

const handleSubscriptionResumed = async (subscription) => {
  const user = await User.findById(subscription.metadata.userId);
  if (user) {
    user.subscriptionStatus = "active";
    user.hasPaid = true;
    await user.save();
  }
};

const handleSubscriptionUpdated = async (subscription) => {
  const user = await User.findById(subscription.metadata.userId);
  if (user) {
    user.subscriptionStatus = subscription.status;

    if (subscription.status === "active") {
      user.hasPaid = true;
    }

    await user.save();
  }
};
