const { User, Notification, Product } = require('../models'); // Adjust the import as necessary

const {
    FAILED_QUERY,
    DATA_NOT_FOUND,
    DATA_GET_SUCCESFULLY
} = require('../helper/message');

exports.getNotification = async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            include: [{ model: User, attributes: ['firstName', 'lastName'] }],
            order: [['createdAt', 'DESC']]
        });
        if (!notifications || notifications.length === 0) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: notifications });
    } catch (error) {
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

exports.getNotificationSpecificUser = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!userId) {
            return res.status(400).json({ error: true, msg: 'User ID is required' });
        }

        // Fetch notifications for the specified user, sorted by `createdAt` in descending order
        const notifications = await Notification.findAll({
            where: { userId },
            include: [{ model: User, attributes: ['firstName', 'lastName'] }],
            order: [['createdAt', 'DESC']] // Ensure notifications are sorted in descending order
        });

        if (notifications.length > 0) {
            await Notification.update(
                { status: 'read' },
                {
                    where: { userId, status: 'unread' }
                }
            );
        }

        res.status(200).json({ error: false, msg: 'Data Get Successfully', data: notifications });
    } catch (error) {
        console.error('Failed to retrieve notifications:', error);
        res.status(500).json({ error: true, msg: 'Failed to retrieve notifications', error: error.message });
    }
};


exports.getUnreadNotificationCount = async (req, res) => {
    try {
        // Get userId from the request
        const userId = req.user.userId;

        // Debugging log to check userId
        // console.log('Received userId:', userId);

        // Validate userId
        if (!userId) {
            return res.status(400).json({ error: true, msg: 'User ID is required' });
        }

        // Count unread notifications for the specified user
        const unreadCount = await Notification.count({
            where: {
                userId,
                status: 'unread'
            }
        });

        res.status(200).json({ error: false, msg: 'Unread count retrieved successfully', data: unreadCount });
    } catch (error) {
        console.error('Failed to retrieve unread notification count:', error);
        res.status(500).json({ error: true, msg: 'Failed to retrieve unread notification count', error: error.message });
    }
};

exports.markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!userId) {
            return res.status(400).json({ error: true, msg: 'User ID is required' });
        }

        await Notification.update(
            { status: 'read' },
            {
                where: { userId, status: 'unread' }
            }
        );

        res.status(200).json({ error: false, msg: 'All notifications marked as read' });
    } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        res.status(500).json({ error: true, msg: 'Failed to mark notifications as read', error: error.message });
    }
};


