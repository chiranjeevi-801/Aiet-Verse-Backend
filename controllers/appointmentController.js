import Appointment from '../models/Appointment.js';
import Counter from '../models/Counter.js';

// Helper to generate sequential token
const getNextSequenceValue = async (sequenceName) => {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.seq;
};

/**
 * @desc    Schedule an offline or online appointment
 * @route   POST /api/appointment
 * @access  Public
 */
export const scheduleAppointment = async (req, res, next) => {
  try {
    const { name, email, phone, type, date, desk, course } = req.body;

    let token = '';
    let queueNumber = null;
    let virtualLink = null;

    if (type === 'offline') {
      const seq = await getNextSequenceValue('offline_appointments');
      const paddedSeq = String(seq).padStart(3, '0');
      token = `AIET-2026-P${paddedSeq}`;
      
      // Calculate a pseudo queue number based on today's appointments for that desk
      const today = new Date().toISOString().split('T')[0];
      const count = await Appointment.countDocuments({ date: today, desk, type: 'offline' });
      queueNumber = count + 1;
      
    } else if (type === 'online') {
      const seq = await getNextSequenceValue('online_appointments');
      const paddedSeq = String(seq).padStart(3, '0');
      token = `AIET-2026-O${paddedSeq}`;
      
      // Generate a mock google meet link
      const randomStr = Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);
      virtualLink = `https://meet.google.com/aie-${randomStr}`;
    }

    console.log("DEBUG: Appointments")

    const appointment = await Appointment.create({
      name,
      email,
      phone,
      type,
      date,
      desk,
      course,
      token,
      queueNumber,
      virtualLink
    });

    res.status(201).json({
      success: true,
      message: `${type === 'offline' ? 'Campus Check-in' : 'Remote Session'} scheduled successfully.`,
      data: {
        token: appointment.token,
        queueNumber: appointment.queueNumber,
        virtualLink: appointment.virtualLink,
        desk: appointment.desk,
        date: appointment.date
      }
    });

  } catch (error) {
    next(error);
  }
};
