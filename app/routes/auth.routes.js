const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');


router.post('/register', authController.register);


router.post('/login', authController.login);


router.post('/logout', authenticate, authController.logout);


router.post('/refresh-token', authController.refreshToken);


router.get('/me', authenticate, authController.getCurrentUser);


router.put('/change-password', authenticate, authController.changePassword);


router.post('/create-user', authenticate, authorize(['ADMIN']), authController.createBusinessUser);

module.exports = router;
