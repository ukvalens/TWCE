console.log('[validate.js] Module loading...');

const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  console.log('[validate] middleware called for path:', req.path);
  const errors = validationResult(req);
  console.log('[validate]', 'errors.isEmpty():', errors.isEmpty());
  if (!errors.isEmpty()) {
    const fieldErrors = {};
    errors.array().forEach((e) => {
      fieldErrors[e.path] = e.msg || `Invalid value for ${e.path}`;
    });
    console.log('[validate] returning fieldErrors:', fieldErrors);
    return res.status(400).json({ message: 'Validation failed', errors: fieldErrors });
  }
  next();
};

module.exports = { validate };
