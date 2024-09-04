const { sequelize, WorkOrder, Product, InventoryHistory, Notification } = require('../models'); // Removed Order model since it's no longer needed
const logger = require('../helper/logger');
const { Op } = require('sequelize');
require('dotenv').config();
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const {
    FAILED_QUERY,
    DATA_NOT_FOUND,
    DATA_GET_SUCCESFULLY,
    DATA_UPDATE,
    DATA_DELETE,
    DATA_INSERT_SUCCESFULLY
} = require('../helper/message');

// Create WorkOrder
exports.createWorkOrder = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { productId, quantity, deliveryDate, rawMaterials, notes, status } = req.body;

        // Validate main productId
        const product = await Product.findByPk(productId, { transaction });
        if (!product) {
            return res.status(400).json({ error: true, msg: 'Invalid product ID' });
        }

        // Validate rawMaterials
        if (!Array.isArray(rawMaterials) || rawMaterials.length === 0) {
            return res.status(400).json({ error: true, msg: 'Raw materials should be an array with at least one item' });
        }

        for (const item of rawMaterials) {
            if (!item.productId || !item.quantity || item.quantity <= 0) {
                return res.status(400).json({ error: true, msg: 'Each raw material must have a valid productId and quantity greater than 0' });
            }

            // Validate each raw material productId
            const rawMaterialProduct = await Product.findOne({ where: { id: item.productId, productType: 'raw material' }, transaction });
            if (!rawMaterialProduct) {
                return res.status(400).json({ error: true, msg: `Invalid raw material product ID: ${item.productId}` });
            }
        }

        // Check if there is enough stock to fulfill the work order
        if (product.stockQuantity < quantity) {
            return res.status(400).json({ error: true, msg: 'Insufficient stock quantity' });
        }

        // Create the work order
        const newWorkOrder = await WorkOrder.create({
            productId,
            quantity,
            deliveryDate,
            rawMaterials, // Store the rawMaterials JSON data as-is
            notes,
            status
        }, { transaction });

        // Update the product's stock quantity
        await Product.update(
            { stockQuantity: product.stockQuantity - quantity },
            { where: { id: productId }, transaction }
        );

        // Commit the transaction
        await transaction.commit();
        res.status(200).json({ error: false, msg: DATA_INSERT_SUCCESFULLY, data: newWorkOrder });
    } catch (error) {
        await transaction.rollback();
        logger.error(error);
        res.status(500).json({ error: true, msg: 'Failed to create work order', error: error.message });
    }
};


// Get All WorkOrders
exports.getAllWorkOrders = async (req, res) => {
    try {
        const workOrders = await WorkOrder.findAll({
            include: [{
                model: Product,
                attributes: ['name']
            }]
        });
        if (!workOrders || workOrders.length === 0) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: workOrders });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

exports.generateWorkOrderReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Validate query parameters
        if (!startDate || !endDate) {
            return res.status(400).json({ error: true, msg: 'Start date and end date are required' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: true, msg: 'Invalid date format' });
        }

        // Fetch work orders within the date range
        const workOrders = await WorkOrder.findAll({
            where: {
                createdAt: {
                    [Op.between]: [start, end]
                }
            },
            include: [{
                model: Product,
                attributes: ['name']
            }]
        });

        // Check if work orders are found
        if (!workOrders || workOrders.length === 0) {
            return res.status(404).json({ error: true, msg: 'No work orders found for the given date range' });
        }

        // Send the response
        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: workOrders });
    } catch (error) {
        // Log error and send failure response
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};


// Generate WorkOrders Report in CSV
// exports.generateWorkOrderReport = async (req, res) => {
//     try {
//         const workOrders = await WorkOrder.findAll({
//             include: [{
//                 model: Product,
//                 attributes: ['name']
//             }]
//         });

//         if (!workOrders || workOrders.length === 0) {
//             return res.status(404).json({ error: true, msg: 'Data not found' });
//         }

//         // Transform the data to a format suitable for CSV
//         const records = workOrders.map(workOrder => ({
//             workOrderId: workOrder.id,
//             productName: workOrder.Product.name,
//             quantity: workOrder.quantity,
//             deliveryDate: workOrder.deliveryDate,
//             rawMaterials: workOrder.rawMaterials,
//             notes: workOrder.notes,
//             status: workOrder.status
//         }));

//         // Define the fields for the CSV
//         const fields = [
//             { label: 'Work Order ID', value: 'workOrderId' },
//             { label: 'Product Name', value: 'productName' },
//             { label: 'Quantity', value: 'quantity' },
//             { label: 'Delivery Date', value: 'deliveryDate' },
//             { label: 'Raw Materials', value: 'rawMaterials' },
//             { label: 'Notes', value: 'notes' },
//             { label: 'Status', value: 'status' }
//         ];

//         // Create the CSV parser
//         const json2csvParser = new Parser({ fields });
//         const csv = json2csvParser.parse(records);

//         // Write the CSV file to the server
//         const filePath = path.join(__dirname, 'work_order_report.csv');
//         fs.writeFileSync(filePath, csv);

//         // Send the CSV file as a response
//         res.status(200).download(filePath, 'work_order_report.csv', (err) => {
//             if (err) {
//                 res.status(500).json({ error: true, msg: 'Failed to generate report', error: err.message });
//             } else {
//                 fs.unlinkSync(filePath); // Delete the file after sending it to the client
//             }
//         });

//     } catch (error) {
//         if (error.message.includes('Too many requests')) {
//             return res.status(429).json({ error: true, msg: 'Rate limit exceeded. Please try again later.' });
//         }
//         logger.error(error);
//         res.status(500).json({ error: true, msg: 'Failed to generate report', error: error.message });
//     }
// };

// Get WorkOrder by ID
exports.getWorkOrderById = async (req, res) => {
    const { id } = req.params;
    try {
        const workOrder = await WorkOrder.findByPk(id, {
            include: [{ model: Product }]
        });
        if (!workOrder) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: workOrder });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

// Update WorkOrder
// exports.updateWorkOrder = async (req, res) => {
//     const transaction = await sequelize.transaction();
//     try {
//         const { id } = req.params;
//         const { quantity, deliveryDate, rawMaterials, notes, status } = req.body;

//         const workOrder = await WorkOrder.findByPk(id);
//         if (!workOrder) {
//             await transaction.rollback();
//             return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
//         }

//         const product = await Product.findByPk(workOrder.productId);

//         // Check if the status is changing to 'Complete'
//         if (status === 'Complete' && workOrder.status !== 'Complete') {
//             if (product) {
//                 product.stockQuentity += quantity;
//                 await product.save({ transaction });

//                 // Add entry to InventoryHistory with product name
//                 await InventoryHistory.create({
//                     productId: workOrder.productId,
//                     changeDate: new Date(),
//                     quantityChange: quantity,
//                     note: `Work order ${workOrder.id} for product ${product.name} completed`
//                 }, { transaction });
//             }
//         }

//         // Update the work order details
//         await workOrder.update({
//             quantity,
//             deliveryDate,
//             rawMaterials,
//             notes,
//             status
//         }, { transaction });

//         await transaction.commit();
//         res.status(200).json({ error: false, msg: DATA_UPDATE, data: workOrder });
//     } catch (error) {
//         await transaction.rollback();
//         logger.error(error);
//         res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
//     }
// };

// Update WorkOrder
exports.updateWorkOrder = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { quantity, deliveryDate, rawMaterials, notes, status } = req.body;

        const workOrder = await WorkOrder.findByPk(id);
        if (!workOrder) {
            await transaction.rollback();
            return res.status(404).json({ error: true, msg: 'DATA_NOT_FOUND' });
        }

        // Update the work order details
        await workOrder.update({
            quantity,
            deliveryDate,
            rawMaterials,
            notes,
            status
        }, { transaction });

        await transaction.commit();
        res.status(200).json({ error: false, msg: 'DATA_UPDATE', data: workOrder });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ error: true, msg: 'FAILED_QUERY', error: error.message });
    }
};

exports.completeWorkOrder = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const workOrderId = req.params.id;
        const { status } = req.body;

        const workOrder = await WorkOrder.findByPk(workOrderId);

        if (!workOrder) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Work order not found.' });
        }

        const product = await Product.findByPk(workOrder.productId);

        // Check if the status is changing to 'Complete'
        if (status === 'Complete' && workOrder.status !== 'Complete') {
            if (product) {
                product.stockQuentity += workOrder.quantity; // Adjust the product's stock quantity
                await product.save({ transaction });

                // Add entry to InventoryHistory with product name
                await InventoryHistory.create({
                    productId: workOrder.productId,
                    changeDate: new Date(),
                    quantityChange: workOrder.quantity,
                    note: `Work order ${workOrder.id} for product ${product.name} completed`
                }, { transaction });
            }
        }

        // Update the work order status
        workOrder.status = status;
        await workOrder.save({ transaction });

        await transaction.commit();
        return res.status(200).json({ message: `Work order marked as ${status}.`, data: workOrder });
    } catch (error) {
        await transaction.rollback();
        logger.error(error);
        return res.status(500).json({ message: 'Failed to update work order status.', error: error.message });
    }
};


// Delete WorkOrder
exports.deleteWorkOrder = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const workOrder = await WorkOrder.findByPk(id);
        if (!workOrder) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        const product = await Product.findByPk(workOrder.productId);
        if (product) {
            product.stockQuentity -= workOrder.quantity;
            await product.save({ transaction });

            await InventoryHistory.create({
                productId: workOrder.productId,
                changeDate: new Date(),
                quantityChange: -workOrder.quantity,
                note: `Work order ${workOrder.id} deleted`
            }, { transaction });
        }

        await workOrder.destroy({ transaction });
        await transaction.commit();
        res.status(200).json({ error: false, msg: DATA_DELETE });
    } catch (error) {
        await transaction.rollback();
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};


