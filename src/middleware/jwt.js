// const jwt = require('jsonwebtoken');
// const { TOKEN_MISSING, INVALID_TOKEN } = require('../helper/message');
// require('dotenv').config();

// const verifyAccessToken = (req, res, next) => {
//     if (!req.headers['authorization']) {
//         return res.status(401).json({ error: true, msg: TOKEN_MISSING });
//     }

//     const authHeader = req.headers['authorization'];
//     const token = authHeader.split(' ')[1];

//     jwt.verify(token, process.env.JWT_SECRET || '28d333643037fd96e428ee1c2a12998856a9c93706965ba66024c8c2eff1a23213dec7c36142eb8704dac86d42f6eb6fbcea723459f6413a82b9aec2ae8092cd', (err, payload) => {
//         if (err) {
//             return res.status(401).json({ error: true, msg: INVALID_TOKEN });
//         }
//         req.user = payload; // Assign payload to req.user
//         next();
//     });
// };


// module.exports = { verifyAccessToken };


const jwt = require('jsonwebtoken');
const { TOKEN_MISSING, INVALID_TOKEN, FORBIDDEN_MESSAGE } = require('../helper/message');
require('dotenv').config();
const { Role } = require('../models'); 

const verifyAccessToken = (req, res, next) => {
    if (!req.headers['authorization']) {
        return res.status(401).json({ error: true, msg: TOKEN_MISSING });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET || '28d333643037fd96e428ee1c2a12998856a9c93706965ba66024c8c2eff1a23213dec7c36142eb8704dac86d42f6eb6fbcea723459f6413a82b9aec2ae8092cd', (err, payload) => {
        if (err) {
            return res.status(401).json({ error: true, msg: INVALID_TOKEN });
        }
        req.user = payload; // Assign payload to req.user
        next();
    });
};

const getUserRolePermissions = async (role) => {
    // Replace this with your actual database query to get role permissions
    // Example using a Sequelize model:
    const roleData = await Role.findOne({ where: { name: role } });
    if (roleData) {
        return roleData.permissions;
    }
    return null;
};

const isValidPermissions = (requiredPermission) => {
    return async (req, res, next) => {
        const userRole = req.user.role;

        // Fetch the user's permissions from the database
        let rolePermissions;
        try {
            const permissions = await getUserRolePermissions(userRole);
            if (!permissions) {
                return res.status(403).json({ error: true, msg: FORBIDDEN_MESSAGE });
            }
            rolePermissions = JSON.parse(permissions);
        } catch (error) {
            console.error('Error fetching role permissions:', error);
            return res.status(500).json({ error: true, msg: 'Internal server error' });
        }

        // Check if the required permission is in the user's role permissions
        const [resource, action] = requiredPermission.split('.');
        if (rolePermissions[resource] && rolePermissions[resource].includes(action)) {
            next(); // User has the required permission
        } else {
            return res.status(403).json({ error: true, msg: FORBIDDEN_MESSAGE });
        }
    };
};
module.exports = { verifyAccessToken, isValidPermissions };
