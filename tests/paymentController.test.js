// paymentController.test.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../server-test'); // Adjust based on your actual server file
const User = require('../models/userModel'); // Adjust based on your actual User model
const admin = require('../config/firebaseAdmin');
let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri); // Simplified: Always connect since we are in-memory
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: "https://rothbard-14907.firebaseio.com"
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await User.deleteMany({});
});

describe('POST /api/setPayment', () => {
    let server;

    beforeAll(() => {
        server = app.listen(4001);
    });

    afterAll(() => {
        server.close();
    });

    it('should return 400 if idToken is missing or invalid', async () => {
        const response = await request(app)
            .post('/api/setPayment')
            .send({ idToken: '' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ success: false, message: 'Invalid or missing ID token' });
    });

    it('should return 401 if idToken is not valid', async () => {
        // Mock the verification to always reject
        admin.auth().verifyIdToken = jest.fn().mockRejectedValue(new Error('Invalid ID token'));

        const response = await request(app)
            .post('/api/setPayment')
            .send({ idToken: 'invalidToken' });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ success: false, message: 'Invalid ID token' });
    });

    it('should return 404 if user is not found', async () => {
        admin.auth().verifyIdToken = jest.fn().mockResolvedValue({ uid: 'nonExistentUserUID' });

        const response = await request(app)
            .post('/api/setPayment')
            .send({ idToken: 'validToken' });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'User not found' });
    });

    it('should return 200 and set hasPaid to true if payment is successful', async () => {
        const validUser = new User({
            firebaseID: 'validFirebaseUID',
            email: 'user@example.com',
            hasPaid: false
        });
        await validUser.save();
        admin.auth().verifyIdToken = jest.fn().mockResolvedValue({ uid: 'validFirebaseUID' });

        const response = await request(app)
            .post('/api/setPayment')
            .send({ idToken: 'validToken' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'Payment Successful' });

        const updatedUser = await User.findOne({ firebaseID: 'validFirebaseUID' });
        expect(updatedUser.hasPaid).toBe(true);
    });
});
