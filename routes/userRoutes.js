const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

router.post('/hasDescriptor', userController.hasDescriptor);
router.post('/hasPaidandKeys', userController.hasPaidAndKeys);
router.post('/sendWallet', userController.sendWallet);
router.post('/initiateUser', userController.initiateUser);

module.exports = router;
