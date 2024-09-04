const express = require('express');
const router = express.Router();
const productController = require('../conntroller/product');
const validate = require('../middleware/validatio');
const { productSchema } = require('../helper/validationschema');
const { verifyAccessToken, isValidPermissions } = require('../middleware/jwt');
const rateLimit = require('express-rate-limit');

const reportRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1, // Limit each IP to 5 requests per windowMs
    message: "Too many requests for the report, please try again later."
});

router.post('/products',verifyAccessToken, isValidPermissions('PRODUCT.create'), validate(productSchema), productController.createProduct);
router.get('/products', verifyAccessToken, isValidPermissions('PRODUCT.read'), productController.getAllProducts);
router.get('/mostsellingproduct-report', verifyAccessToken, isValidPermissions('REPORT.read'), productController.MostSellingProductsReport);
router.get('/products/ready-good', verifyAccessToken, isValidPermissions('PRODUCT.read'), productController.getAllReadyGoodProducts);
router.get('/products/raw-material', verifyAccessToken, isValidPermissions('PRODUCT.read'), productController.getAllRawMaterialProducts);
router.get('/products/:id', verifyAccessToken, isValidPermissions('PRODUCT.read'), productController.getProductById);
router.put('/products/:id', verifyAccessToken, isValidPermissions('PRODUCT.update'), validate(productSchema), productController.updateProduct);
router.delete('/products/:id', verifyAccessToken, isValidPermissions('PRODUCT.delete'), productController.deleteProduct);

module.exports = router;
