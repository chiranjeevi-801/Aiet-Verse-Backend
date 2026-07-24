import Admission from '../models/Admission.js';

/**
 * @desc    Submit an online seat booking / admission request
 * @route   POST /api/admission
 * @access  Public
 */
export const createAdmission = async (req, res, next) => {
  try {
    const { name, email, phone, course } = req.body;

    // Check for existing admission to prevent duplicates
    const existingAdmission = await Admission.findOne({ email, phone, course });
    
    if (existingAdmission) {
      return res.status(409).json({
        success: false,
        message: 'An admission request with this email, phone, and course already exists.',
      });
    }

    const admission = await Admission.create({
      name,
      email,
      phone,
      course
    });

    res.status(201).json({
      success: true,
      message: 'Seat booking request saved successfully.',
      data: {
        id: admission._id,
        name: admission.name,
        course: admission.course
      }
    });
  } catch (error) {
    // If it's a mongodb duplicate key error fallback
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry detected.'
      });
    }
    next(error);
  }
};
