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

module.exports = {
  validationForRegisterSchema,
  validationForLogin,
  validationForCreateSchema,
  validationForPasswordChange,
};
