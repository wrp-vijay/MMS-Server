const express = require('express');
const router = express.Router();
const workOrderController = require('../conntroller/workorder');
const { verifyAccessToken, isValidPermissions } = require('../middleware/jwt');
const validate = require('../middleware/validatio');
const { workOrderSchema } = require('../helper/validationschema');
const rateLimit = require('express-rate-limit');

const reportRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1, // Limit each IP to 5 requests per windowMs
    message: "Too many requests for the report, please try again later."
});

router.post('/workorders', verifyAccessToken,isValidPermissions('WORKORDER.create'), validate(workOrderSchema), workOrderController.createWorkOrder);
router.get('/workorders', verifyAccessToken, isValidPermissions('WORKORDER.read'), workOrderController.getAllWorkOrders);
router.get('/generateWorkOrderReport', verifyAccessToken, isValidPermissions('WORKORDER.read'), workOrderController.generateWorkOrderReport);
router.get('/workorders/:id', verifyAccessToken, isValidPermissions('WORKORDER.read'), workOrderController.getWorkOrderById);
router.put('/workorders/:id', verifyAccessToken, isValidPermissions('WORKORDER.update'), workOrderController.updateWorkOrder);
router.put('/workorders/:id/status', verifyAccessToken, isValidPermissions('WORKORDER.update'), workOrderController.completeWorkOrder);
router.delete('/workorders/:id', verifyAccessToken, isValidPermissions('WORKORDER.delete'), workOrderController.deleteWorkOrder);

module.exports = router;