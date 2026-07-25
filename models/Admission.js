import mongoose from 'mongoose';

const admissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    course: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find duplicate bookings
admissionSchema.index({ email: 1, phone: 1, course: 1 }, { unique: true });

const Admission = mongoose.model('Admission', admissionSchema);

export default Admission;