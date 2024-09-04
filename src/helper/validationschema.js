const Joi = require('joi');

const userSchema = Joi.object({
  firstName: Joi.string().min(3).max(30).required(),
  lastName: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  mobile: Joi.string().pattern(/^[0-9]{10,15}$/).required(), // Assuming mobile numbers have 10-15 digits
  city: Joi.string().required(),
  role: Joi.string().required(), // Assuming roles are either 'admin' or 'user'
  image: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const productSchema = Joi.object({
  sku: Joi.string().required(),
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().optional(),
  price: Joi.number().precision(2).required(),
  stockQuentity: Joi.number().integer().min(0).required(),
  productType: Joi.string().valid('raw material', 'ready good').required()
});

const orderSchema = Joi.object({
  userId: Joi.number().integer().required(),
  deliveryDate: Joi.date().iso().optional().allow(null),
  shippingAddress: Joi.string().max(255).required(),
  totalAmount: Joi.number().precision(2).positive().required(),
  status: Joi.string().valid('Pending', 'On Process', 'Delivered', 'Under Creation', 'Process').required(),
  items: Joi.array().items(Joi.object({
    productId: Joi.number().integer().required(),
    quantity: Joi.number().integer().positive().required(),
    unitPrice: Joi.number().precision(2).positive().required(),
    totalPrice: Joi.number().precision(2).positive().required(),
  })).required()
});

const orderUpdateSchema = Joi.object({
  userId: Joi.number().integer().required(),
  deliveryDate: Joi.date().iso().optional().allow(null),
  shippingAddress: Joi.string().max(255).required(),
  totalAmount: Joi.number().precision(2).positive().required(),
  status: Joi.string().valid('Pending', 'Onprocess', 'Delivered', 'Under creation', 'Process').required(),
});

const orderItemSchema = Joi.object({
  orderId: Joi.number().integer().required(),
  productId: Joi.number().integer().required(),
  quantity: Joi.number().integer().positive().required(),
  unitPrice: Joi.number().precision(2).positive().required(),
  totalPrice: Joi.number().precision(2).positive().required()
});

const workOrderSchema = Joi.object({
  productId: Joi.number().integer().required(),
  quantity: Joi.number().integer().positive().required(),
  deliveryDate: Joi.date().iso().optional().allow(null),
  rawMaterials: Joi.array().items().optional(),
  notes: Joi.string().max(255).optional().allow(''),
  status: Joi.string().valid('Pending', 'Cutting', 'Sewing', 'Printing', 'Check quality', 'Complete').required()
});

module.exports = {
  userSchema,
  loginSchema,
  productSchema,
  orderSchema,
  orderItemSchema,
  orderUpdateSchema,
  workOrderSchema
};
