const express = require('express');
const cors = require('cors');
const bodyparser = require('body-parser');
require('dotenv').config();
const helmet = require('helmet');
const { Sequelize } = require('sequelize');
const userRoute = require('../src/routs/user');
const permissionRoute = require('../src/routs/permission');
const productRoute = require('../src/routs/product');
const orderRoute = require('../src/routs/order');
const orderItemRoute = require('../src/routs/orderitem');
const workOrderRoute = require('../src/routs/workorder');
const inventoryRoute = require('../src/routs/inventory');
const notificationRoute = require('../src/routs/notification');

// Log the environment variables to ensure they are being loaded correctly
// console.log(`HOST: ${process.env.HOST}`);
// console.log(`PORT: ${process.env.PORT}`);

// Initialize Sequelize with your database configuration
const sequelize = new Sequelize('manufacture', 'root', null, {
    host: process.env.HOST,
    dialect: 'mysql'
});

const PORT = process.env.PORT || 3000; 

const app = express();
app.use(bodyparser.json());
app.use(helmet());
app.use(cors());

app.use("/", userRoute);
app.use("/", permissionRoute);
app.use("/", productRoute);
app.use("/", orderRoute);
app.use("/", orderItemRoute);
app.use("/", workOrderRoute);
app.use("/", inventoryRoute);
app.use("/", notificationRoute);

// Test the database connection
sequelize.authenticate()
    .then(() => {
        console.log('Database connected successfully');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: true,
        msg: err.message || 'Internal Server Error'
    });
});

app.get("/", async (req, res) => {
    res.send("hello");
});

app.listen(PORT, () => {
    console.log(`Server started at port no ${PORT}`);
});
