const { DATA_INSERT_SUCCESFULLY, FAIELD_QUERY, DATA_NOT_FOUND, DATA_GET_SUCCESFULLY, DATA_UPDATE, DATA_DELETE } = require('../helper/message');
const { Role, Permission } = require('../models'); // Adjust the path as needed

// Create a new role
exports.createRole = async (req, res) => {
    try {
        const { name, permissions } = req.body;

        // Validate the permissions structure (optional but recommended)
        if (typeof permissions !== 'object' || permissions === null) {
            return res.status(400).json({ error: true, msg: 'Invalid permissions format' });
        }

        // Example validation to ensure the structure is an object with arrays of strings
        for (const [key, value] of Object.entries(permissions)) {
            if (!Array.isArray(value) || !value.every(v => typeof v === 'string')) {
                return res.status(400).json({ error: true, msg: `Invalid format for permissions under '${key}'` });
            }
        }

        // Create the role with the provided name and permissions
        const role = await Role.create({ name, permissions });
        res.status(200).json({ error: false, msg: DATA_INSERT_SUCCESFULLY, data: role });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};


// Get all roles
exports.getAllRoles = async (req, res) => {
    try {
        const roles = await Role.findAll();
        if (!roles.length) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: roles });
    } catch (error) {
        res.status(500).json({ error: true, msg: FAIELD_QUERY, error: error.message });
    }
};

// Get all permission
exports.getAllPermission = async (req, res) => {
    try {
        const roles = await Permission.findAll();
        if (!roles.length) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: roles });
    } catch (error) {
        res.status(500).json({ error: true, msg: FAIELD_QUERY, error: error.message });
    }
};

// Get a role by ID
exports.getRoleById = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await Role.findByPk(id);

        if (!role) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: role });
    } catch (error) {
        res.status(500).json({ error: true, msg: FAIELD_QUERY, error: error.message });
    }
};

// Update a role
exports.updatePermissions = async (req, res) => {
    try {
        const { updates } = req.body;

        // Validate the updates format
        if (!Array.isArray(updates) || !updates.every(u => typeof u === 'object' && u.roleId && u.permissions)) {
            return res.status(400).json({ error: true, msg: 'Invalid updates format' });
        }

        for (const update of updates) {
            const { roleId, permissions } = update;

            // Validate the permissions structure
            if (typeof permissions !== 'object' || permissions === null) {
                return res.status(400).json({ error: true, msg: `Invalid permissions format for role ${roleId}` });
            }

            // Additional debugging
            console.log(`Validating permissions for role ${roleId}:`, permissions);

            for (const [key, value] of Object.entries(permissions)) {
                if (!Array.isArray(value) || !value.every(v => typeof v === 'string')) {
                    console.log(`Invalid format for permissions under '${key}' for role ${roleId}`, value);
                    return res.status(400).json({ error: true, msg: `Invalid format for permissions under '${key}' for role ${roleId}` });
                }
            }

            // Find the role by ID
            const role = await Role.findByPk(roleId);
            if (!role) {
                return res.status(404).json({ error: true, msg: `Role with ID ${roleId} not found` });
            }

            // Update the role
            role.permissions = permissions; // Directly assign the permissions object
            await role.save();
        }

        res.status(200).json({ error: false, msg: 'Permissions updated successfully' });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ error: true, msg: 'Failed to update permissions', error: error.message });
    }
};




// Delete a role
exports.deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await Role.findByPk(id);

        if (!role) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        await role.destroy();
        res.status(200).json({ error: false, msg: DATA_DELETE });
    } catch (error) {
        res.status(500).json({ error: true, msg: FAIELD_QUERY, error: error.message });
    }
};
