const { sequelize, Order, Product, InventoryHistory, Notification, OrderItem, User } = require('../models'); // Adjust the import as necessary
const { Op } = require('sequelize'); // Import Op from Sequelize
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const {
    FAILED_QUERY,
    DATA_NOT_FOUND,
    DATA_GET_SUCCESFULLY,
    DATA_UPDATE,
    DATA_DELETE,
    DATA_INSERT_SUCCESFULLY,
    ORDER_CREATE,
    ORDER_UPDATE
} = require('../helper/message');

exports.createOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { userId, deliveryDate, shippingAddress, totalAmount, status, items } = req.body;

        // Validate items
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: true, msg: 'Items array is required and cannot be empty' });
        }

        // Calculate total amount from items
        const calculatedTotalAmount = items.reduce((acc, item) => {
            const { quantity, unitPrice } = item;
            return acc + (quantity * unitPrice);
        }, 0);

        // // Validate totalAmount
        // if (calculatedTotalAmount !== totalAmount) {
        //     return res.status(400).json({ error: true, msg: 'Total amount does not match the sum of item prices' });
        // }

        // Create the Order
        const newOrder = await Order.create({
            userId,
            deliveryDate,
            shippingAddress,
            totalAmount,
            status
        }, { transaction: t });

        // Create the Order Items
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

        res.status(200).json({ error: false, msg: ORDER_CREATE, data: newOrder });
    } catch (error) {
        await t.rollback();
        console.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [
                {
                    model: User,
                    attributes: ['firstName', 'lastName']
                },
                {
                    model: OrderItem,
                    as: 'OrderItems',
                    include: [
                        {
                            model: Product,
                            as: 'Product',
                            attributes: ['name']
                        }
                    ]
                },
            ]
        });
        if (!orders || orders.length === 0) {
            return res.status(404).json({ error: true, msg: 'No orders found' });
        }
        res.status(200).json({ error: false, msg: 'Orders fetched successfully', data: orders });
    } catch (error) {
        res.status(500).json({ error: true, msg: 'Failed to fetch orders', error: error.message });
    }
};

exports.generateOrderReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: true, msg: 'Start date and end date are required' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: true, msg: 'Invalid date format' });
        }

        const orders = await Order.findAll({
            where: {
                createdAt: {
                    [Op.between]: [start, end]
                }
            },
            include: [
                {
                    model: User,
                    attributes: ['firstName', 'lastName']
                },
                {
                    model: OrderItem,
                    as: 'OrderItems',
                    include: [
                        {
                            model: Product,
                            as: 'Product',
                            attributes: ['name']
                        }
                    ]
                },
            ]
        });

        if (!orders || orders.length === 0) {
            return res.status(404).json({ error: true, msg: 'No orders found for the given date range' });
        }

        res.status(200).json({ error: false, msg: 'Order report generated successfully', data: orders });
    } catch (error) {
        res.status(500).json({ error: true, msg: 'Failed to generate report', error: error.message });
    }
};



// exports.generateOrderReport = async (req, res) => {
//     try {
//         const orders = await Order.findAll({
//             include: [
//                 {
//                     model: User,
//                     attributes: ['firstName', 'lastName']
//                 },
//                 {
//                     model: OrderItem,
//                     as: 'OrderItems',
//                     include: [
//                         {
//                             model: Product,
//                             as: 'Product',
//                             attributes: ['name']
//                         }
//                     ]
//                 },
//             ]
//         });
//         if (!orders || orders.length === 0) {
//             return res.status(404).json({ error: true, msg: 'Data not found' });
//         }

//         // Transform the data to a format suitable for CSV
//         const records = orders.map(order => {
//             return order.OrderItems.map(item => ({
//                 orderId: order.id,
//                 userName: `${order.User.firstName} ${order.User.lastName}`,
//                 deliveryDate: order.deliveryDate,
//                 shippingAddress: order.shippingAddress,
//                 totalAmount: order.totalAmount,
//                 status: order.status,
//                 itemProductName: item.Product.name,
//                 itemQuantity: item.quantity,
//                 itemUnitPrice: item.unitPrice,
//                 itemTotalPrice: item.totalPrice
//             }));
//         }).flat();

//         // Calculate total revenue
//         const totalRevenue = records.reduce((acc, record) => acc + record.totalAmount, 0);
//         // console.log(totalRevenue);

//         // Define the fields for the CSV
//         const fields = [
//             { label: 'Order ID', value: 'orderId' },
//             { label: 'User Name', value: 'userName' },
//             { label: 'Delivery Date', value: 'deliveryDate' },
//             { label: 'Shipping Address', value: 'shippingAddress' },
//             { label: 'Total Amount', value: 'totalAmount' },
//             { label: 'Status', value: 'status' },
//             { label: 'Product Name', value: 'itemProductName' },
//             { label: 'Quantity', value: 'itemQuantity' },
//             { label: 'Unit Price', value: 'itemUnitPrice' },
//             { label: 'Total Price', value: 'itemTotalPrice' }
//         ];

//         // Create the CSV parser
//         const json2csvParser = new Parser({ fields });
//         let csv = json2csvParser.parse(records);

//         // Add total revenue row
//         csv += `\nTotal Revenue,,,,,${totalRevenue}\n`;

//         // Write the CSV file to the server
//         const filePath = path.join(__dirname, 'order_report.csv');
//         fs.writeFileSync(filePath, csv);

//         // Send the CSV file as a response
//         res.status(200).download(filePath, 'order_report.csv', (err) => {
//             if (err) {
//                 res.status(500).json({ error: true, msg: 'Failed to generate report', error: err.message });
//             } else {
//                 fs.unlinkSync(filePath); // Delete the file after sending it to the client
//             }
//         });

//     } catch (error) {
//         res.status(500).json({ error: true, msg: 'Failed to generate report', error: error.message });
//     }
// };

exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id, {
            include: [{
                model: OrderItem,
                as: 'OrderItems',
                include: [
                    {
                        model: Product,
                        as: 'Product',
                        attributes: ['name'] // Include only the fields you need
                    }
                ]
            }]
        });
        if (!order) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        res.status(200).json({ error: false, data: order });
    } catch (error) {
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'alfonzo.vandervort54@ethereal.email',
        pass: '4jnY2d3GhvUdparQVS'
    }
});

const sendEmail = async (to, subject, htmlContent) => {
    try {
        await transporter.sendMail({
            from: '"WMS Manufacturing" <alfonzo.vandervort54@ethereal.email>', // sender address
            to,  // recipient email
            subject,  // subject line
            html: htmlContent  // HTML body content
        });
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Failed to send email:', error);
    }
};

const sendOrderStatusEmail = async (user, orderId, status, orderItems) => {
    // Extract product details from order items and convert prices to numbers
    const orderRows = orderItems.map(item => {
        const unitPrice = parseFloat(item.unitPrice).toFixed(2);
        const totalPrice = parseFloat(item.totalPrice).toFixed(2);

        return `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: left;">${item.Product ? item.Product.name : 'Unknown Product'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${unitPrice}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${totalPrice}</td>
            </tr>
        `;
    }).join('');

    const totalAmount = orderItems.reduce((acc, item) => acc + parseFloat(item.totalPrice), 0).toFixed(2);

    const subject = `Order Status Updated: ${status}`;
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
                <div style="background-color: #0046d5; padding: 20px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0;">WMS Manufacturing</h1>
                </div>
                <div style="padding: 20px;">
                    <h2 style="color: #333;">Order Status Updated</h2>
                    <p style="font-size: 16px; color: #555;">Dear ${user.firstName},</p>
                    <p style="font-size: 16px; color: #555;">
                        The status of your order with ID <strong>#${orderId}</strong> has been updated to <strong>${status}</strong>.
                    </p>
                    <h3 style="color: #333; margin-top: 20px;">Order Details</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                            <tr>
                                <th style="padding: 8px; border: 1px solid #ddd; background-color: #f1f1f1; text-align: left;">Product Name</th>
                                <th style="padding: 8px; border: 1px solid #ddd; background-color: #f1f1f1; text-align: center;">Quantity</th>
                                <th style="padding: 8px; border: 1px solid #ddd; background-color: #f1f1f1; text-align: right;">Price</th>
                                <th style="padding: 8px; border: 1px solid #ddd; background-color: #f1f1f1; text-align: right;">Total Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orderRows}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">Total Amount</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">$${totalAmount}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <p style="font-size: 16px; color: #555; margin-top: 20px;">Thank you for shopping with us!</p>
                    <p style="font-size: 16px; color: #555;">Best regards,<br>WMS Manufacturing</p>
                </div>
                <div style="background-color: #f1f1f1; padding: 10px 20px; text-align: center; color: #888; font-size: 12px;">
                    <p style="margin: 0;">&copy; 2024 WMS Manufacturing. All rights reserved.</p>
                    <p style="margin: 0;">1234 Street Name, City, State, 12345</p>
                </div>
            </div>
        </div>
    `;

    await sendEmail(user.email, subject, htmlContent);
};

const validateAndCalculateTotalAmount = (items, totalAmount) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Items array is required and cannot be empty');
    }

    const calculatedTotalAmount = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    // if (calculatedTotalAmount !== totalAmount) {
    //     throw new Error('Total amount does not match the sum of item prices');
    // }
};

const updateOrderItemsAndInventory = async (order, items, transaction) => {
    let productNames = [];

    for (const item of items) {
        const { productId, quantity } = item;
        const product = await Product.findByPk(productId);

        if (!product) {
            throw new Error(`Product with id ${productId} not found`);
        }

        // Reduce the stock quantity
        product.stockQuentity -= quantity;
        await product.save({ transaction });

        // Add entry to InventoryHistory with product name
        await InventoryHistory.create({
            productId,
            changeDate: new Date(),
            quantityChange: -quantity,
            note: `Order ${order.id} delivered for product ${product.name}`
        }, { transaction });

        // Add product name to the list
        productNames.push(product.name);
    }

    return productNames;
};

const createNotification = async (userId, orderId, status, transaction) => {
    try {
        const notification = await Notification.create({
            userId,
            title: `Order ${orderId} status changed to ${status}`,
            status: 'unread'
        }, { transaction });

        console.log('Notification created:', notification);
    } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
        throw new Error('Failed to create notification');
    }
};

exports.updateOrder = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { userId, deliveryDate, shippingAddress, totalAmount, status, items } = req.body;

        // Validate items and calculate total amount
        validateAndCalculateTotalAmount(items, totalAmount);

        // Find order with related OrderItems and Product
        const order = await Order.findByPk(id, { include: [{ model: OrderItem, include: [Product] }] });
        if (!order) {
            await transaction.rollback();
            return res.status(404).json({ error: true, msg: 'Order not found' });
        }

        // If status is 'Delivered', update order items and inventory
        if (status === 'Delivered' && order.status !== 'Delivered') {
            await updateOrderItemsAndInventory(order, items, transaction);
        }

        // Create notification
        await createNotification(order.userId, order.id, status, transaction);

        // Send an email to the user
        const user = await User.findByPk(order.userId);
        if (user && user.email) {
            await sendOrderStatusEmail(user, order.id, status, order.OrderItems);
        }

        // Update the order details
        await order.update({
            userId,
            deliveryDate,
            shippingAddress,
            totalAmount,
            status
        }, { transaction });

        // Remove old order items
        await OrderItem.destroy({ where: { orderId: order.id } }, { transaction });

        // Add new order items
        for (const item of items) {
            const { productId, quantity, unitPrice } = item;
            const totalPrice = quantity * unitPrice;

            await OrderItem.create({
                orderId: order.id,
                productId,
                quantity,
                unitPrice,
                totalPrice
            }, { transaction });
        }

        await transaction.commit();
        res.status(200).json({ error: false, msg: 'Order updated successfully', data: order });
    } catch (error) {
        await transaction.rollback();
        console.error('Failed to update order:', error);
        res.status(500).json({ error: true, msg: 'Failed to update order', error: error.message });
    }
};

exports.deleteOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) {
            await t.rollback();
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        await order.destroy({ transaction: t });

        await t.commit();
        res.status(200).json({ error: false, msg: DATA_DELETE });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};
