import Admission from '../models/Admission.js';
import {
  appendUGAdmission,
  appendPGAdmission,
  isPGCourse,
} from '../helpers/excelHelper.js';

/**
 * @desc    Submit an online seat booking / admission request
 * @route   POST /api/admission
 * @access  Public
 */
export const createAdmission = async (req, res, next) => {
  const reqTime = new Date().toISOString();
  console.log(`\n📥 [REQUEST RECEIVED] POST /api/admission at ${reqTime}`);
  console.log('   Payload:', JSON.stringify(req.body));

  try {
    const { name, email, phone, course } = req.body;

    if (!name || !email || !phone || !course) {
      console.error('❌ [VALIDATION FAILED] Missing required fields in body');
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and course are required fields.',
      });
    }
    console.log('✅ [VALIDATION PASSED] Name, email, phone, and course verified');

    const normEmail = email.toLowerCase().trim();
    const normPhone = phone.trim();
    const normCourse = course.trim();

    // Check for existing admission to prevent duplicate submissions
    const existingAdmission = await Admission.findOne({
      email: normEmail,
      phone: normPhone,
      course: normCourse,
    });

    if (existingAdmission) {
      console.warn(`⚠️ [DUPLICATE CHECK FAILED] Admission already exists for Email: ${normEmail}, Phone: ${normPhone}, Course: ${normCourse}`);
      return res.status(409).json({
        success: false,
        message: 'An admission request with this email, phone, and course already exists.',
      });
    }
    console.log('✅ [DUPLICATE CHECK PASSED] No duplicate admission found');

    const isPG = isPGCourse(normCourse);
    const category = isPG ? 'PG' : 'UG';
    const year = new Date().getFullYear();
    const tokenNumber = `AIET-${year}-${category}-${Math.floor(1000 + Math.random() * 9000)}`;

    const admission = await Admission.create({
      tokenNumber,
      name: name.trim(),
      email: normEmail,
      phone: normPhone,
      course: normCourse,
      category,
      appointmentType: 'Online Seat Booking',
      seatSlot: 'Provisionally Reserved',
      status: 'Pending',
      admissionDate: new Date().toISOString().split('T')[0],
      admissionTime: new Date().toTimeString().split(' ')[0],
    });

    console.log(`✅ [MONGODB SAVE SUCCESS] Document created in Admissions collection. ID: ${admission._id}`);

    const excelData = {
      tokenNumber: admission.tokenNumber,
      name: admission.name,
      email: admission.email,
      phone: admission.phone,
      course: admission.course,
      appointmentType: 'Online Seat Booking',
      category: admission.category,
      createdAt: admission.createdAt,
    };

    // Auto-update Excel file based on course (UG / PG)
    try {
      if (isPG) {
        await appendPGAdmission(excelData);
      } else {
        await appendUGAdmission(excelData);
      }
      console.log('✅ [EXCEL UPDATED SUCCESS] Admission row appended to Excel report file.');
    } catch (excelErr) {
      console.error('❌ [EXCEL UPDATE FAILED] Error appending row to Excel file:', excelErr.message);
    }

    console.log('✅ [ADMIN DASHBOARD DATA AVAILABLE] Record synced successfully for real-time dashboard viewing.');

    res.status(201).json({
      success: true,
      message: 'Seat booking request saved successfully.',
      data: {
        id: admission._id,
        tokenNumber: admission.tokenNumber,
        name: admission.name,
        course: admission.course,
      },
    });
  } catch (error) {
    console.error('❌ [ERROR IN CREATE ADMISSION]:', error.message, error.stack);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An admission request with this email, phone, and course already exists.',
      });
    }
    next(error);
  }
};
