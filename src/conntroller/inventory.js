const { InventoryHistory, Product, sequelize } = require('../models');
const logger = require('../helper/logger');
require('dotenv').config();
const { Op } = require('sequelize');
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

// Create InventoryHistory
exports.createInventoryHistory = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { productId, changeDate, quantityChange, note } = req.body;

        const newInventoryHistory = await InventoryHistory.create({
            productId,
            changeDate,
            quantityChange,
            note
        }, { transaction });

        await transaction.commit();
        res.status(200).json({ error: false, msg: DATA_INSERT_SUCCESFULLY, data: newInventoryHistory });
    } catch (error) {
        await transaction.rollback();
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

// Get All InventoryHistory
exports.getAllInventoryHistory = async (req, res) => {
    try {
        const inventoryHistory = await InventoryHistory.findAll();
        if (!inventoryHistory || inventoryHistory.length === 0) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: inventoryHistory });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};


exports.generateInventoryHistoryReport = async (req, res) => {
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

        // Fetch inventory history records within the date range
        const inventoryHistory = await InventoryHistory.findAll({
            where: {
                changeDate: {
                    [Op.between]: [start, end]
                }
            },
            include: [{
                model: Product,
                attributes: ['name']
            }]
        });

        // Check if inventory history records are found
        if (!inventoryHistory || inventoryHistory.length === 0) {
            return res.status(404).json({ error: true, msg: 'No inventory history found for the given date range' });
        }

        // Transform the data to match the desired structure
        const records = inventoryHistory.map(history => ({
            historyId: history.id,
            productId: history.productId,
            changeDate: history.changeDate,
            quantityChange: history.quantityChange,
            note: history.note,
            productName: history.Product.name // Access the product name from the included Product model
        }));

        // Send the response
        res.status(200).json({ error: false, msg: 'Data retrieved successfully', data: records });
    } catch (error) {
        // Log error and send failure response
        logger.error(error);
        res.status(500).json({ error: true, msg: 'Failed to generate report', error: error.message });
    }
};



// Get InventoryHistory by ID
exports.getInventoryHistoryById = async (req, res) => {
    const { id } = req.params;
    try {
        const inventoryHistory = await InventoryHistory.findByPk(id);
        if (!inventoryHistory) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: inventoryHistory });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

// Get InventoryHistory by ProductId
exports.getInventoryByproductId = async (req, res) => {
    const { productId } = req.params;
    try {
        const inventoryHistory = await InventoryHistory.findAll({ where: { productId } });
        if (!inventoryHistory || inventoryHistory.length === 0) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: inventoryHistory });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

// Update InventoryHistory
exports.updateInventoryHistory = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { productId, changeDate, quantityChange, note } = req.body;

        const inventoryHistory = await InventoryHistory.findByPk(id);
        if (!inventoryHistory) {
            await transaction.rollback();
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        await inventoryHistory.update({
            productId,
            changeDate,
            quantityChange,
            note
        }, { transaction });

        await transaction.commit();
        res.status(200).json({ error: false, msg: DATA_UPDATE });
    } catch (error) {
        await transaction.rollback();
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

// Delete InventoryHistory
exports.deleteInventoryHistory = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const inventoryHistory = await InventoryHistory.findByPk(id);
        if (!inventoryHistory) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        await inventoryHistory.destroy({ transaction });
        await transaction.commit();
        res.status(200).json({ error: false, msg: DATA_DELETE });
    } catch (error) {
        await transaction.rollback();
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};
