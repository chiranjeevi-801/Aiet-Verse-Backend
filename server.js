import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import connectDB from './config/db.js';
import { setupSwagger } from './config/swagger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Route Imports
import healthRoutes from './routes/healthRoutes.js';
import admissionRoutes from './routes/admissionRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';

// Load env vars
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Security and Optimization Middlewares
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json());

// CORS config restricted to React Frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
}));

// Apply generic rate limiter to all routes
app.use('/api', apiLimiter);

// Setup Swagger Documentation
setupSwagger(app);

// Mount Routes
app.use('/api/health', healthRoutes);
app.use('/api/admission', admissionRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/appointment', appointmentRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
// lorema
app.listen(PORT, () => {
  console.log(`🛰️  Backend system active in ${process.env.NODE_ENV} mode on port ${PORT}`);
});