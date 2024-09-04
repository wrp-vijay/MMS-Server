const { User, Role, sequelize } = require('../models');
const logger = require('../helper/logger');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
require('dotenv').config();
const {
    FAILED_QUERY,
    DATA_NOT_FOUND,
    DATA_GET_SUCCESFULLY,
    DATA_UPDATE,
    DATA_DELETE,
    DATA_INSERT_SUCCESFULLY,
    LOGIN_SUCCESSFUL,
    INVALID_DETAILS,
    ALRADY_REGISTER
} = require('../helper/message');

// Create User
exports.createUser = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { firstName, lastName, email, password, mobile, city, role } = req.body;
        const image = req.file ? req.file.filename : null;

        const existingUser = await User.findOne({ where: { email } });

        if (existingUser) {
            await transaction.rollback();
            return res.status(409).json({ error: true, msg: `${email} ${ALRADY_REGISTER}` });
        }

        const hashPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password: hashPassword,
            mobile,
            city,
            role,
            image
        }, { transaction });

        await transaction.commit();
        res.status(200).json({ error: false, msg: DATA_INSERT_SUCCESFULLY, data: newUser });
    } catch (error) {
        await transaction.rollback();
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        // Compare the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: true, msg: INVALID_DETAILS });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET ||
            '28d333643037fd96e428ee1c2a12998856a9c93706965ba66024c8c2eff1a23213dec7c36142eb8704dac86d42f6eb6fbcea723459f6413a82b9aec2ae8092cd',
            { expiresIn: '10d' });
        // console.log(process.env.JWT_SECRET);
        res.status(200).json({ error: false, msg: LOGIN_SUCCESSFUL, token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId; // Extract userId from the payload
        console.log('userId' + userId);
        const userInstance = await User.findByPk(userId, {
            attributes: ['firstName', 'lastName', 'email', 'mobile', 'city', 'role', 'image']
        });

        if (!userInstance) {
            return res.status(404).json({ error: true, msg: 'User not found' });
        }

        res.status(200).json({ error: false, data: userInstance });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: true, msg: 'Failed to retrieve user profile', error: error.message });
    }
};

exports.editProfile = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const userId = req.user.userId; // Extract userId from the payload
        const userInstance = await User.findByPk(userId);

        if (!userInstance) {
            await transaction.rollback();
            return res.status(404).json({ error: true, msg: 'Data not found' });
        }

        // Check if password needs to be updated
        let updatedPassword = userInstance.password;
        if (req.body.password) {
            updatedPassword = await bcrypt.hash(req.body.password, 10);
        }

        const updatedUser = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: updatedPassword,
            mobile: req.body.mobile,
            city: req.body.city,
            role: req.body.role,
            image: req.file ? req.file.filename : userInstance.image // Handle image upload
        };

        await User.update(updatedUser, { where: { id: userId }, transaction });

        await transaction.commit();
        res.status(200).json({ error: false, msg: 'Profile updated successfully' });
    } catch (error) {
        if (transaction) {
            await transaction.rollback();
        }
        logger.error(error);
        res.status(500).json({ error: true, msg: 'Failed query', error: error.message });
    }
};

// Read Users (Get all users)
exports.getAllUsers = async (req, res) => {
    try {
        const { searchQuery = '', page = 1, limit = 10 } = req.query;

        const offset = (page - 1) * limit;

        const { count, rows: users } = await User.findAndCountAll({
            where: {
                [Op.or]: [
                    { firstName: { [Op.like]: `%${searchQuery}%` } },
                    { lastName: { [Op.like]: `%${searchQuery}%` } },
                    { email: { [Op.like]: `%${searchQuery}%` } }
                ]
            },
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        if (!users || users.length === 0) {
            return res.status(404).json({ error: true, msg: 'DATA_NOT_FOUND' });
        }

        res.status(200).json({
            error: false,
            msg: 'DATA_GET_SUCCESSFULLY',
            data: users,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: true, msg: 'FAILED_QUERY', error: error.message });
    }
};

// Read User by ID
exports.getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const userInstance = await User.findByPk(id);
        if (!userInstance) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: userInstance });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const userId = req.params.id;
        const userInstance = await User.findByPk(userId);

        if (!userInstance) {
            await transaction.rollback();
            return res.status(404).json({ error: true, msg: 'Data not found' });
        }

        // Prepare the updated fields object
        const updatedUser = {
            firstName: req.body.firstName || userInstance.firstName,
            lastName: req.body.lastName || userInstance.lastName,
            email: req.body.email || userInstance.email,
            mobile: req.body.mobile || userInstance.mobile,
            city: req.body.city || userInstance.city,
            role: req.body.role || userInstance.role,
            image: req.file ? req.file.filename : userInstance.image // Handle image upload
        };

        // Check if password needs to be updated
        if (req.body.password) {
            updatedUser.password = await bcrypt.hash(req.body.password, 10);
        }

        // Update the user
        await User.update(updatedUser, { where: { id: userId }, transaction });

        await transaction.commit();
        res.status(200).json({ error: false, msg: 'Data updated successfully' });
    } catch (error) {
        if (transaction) {
            await transaction.rollback();
        }
        logger.error(error);
        res.status(500).json({ error: true, msg: 'Failed to update user', error: error.message });
    }
};


// Delete User
exports.deleteUser = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const userId = req.params.id;
        const userInstance = await User.findByPk(userId);

        if (!userInstance) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        await User.destroy({ where: { id: userId }, transaction });

        await transaction.commit();
        res.status(200).json({ error: false, msg: DATA_DELETE });
    } catch (error) {
        await transaction.rollback();
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};
