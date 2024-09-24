const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../server-test'); // Assuming your app is exported here
const User = require('../models/userModel');
const admin = require('../config/firebaseAdmin');
let mongoServer;


jest.mock('../models/userModel', () => {
    const mockUser = {
        save: jest.fn().mockResolvedValue(true), // Simulate saving the user
    };

    return {
        findOne: jest.fn().mockResolvedValue(null), // Mock no existing user found
        deleteMany: jest.fn().mockResolvedValue({}), // Mock deleteMany
        // Mocking User constructor to return a mockUser instance
        constructor: jest.fn(() => mockUser), // Mock the constructor for User
        prototype: mockUser, // Ensure the prototype includes the save method
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
    // Start an in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    if (mongoose.connection.readyState === 0) {
        // Connect mongoose to the in-memory database
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    }

    // Initialize Firebase Admin SDK mock
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

afterEach(async () => {
    // Clean up the database after each test
    await User.deleteMany({});
});

fdescribe('initiateUser Controller', () => {
    let server;

    beforeAll(() => {
        server = app.listen(4000); // Start the server for testing
    });

    afterAll(() => {
        server.close(); // Close the server after testing
    });

    const mockUser = { email: 'test@example.com', firebaseID: 'abc123', hasPaid: false };

    beforeEach(() => {
        jest.clearAllMocks(); // Reset all mocks before each test
    });

    it('should return 400 if ID token is missing', async () => {
        const response = await request(app).post('/api/initiateUser').send({ email: 'test@example.com' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            success: false,
            message: 'Invalid or missing ID token',
        });
    });

    it('should return 400 if ID token is invalid', async () => {
        admin.auth().verifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

        const response = await request(app).post('/api/initiateUser').send({
            email: 'test@example.com',
            idToken: 'invalidToken',
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            success: false,
            message: 'Had trouble initializing your account.',
        });
    });

    it('should return message if user is already initiated', async () => {
        const mockDecodedToken = { uid: 'abc123' };
        admin.auth().verifyIdToken.mockResolvedValueOnce(mockDecodedToken);
        User.findOne.mockResolvedValueOnce(mockUser); // Mock existing user

        const response = await request(app).post('/api/initiateUser').send({
            email: 'test@example.com',
            idToken: 'validToken',
        });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'User already initiated.' });
    });
    it('should return 400 if there is an internal server error', async () => {
        admin.auth().verifyIdToken.mockRejectedValueOnce(new Error('Something went wrong'));

        const response = await request(app).post('/api/initiateUser').send({
            email: 'test@example.com',
            idToken: 'validToken',
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            success: false,
            message: 'Had trouble initializing your account.',
        });
    });
});
