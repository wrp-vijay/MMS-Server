const express = require('express');
const router = express.Router();
const orderItemController = require('../conntroller/orderitem');
const validate = require('../middleware/validatio');
const { orderItemSchema } = require('../helper/validationschema');

router.post('/orderItems', validate(orderItemSchema), orderItemController.createOrderItem);
router.get('/orderItems', orderItemController.getOrderItems);
router.get('/orderItems/:id', orderItemController.getOrderItemById);
router.put('/orderItems/:id', validate(orderItemSchema), orderItemController.updateOrderItem);
router.delete('/orderItems/:id', orderItemController.deleteOrderItem);

module.exports = router;
