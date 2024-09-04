const express = require('express');
const router = express.Router();
const notificationController = require('../conntroller/notification');
const { verifyAccessToken } = require('../middleware/jwt');

// Order routes
router.get('/getNotification', verifyAccessToken, notificationController.getNotification);
router.get('/notifications', verifyAccessToken, notificationController.getNotificationSpecificUser);
router.get('/getUnreadCount', verifyAccessToken, notificationController.getUnreadNotificationCount);
router.post('/markAllAsRead', verifyAccessToken, notificationController.markAllNotificationsAsRead); // New route

module.exports = router;
