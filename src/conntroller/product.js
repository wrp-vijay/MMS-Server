const { Product, Order, OrderItem, sequelize } = require('../models');
const logger = require('../helper/logger');
require('dotenv').config();
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const {
    FAILED_QUERY,
    DATA_NOT_FOUND,
    DATA_GET_SUCCESFULLY,
    DATA_UPDATE,
    DATA_DELETE,
    DATA_INSERT_SUCCESFULLY
} = require('../helper/message');

// Create Product
exports.createProduct = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { sku, name, description, price, stockQuentity, productType } = req.body;

        const existingProduct = await Product.findOne({ where: { sku } });

        if (existingProduct) {
            await transaction.rollback();
            return res.status(409).json({ error: true, msg: `SKU ${sku} already exists.` });
        }

        const newProduct = await Product.create({
            sku,
            name,
            description,
            price,
            stockQuentity,
            productType
        }, { transaction });

        await transaction.commit();
        res.status(200).json({ error: false, msg: DATA_INSERT_SUCCESFULLY, data: newProduct });
    } catch (error) {
        await transaction.rollback();
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

// Read Products (Get all products)
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.findAll();
        if (!products || products.length === 0) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: products });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

exports.MostSellingProductsReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Validate the presence of startDate and endDate
        if (!startDate || !endDate) {
            return res.status(400).json({ error: true, msg: 'Start date and end date are required' });
        }

        // Parse and validate date format
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: true, msg: 'Invalid date format' });
        }

        // Fetch orders and associated order items within the date range
        const orders = await Order.findAll({
            where: {
                createdAt: {
                    [Op.between]: [start, end]
                }
            },
            include: [{
                model: OrderItem,
                include: [Product]
            }]
        });

        // Aggregate sales quantities
        const productSales = {};
        orders.forEach(order => {
            order.OrderItems.forEach(item => {
                if (!productSales[item.Product.id]) {
                    productSales[item.Product.id] = {
                        productId: item.Product.id,
                        productName: item.Product.name,
                        quantitySold: 0
                    };
                }
                productSales[item.Product.id].quantitySold += item.quantity;
            });
        });

        // Convert aggregated data to array and sort by quantity sold
        const sortedProductSales = Object.values(productSales).sort((a, b) => b.quantitySold - a.quantitySold);

        // Return the report data
        if (!sortedProductSales || sortedProductSales.length === 0) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: sortedProductSales });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

// Get All Products of type "ready good"
exports.getAllReadyGoodProducts = async (req, res) => {
    try {
        const products = await Product.findAll({
            where: {
                productType: 'ready good'
            }
        });

        if (!products || products.length === 0) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

// Get All Products of type "ready good"
exports.getAllRawMaterialProducts = async (req, res) => {
    try {
        const products = await Product.findAll({
            where: {
                productType: 'raw material'
            }
        });

        if (!products || products.length === 0) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

// Read Product by ID
exports.getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }
        res.status(200).json({ error: false, msg: DATA_GET_SUCCESFULLY, data: product });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

// Update Product
exports.updateProduct = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const productId = req.params.id;
        const productInstance = await Product.findByPk(productId);

        if (!productInstance) {
            await transaction.rollback();
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        const updatedProduct = {
            sku: req.body.sku || productInstance.sku,
            name: req.body.name || productInstance.name,
            description: req.body.description || productInstance.description,
            price: req.body.price || productInstance.price,
            stockQuentity: req.body.stockQuentity || productInstance.stockQuentity,
            productType: req.body.productType || productInstance.productType
        };

        await Product.update(updatedProduct, { where: { id: productId }, transaction });

        await transaction.commit();
        res.status(200).json({ error: false, msg: DATA_UPDATE });
    } catch (error) {
        if (transaction) {
            await transaction.rollback();
        }
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const productId = req.params.id;
        const productInstance = await Product.findByPk(productId);

        if (!productInstance) {
            return res.status(404).json({ error: true, msg: DATA_NOT_FOUND });
        }

        await Product.destroy({ where: { id: productId }, transaction });

        await transaction.commit();
        res.status(200).json({ error: false, msg: DATA_DELETE });
    } catch (error) {
        await transaction.rollback();
        logger.error(error);
        res.status(500).json({ error: true, msg: FAILED_QUERY, error: error.message });
    }
};


