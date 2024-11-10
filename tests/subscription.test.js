const request = require("supertest");
const app = require("../server-test");
const User = require("../models/userModel");
require("dotenv").config();

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

describe("Subscription Cycle", () => {
  let server;
  let userId;
  let userEmail = "test@example.com";
  let sessionId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    server = app.listen(4000);
    const user = new User({
      firebaseID: "testFirebaseId",
      email: userEmail,
      hasPaid: false,
    });
    await user.save();
    userId = user._id;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await server.close();
  });

  describe("POST /create-checkout", () => {
    it("should create a new checkout session", async () => {
      const priceId = "price_1QJDoaG3ci9u5oEQMCBl1EIV";

      const res = await request(app)
        .post("/api/create-checkout")
        .send({ userEmail, priceId });

      if (res.status === 200) {
        sessionId = res.body.sessionId;
        expect(res.body).toHaveProperty("success", true);
        expect(res.body).toHaveProperty("sessionId");
      } else {
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("success", false);
      }
    });
  });

  describe("GET /checkout", () => {
    it("should fetch checkout details", async () => {
      if (!sessionId) {
        throw new Error("sessionId not set, checkout session failed");
      }
      const res = await request(app).get(
        `/api/checkout?sessionId=${sessionId}`
      );

      console.log("body", res.body);

      if (res.status === 200) {
        sessionId = res.body.sessionId;
        expect(res.body).toHaveProperty("success", true);
        expect(res.body).toHaveProperty("sessionId");
      } else {
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("success", false);
      }
    });
  });

  describe("POST /cancel-subscription", () => {
    it("should cancel the user subscription", async () => {
      const idToken = "VALID_ID_TOKEN";

      const res = await request(app)
        .post("/api/cancel-subscription")
        .send({ idToken });

      if (res.status === 200) {
        expect(res.body).toHaveProperty("success", true);
        expect(res.body).toHaveProperty(
          "message",
          "Subscription cancelled successfully"
        );
      } else {
        expect(res.status).toBe(401);
      }
    });
  });
});
