const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../server-test");
const User = require("../models/userModel");

describe("Webhook Route", () => {
  let server;
  let mongoServer;
  let user;
  let userId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    server = app.listen(4001);
    user = new User({
      firebaseID: "testFirebaseId",
      email: "test@example.com",
      hasPaid: false,
      subscriptionStatus: null,
      subscriptionID: null,
    });
    await user.save();
    userId = user._id;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
    await server.close();
  });

  const sendWebhookRequest = async (eventType, dataObject) => {
    return await request(app)
      .post("/api/webhook")
      .set("Content-Type", "application/json")
      .send({
        type: eventType,
        data: { object: dataObject },
      });
  };

  test("handles 'customer.subscription.created' event", async () => {
    const res = await sendWebhookRequest("customer.subscription.created", {
      id: "sub_test_123",
      status: "active",
      metadata: { userId: userId.toString() },
      items: {
        data: [{ price: { product: "prod_test_123" } }],
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    const updatedUser = await User.findById(userId);
    expect(updatedUser.subscriptionStatus).toBe("active");
    expect(updatedUser.hasPaid).toBe(true);
    expect(updatedUser.subscriptionID).toBe("sub_test_123");
  });

  test("handles 'customer.subscription.deleted' event", async () => {
    const res = await sendWebhookRequest("customer.subscription.deleted", {
      id: "sub_test_123",
      status: "canceled",
      metadata: { userId: userId.toString() },
    });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    const updatedUser = await User.findById(userId);
    expect(updatedUser.subscriptionStatus).toBe("cancelled");
    expect(updatedUser.hasPaid).toBe(false);
  });

  test("handles 'customer.subscription.paused' event", async () => {
    const res = await sendWebhookRequest("customer.subscription.paused", {
      id: "sub_test_123",
      status: "paused",
      metadata: { userId: userId.toString() },
    });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    const updatedUser = await User.findById(userId);
    expect(updatedUser.subscriptionStatus).toBe("paused");
    expect(updatedUser.hasPaid).toBe(false);
  });

  test("handles 'customer.subscription.resumed' event", async () => {
    const res = await sendWebhookRequest("customer.subscription.resumed", {
      id: "sub_test_123",
      status: "active",
      metadata: { userId: userId.toString() },
    });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    const updatedUser = await User.findById(userId);
    expect(updatedUser.subscriptionStatus).toBe("active");
    expect(updatedUser.hasPaid).toBe(true);
  });

  test("handles 'customer.subscription.updated' event", async () => {
    const res = await sendWebhookRequest("customer.subscription.updated", {
      id: "sub_test_123",
      status: "active",
      metadata: { userId: userId.toString() },
    });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    const updatedUser = await User.findById(userId);
    expect(updatedUser.subscriptionStatus).toBe("active");
    expect(updatedUser.hasPaid).toBe(true);
  });

  test("handles unhandled event type", async () => {
    const res = await sendWebhookRequest("some.unhandled.event", {
      id: "unhandled_test",
      metadata: { userId: userId.toString() },
    });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    // Verify no change in the user's subscription status
    const unchangedUser = await User.findById(userId);
    expect(unchangedUser.subscriptionStatus).toBe("active");
  });
});
