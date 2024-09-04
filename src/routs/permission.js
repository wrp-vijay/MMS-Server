const express = require('express');
const router = express.Router();
const roleController = require('../conntroller/permission'); // Adjust the path as needed
const { verifyAccessToken, isValidPermissions } = require('../middleware/jwt');

// Create a new role
router.post('/roles', roleController.createRole);

// Get all roles
router.get('/roles', verifyAccessToken, isValidPermissions('PERMISSION.read'), roleController.getAllRoles);
router.get('/permissions', verifyAccessToken, isValidPermissions('PERMISSION.read'), roleController.getAllPermission);

// Get a role by ID
router.get('/roles/:id', verifyAccessToken, isValidPermissions('PERMISSION.read'), roleController.getRoleById);

// Update a role
router.put('/permissions', verifyAccessToken, isValidPermissions('PERMISSION.update'), roleController.updatePermissions);

// Delete a role
router.delete('/roles/:id', verifyAccessToken, isValidPermissions('PERMISSION.delete'), roleController.deleteRole);

module.exports = router;