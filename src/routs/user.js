const express = require('express');
const router = express.Router();
const userController = require('../conntroller/user');
const upload = require('../helper/multerConfig'); // Import multer config
const validate = require('../middleware/validatio');
const { userSchema, loginSchema } = require('../helper/validationschema');
const { verifyAccessToken, isValidPermissions } = require('../middleware/jwt');

// Create User with image upload
router.post('/users', verifyAccessToken, upload.single('image'), validate(userSchema), userController.createUser);
router.post('/login', validate(loginSchema), userController.login);

// Get all Users
router.get('/users', verifyAccessToken, isValidPermissions('USER.read'), userController.getAllUsers);
router.get('/profile', verifyAccessToken, userController.getUserProfile);

// Get User by ID
router.get('/users/:id', verifyAccessToken, isValidPermissions('USER.read'), userController.getUserById);

// Update User with image upload
router.put('/users/:id', verifyAccessToken, isValidPermissions('USER.update'), upload.single('image'), userController.updateUser);
router.put('/edit-profile', verifyAccessToken, upload.single('image'), userController.editProfile);

// Delete User
router.delete('/users/:id', verifyAccessToken, isValidPermissions('USER.delete'), userController.deleteUser);

module.exports = router;

