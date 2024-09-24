const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../server-test');  // Adjust based on your actual server file
const User = require('../models/userModel'); // Adjust based on your actual User model
const admin = require('../config/firebaseAdmin');
let mongoServer;

// Mock the User model
jest.mock('../models/userModel', () => {
    const mockUser = {
        save: jest.fn().mockResolvedValue(true), // Simulate saving the user
    };

    return {
        findOne: jest.fn().mockResolvedValue(null), // Simulate no existing user found
        // Use a constructor function for the mock
        new: jest.fn(() => mockUser), // Mock the constructor for User
        prototype: mockUser, // Ensure the prototype includes the save method
        // Ensure you return a mock constructor
        create: jest.fn().mockResolvedValue(mockUser),
    };
});

// Mock the Firebase Admin SDK
jest.mock('../config/firebaseAdmin', () => ({
    auth: jest.fn().mockReturnValue({
        verifyIdToken: jest.fn().mockImplementation(async (token) => {
            if (!token) {
                throw new Error('Invalid token');
            }
            // Simulate valid token behavior
            return { uid: 'validUID' };
        }),
    }),
    credential: {
        applicationDefault: jest.fn(),
    },
    initializeApp: jest.fn(),
}));

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri);
    }

    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: "https://rothbard-14907.firebaseio.com"
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(() => {
    User.findOne.mockClear(); // Clear mock calls before each test
    admin.auth().verifyIdToken.mockClear(); // Clear verifyIdToken calls
});

// Utility function to create a mock user
const mockValidUser = (overrides) => ({
    firebaseID: 'validUID',
    walletDescriptor: 'someDescriptor',
    hasPaid: true,
    clientKeys: ['key1', 'key2'],
    userInformation: 'info',
    ...overrides,
});

describe('POST /api/hasDescriptor', () => {
    let server;

    beforeAll(() => {
        server = app.listen(4002); // Start the server for testing
    });

    afterAll(() => {
        server.close(); // Close the server after testing
    });
    it('should return 200 and descriptor if user has one', async () => {
        const validUser = mockValidUser();
        User.findOne.mockResolvedValue(validUser);
        admin.auth().verifyIdToken.mockResolvedValue({ uid: validUser.firebaseID });

        const response = await request(app)
            .post('/api/hasDescriptor')
            .send({ idToken: 'validToken' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'true', Descriptor: 'someDescriptor' });
    });

    it('should return 200 with message false if user has no descriptor', async () => {
        const validUser = mockValidUser({ walletDescriptor: null });
        User.findOne.mockResolvedValue(validUser);
        admin.auth().verifyIdToken.mockResolvedValue({ uid: validUser.firebaseID });

        const response = await request(app)
            .post('/api/hasDescriptor')
            .send({ idToken: 'validToken' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'false' });
    });

    it('should return 404 if user not found', async () => {
        User.findOne.mockResolvedValue(null);
        admin.auth().verifyIdToken.mockResolvedValue({ uid: 'nonExistentUID' });

        const response = await request(app)
            .post('/api/hasDescriptor')
            .send({ idToken: 'validToken' });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'User not found' });
    });
});
describe('POST /api/hasPaidAndKeys', () => {
    it('should return 200 with keys and paid status', async () => {
        const validUser = mockValidUser();
        User.findOne.mockResolvedValue(validUser);
        admin.auth().verifyIdToken.mockResolvedValue({ uid: 'validUID' });

        const response = await request(app)
            .post('/api/hasPaidAndKeys')
            .send({ idToken: 'validToken' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ keys: true, hasPaid: true });
    });

    it('should return 404 if user not found', async () => {
        User.findOne.mockResolvedValue(null);
        admin.auth().verifyIdToken.mockResolvedValue({ uid: 'nonExistentUID' });

        const response = await request(app)
            .post('/api/hasPaidAndKeys')
            .send({ idToken: 'validToken' });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'User not found' });
    });

    it('should return 400 for invalid ID token', async () => {
        const response = await request(app)
            .post('/api/hasPaidAndKeys')
            .send({ idToken: null });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ success: false, message: 'could not check if they have made a vault.' });
    });
});

describe('POST /api/sendWallet', () => {
    it('should return 200 on successful wallet creation', async () => {
        const validUser = mockValidUser({ clientKeys: null, userInformation: null, save: jest.fn() });
        User.findOne.mockResolvedValue(validUser);
        admin.auth().verifyIdToken.mockResolvedValue({ uid: 'validUID' });

        const response = await request(app)
            .post('/api/sendWallet')
            .send({
                idToken: 'validToken',
                clientKeys: ['key1', 'key2'],
                userInfo: 'info'
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            message: "Successfully initiated the vault create process, your vault should be ready shortly",
        });
        expect(validUser.clientKeys).toEqual(['key1', 'key2']);
        expect(validUser.userInformation).toEqual('info');
        expect(validUser.save).toHaveBeenCalled();
    });

    it('should return 400 for invalid ID token', async () => {
        const response = await request(app)
            .post('/api/sendWallet')
            .send({ idToken: null });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ success: false, message: 'Could not create your vault, please try again later.' });
    });
});

