const mongoose = require('mongoose');

const dbConnect = () => {
    mongoose.connect(process.env.DB_STRING, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));
};

module.exports = dbConnect;