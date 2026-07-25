import { body } from 'express-validator';

export const validateAdmission = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone number format'),
  body('course').notEmpty().withMessage('Course selection is required').trim(),
];
