const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../server-test');  // Adjust based on your actual server file
const User = require('../models/userModel'); // Adjust based on your actual User model
const admin = require('../config/firebaseAdmin');
let mongoServer;

beforeAll(async () => {
    // Start an in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    if (mongoose.connection.readyState === 0) {
        // Connect mongoose to the in-memory database
        await mongoose.connect(uri);
    }

    // Initialize Firebase Admin SDK
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: "https://rothbard-14907.firebaseio.com"
    });
});

afterAll(async () => {
    // Disconnect from the in-memory database and stop the server
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    // Clear the database before each test
    await User.deleteMany({});
});

describe('POST /api/isPrivate', () => {
    let server;

    beforeAll(() => {
        server = app.listen(4004); // Start the server for testing
    });

    afterAll(() => {
        server.close(); // Close the server after testing
    });
    it('should return 400 if idToken is missing or invalid', async () => {
        const response = await request(app)
            .post('/api/isPrivate')
            .send({ idToken: '' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ success: false, message: 'Invalid or missing ID token' });
    });

    it('should return 404 if user is not found', async () => {
        // Mock Firebase verifyIdToken to return a valid UID
        admin.auth().verifyIdToken = jest.fn().mockResolvedValue({ uid: 'nonExistentUserUID' });

        // Mock the User model to return null
        User.findOne = jest.fn().mockResolvedValue(null);

        const response = await request(app)
            .post('/api/isPrivate')
            .send({ idToken: 'validToken' });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'User not found' });
    });


    it('should return 200 and isPrivate status if user is found', async () => {
        // Create a mock user without saving to the actual database
        const validUser = {
            firebaseID: 'validFirebaseUID',
            email: 'user@example.com',
            userInformation: 'null123'
        };

        // Mock the User model to return the valid user when queried
        User.findOne = jest.fn().mockResolvedValue(validUser);

        // Mock Firebase verifyIdToken to return the valid UID
        admin.auth().verifyIdToken = jest.fn().mockResolvedValue({ uid: 'validFirebaseUID' });

        const response = await request(app)
            .post('/api/isPrivate')
            .send({ idToken: 'validToken' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ isPrivate: true });
    });

});

describe('POST /api/accountDelete', () => {
    it('should return 400 if idToken is missing or invalid', async () => {
        const response = await request(app)
            .post('/api/accountDelete')
            .send({ idToken: '' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ success: false, message: 'Invalid or missing ID token' });
    });

    it('should return 404 if user is not found', async () => {
        // Mock Firebase verifyIdToken to return a non-existent UID
        admin.auth().verifyIdToken = jest.fn().mockResolvedValue({ uid: 'nonExistentUserUID' });

        // Mock the User model to return null when looking for the user
        User.findOne = jest.fn().mockResolvedValue(null); // User not found

        const response = await request(app)
            .post('/api/accountDelete')
            .send({ idToken: 'validToken' });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'User not found' });
    });


    it('should return 200 and initiate deletion process if user is found', async () => {
        // Mock a valid user object
        const validUser = {
            firebaseID: 'validFirebaseUID',
            email: 'user@example.com',
            wantsDelete: false,
            save: jest.fn() // Mock save function
        };

        // Mock User.findOne to return the valid user
        User.findOne = jest.fn().mockResolvedValue(validUser);

        // Mock Firebase verifyIdToken to return the valid UID
        admin.auth().verifyIdToken = jest.fn().mockResolvedValue({ uid: 'validFirebaseUID' });

        const response = await request(app)
            .post('/api/accountDelete')
            .send({ idToken: 'validToken' }); // Make sure this token is what your function expects

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'Successfully initiated the deletion process.' });

        // Verify that wantsDelete has been set to true
        expect(validUser.wantsDelete).toBe(true);
        expect(validUser.save).toHaveBeenCalled(); // Ensure save was called
    });


});
