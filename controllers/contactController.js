import Contact from '../models/Contact.js';

/**
 * @desc    Submit a contact form message
 * @route   POST /api/contact
 * @access  Public
 */
export const submitContactForm = async (req, res, next) => {
  try {
    const { name, email, message } = req.body;
    
    // Prevent duplicate submissions from same email within 1 minute
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentSubmission = await Contact.findOne({
      email,
      createdAt: { $gte: oneMinuteAgo }
    });

    if (recentSubmission) {
      return res.status(429).json({
        success: false,
        message: 'You have already submitted a message recently. Please wait a minute.'
      });
    }

    await Contact.create({
      name,
      email,
      message,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been received successfully.'
    });
  } catch (error) {
    next(error);
  }
};
