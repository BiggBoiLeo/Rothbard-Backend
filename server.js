const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // Use require with node-fetch version 2.x
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Use the cors middleware
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'], // Allow specific methods
    allowedHeaders: ['Content-Type'] // Allow specific headers
}));

app.use(bodyParser.json());

app.post('/subscribe', async (req, res) => {
    const { email } = req.body;

    const apiKey = process.env.API_KEY;
    const listId = process.env.LIST_ID;

    try {
        const response = await fetch(`https://emailoctopus.com/api/1.6/lists/${listId}/contacts?api_key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email_address: email,
                status: 'SUBSCRIBED'
            })
        });

        const data = await response.json();

        console.log('Response data:', data); // Log the response data for debugging

        if (data.error) {
            console.error('Error:', data.error.message);
            return res.status(400).json({ error: data.error.message });
        }

        res.status(200).json({ message: 'Thank you for signing up! You will receive an email with more details soon.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
