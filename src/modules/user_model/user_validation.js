const Joi = require("joi");

const validationForRegisterSchema = Joi.object({
  name: Joi.string().min(5).required(),
  email: Joi.string().email().required(),
  username: Joi.string().min(3).required(),
  confirm_password: Joi.string().min(6).required(),
  password: Joi.string().min(6).required(),
  org: Joi.string().min(4).required(),
});

const validationForLogin = Joi.object({
  main: Joi.string().required(),
  password: Joi.string().min(6).required(),
});

const validationForCreateSchema = Joi.object({
  name: Joi.string().min(5).max(50).required(),
  department: Joi.string().min(5).max(50).required(),
  level: Joi.string().min(5).max(50).default("N/A"),
  contact: Joi.string()
    .length(10)
    .pattern(/^[0-9]+$/)
    .required(),
});

const validationForPasswordChange = Joi.object({
  currentPassword: Joi.string().min(6).required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().min(6).required(),
});

// Define Joi schema for partial updates (PATCH)
const updatePersonSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  department: Joi.string().min(2).max(100),
  level: Joi.string().min(1).max(50),
  contact: Joi.string().length(10).pattern(/^[0-9+\-()\s]+$/),
}).min(1); // require at least one field

module.exports = {
  validationForRegisterSchema,
  validationForLogin,
  validationForCreateSchema,
  validationForPasswordChange,
  updatePersonSchema,
};
