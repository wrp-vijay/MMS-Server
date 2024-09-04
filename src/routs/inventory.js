const express = require('express');
const router = express.Router();
const inventoryHistoryController = require('../conntroller/inventory');
const { verifyAccessToken, isValidPermissions } = require('../middleware/jwt');
const rateLimit = require('express-rate-limit');
const reportRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1, // Limit each IP to 5 requests per windowMs
    message: "Too many requests for the report, please try again later."
});

// Create InventoryHistory
// router.post('/inventory', validateBody(inventoryHistorySchema), inventoryHistoryController.createInventoryHistory);

// Get All InventoryHistory
router.get('/inventory', inventoryHistoryController.getAllInventoryHistory);

// Get InventoryHistory by ID
router.get('/inventory/:id', inventoryHistoryController.getInventoryHistoryById);
router.get('/product/inventory/:productId',  inventoryHistoryController.getInventoryByproductId);
router.get('/inventoryhistory-report', verifyAccessToken, isValidPermissions('REPORT.read'), inventoryHistoryController.generateInventoryHistoryReport);


// Update InventoryHistory
router.put('/inventory/:id', inventoryHistoryController.updateInventoryHistory);

// Delete InventoryHistory
router.delete('/inventory/:id', inventoryHistoryController.deleteInventoryHistory);

module.exports = router;
