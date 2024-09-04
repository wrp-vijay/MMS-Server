const { DATA_NOT_FOUND, DATA_GET_SUCCESFULLY, FAILED_QUERY, ORDER_CREATE, ORDER_UPDATE, DATA_DELETE } = require('../helper/message');
const { OrderItem, Product, Order } = require('../models');

exports.getOrderItems = async (req, res) => {
    try {
        const orderItems = await OrderItem.findAll({
            attributes: ['id', 'orderId', 'productId', 'quantity', 'unitPrice', 'totalPrice'], // Only select necessary attributes
            include: [
                {
                    model: Order,
                    attributes: ['id', 'createdAt', 'totalAmount']
                },
                {
                    model: Product,
                    attributes: ['name', 'price']
                }
            ],
            limit: 100, // Optional: Add a limit to fetch a subset of results
            offset: parseInt(req.query.page) * 100 || 0 // Optional: Pagination support (page query parameter)
        });

        if (!orderItems || orderItems.length === 0) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: orderItems });
    } catch (error) {
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

exports.getOrderItemById = async (req, res) => {
    try {
        const orderItem = await OrderItem.findByPk(req.params.id, {
            attributes: ['id', 'orderId', 'productId', 'quantity', 'unitPrice', 'totalPrice'], // Only select necessary attributes
            include: [
                {
                    model: Order,
                    attributes: ['id', 'createdAt', 'totalAmount']
                },
                {
                    model: Product,
                    attributes: ['name', 'price']
                }
            ]
        });

        if (!orderItem) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: orderItem });
    } catch (error) {
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

exports.createOrderItem = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { orderId, productId, quantity, unitPrice } = req.body;

        for (const item of items) {
            const { productId, quantity, unitPrice } = item;
            const totalPrice = quantity * unitPrice;

            // Fetch the product to get its price
            const product = await Product.findByPk(productId);

            if (!product) {
                await t.rollback();
                return res.status(404).json({ error: true, msg: `Product with id ${productId} not found` });
            }

            await OrderItem.create({
                orderId: newOrder.id,
                productId,
                quantity,
                unitPrice,
                totalPrice
            }, { transaction: t });
        }

        await t.commit();

        res.status(201).json({ error: false, msg: ORDER_CREATE, data: newOrderItem });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

exports.updateOrderItem = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        for (const item of items) {
            const { productId, quantity, unitPrice } = item;
            const totalPrice = quantity * unitPrice;

            // Fetch the product to get its price
            const product = await Product.findByPk(productId);

            if (!product) {
                await t.rollback();
                return res.status(404).json({ error: true, msg: `Product with id ${productId} not found` });
            }

            await OrderItem.create({
                orderId: order.id,
                productId,
                quantity,
                unitPrice,
                totalPrice
            }, { transaction: t });
        }

        await t.commit();

        res.status(200).json({ error: false, msg: ORDER_UPDATE, data: orderItem });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

exports.deleteOrderItem = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const orderItem = await OrderItem.findByPk(req.params.id);
        if (!orderItem) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        await orderItem.destroy({ transaction: t });

        await t.commit();
        res.status(200).json({ error: false, msg: DATA_DELETE });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};
