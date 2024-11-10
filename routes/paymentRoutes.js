const express = require("express");
const paymentController = require("../controllers/paymentController");
const webhookController = require("../controllers/webhookController");
const router = express.Router();

router.post("/setPayment", paymentController.setPayment);
router.get("/checkout", paymentController.getCheckoutDetails);
router.post("/create-checkout", paymentController.createCheckout);
router.post("/cancel-subscription", paymentController.cancelSubscription);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  webhookController.handleStripeEvent
);

module.exports = router;
