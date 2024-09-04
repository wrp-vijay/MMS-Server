const express = require('express');
const router = express.Router();
const orderController = require('../conntroller/order');
const validate = require('../middleware/validatio');
const { orderSchema, orderUpdateSchema } = require('../helper/validationschema');
const { verifyAccessToken, isValidPermissions } = require('../middleware/jwt');
const rateLimit = require('express-rate-limit');

const reportRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1, // Limit each IP to 5 requests per windowMs
    message: "Too many requests for the report, please try again later."
});

// Order routes
router.post('/orders',verifyAccessToken, isValidPermissions('ORDER.create'), validate(orderSchema), orderController.createOrder);
router.get('/getOrders',verifyAccessToken, isValidPermissions('ORDER.read'), orderController.getOrders);
router.get('/generateOrderReport', verifyAccessToken, orderController.generateOrderReport);
// router.get('/order-report',verifyAccessToken, reportRateLimiter, orderController.generateOrderReport);
router.get('/orders/:id',verifyAccessToken, isValidPermissions('ORDER.read'), orderController.getOrderById);
router.put('/orders/:id',verifyAccessToken, isValidPermissions('ORDER.update'), validate(orderSchema), orderController.updateOrder);
router.delete('/orders/:id',verifyAccessToken, isValidPermissions('ORDER.delete'), orderController.deleteOrder);

module.exports = router;
