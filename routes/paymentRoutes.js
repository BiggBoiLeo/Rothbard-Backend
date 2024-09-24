const express = require('express');
const paymentController = require('../controllers/paymentController');
const router = express.Router();

router.post('/setPayment', paymentController.setPayment);

module.exports = router;
