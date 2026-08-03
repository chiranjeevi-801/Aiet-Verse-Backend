import nodemailer from 'nodemailer';

let cachedTransporter = null;

/**
 * Creates and returns cached nodemailer transporter using environment configuration.
 * Throws explicit error if required environment variables are missing.
 */
const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  const missing = [];
  if (!user) missing.push('EMAIL_USER / SMTP_USER');
  if (!pass) missing.push('EMAIL_PASS / SMTP_PASS');

  if (missing.length > 0) {
    console.error('❌ [SMTP CREDENTIALS MISSING] Missing required environment variables on host environment:');
    missing.forEach((item) => console.error(`   - Missing: ${item}`));
    throw new Error(`SMTP configuration error: Missing required environment variable(s): ${missing.join(', ')}`);
  }

  // Log host, port, and authenticated user address (without password)
  console.log('📧 [SMTP CONFIG INITIALIZED]');
  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  console.log(`   Authenticated User: ${user}`);
  console.log(`   Secure: ${port === 465}`);

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    pool: false,
    family: 4, // Force IPv4 resolution to prevent IPv6 socket timeouts on Render/cloud hosts
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 35000,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });

  return cachedTransporter;
};

/**
 * Verifies the SMTP transport connection during server startup
 */
export const verifyEmailSetup = async () => {
  try {
    const transporter = getTransporter();
    console.log('🔍 [SMTP VERIFYING] Verifying SMTP transporter connection...');
    await transporter.verify();
    console.log('✅ [SMTP VERIFICATION SUCCESS] Connected to mail server successfully. Transporter is ready to send emails.');
    return true;
  } catch (error) {
    console.error('❌ [SMTP VERIFICATION FAILED] Transporter failed verification during server startup:');
    console.error(`   Error Message: ${error.message}`);
    console.error(`   Error Code: ${error.code || 'N/A'}`);
    console.error(`   Error Command: ${error.command || 'N/A'}`);
    console.error(`   Error Response: ${error.response || 'N/A'}`);
    console.error(`   Error ResponseCode: ${error.responseCode || 'N/A'}`);
    console.error('   Stack Trace:\n', error.stack);
    return false;
  }
};

/**
 * Helper to compute valid From header matching authenticated SMTP user
 */
const getFromAddress = (defaultLabel) => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const rawFrom = process.env.EMAIL_FROM;

  if (!user) {
    return rawFrom || `"${defaultLabel}" <admissions@aiet.org.in>`;
  }

  if (rawFrom) {
    if (rawFrom.includes(`<${user}>`)) {
      return rawFrom;
    }
    const match = rawFrom.match(/"([^"]+)"/);
    const label = match ? match[1] : defaultLabel;
    return `"${label}" <${user}>`;
  }

  return `"${defaultLabel}" <${user}>`;
};

/**
 * Send Student Confirmation Email
 * Subject: AIET Admission Application Received
 * 
 * @param {Object} data - Admission details
 */
export const sendStudentConfirmationEmail = async (data) => {
  const {
    name,
    email,
    phone,
    category, // UG / PG
    mode, // Online Seat Booking / Offline Campus Counseling / Online Counseling (Remote)
    course, // Branch
    submissionDate,
    tokenNumber, // Application ID
  } = data;

  const subject = 'AIET Admission Application Received';
  const fromEmail = getFromAddress('AIET Admissions');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f6f9;
      margin: 0;
      padding: 0;
      color: #333333;
      -webkit-font-smoothing: antialiased;
    }
    .email-container {
      max-width: 620px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #e5e7eb;
    }
    .email-header {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .email-header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #ffffff;
    }
    .email-header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      color: #fbbf24;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .email-body {
      padding: 32px 28px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 16px;
    }
    .intro-text {
      font-size: 15px;
      color: #4b5563;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #1e1b4b;
      border-bottom: 2px solid #4338ca;
      padding-bottom: 8px;
      margin-top: 24px;
      margin-bottom: 16px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      background-color: #f9fafb;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .details-table td {
      padding: 12px 16px;
      font-size: 14px;
      border-bottom: 1px solid #e5e7eb;
    }
    .details-table tr:last-child td {
      border-bottom: none;
    }
    .label-col {
      font-weight: 600;
      color: #374151;
      width: 38%;
      background-color: #f3f4f6;
    }
    .val-col {
      color: #111827;
      font-weight: 500;
    }
    .badge-highlight {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      background-color: #e0e7ff;
      color: #3730a3;
    }
    .notice-box {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 14px 18px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 24px;
      font-size: 14.5px;
      color: #1e40af;
    }
    .assistance-box {
      background-color: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .assistance-box h4 {
      margin: 0 0 10px 0;
      color: #1e293b;
      font-size: 14px;
      font-weight: 700;
    }
    .assistance-list {
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 13.5px;
      color: #475569;
    }
    .assistance-list li {
      margin-bottom: 6px;
    }
    .assistance-list li a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
    }
    .signature {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #4b5563;
    }
    .signature strong {
      color: #111827;
    }
    .email-footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>Alva's Institute of Engineering & Technology</h1>
      <p>Shobhavana Campus, Mijar, Moodbidri</p>
    </div>
    
    <div class="email-body">
      <div class="greeting">Dear ${name},</div>
      
      <p class="intro-text">
        Thank you for applying to <strong>Alva's Institute of Engineering & Technology</strong>.<br>
        We have successfully received your application.
      </p>

      <div class="section-title">Application Details</div>

      <table class="details-table">
        <tr>
          <td class="label-col">Name:</td>
          <td class="val-col">${name}</td>
        </tr>
        <tr>
          <td class="label-col">Email:</td>
          <td class="val-col">${email}</td>
        </tr>
        <tr>
          <td class="label-col">Phone:</td>
          <td class="val-col">${phone}</td>
        </tr>
        <tr>
          <td class="label-col">Admission Type:</td>
          <td class="val-col"><span class="badge-highlight">${category}</span></td>
        </tr>
        <tr>
          <td class="label-col">Mode:</td>
          <td class="val-col">${mode}</td>
        </tr>
        <tr>
          <td class="label-col">Branch:</td>
          <td class="val-col">${course}</td>
        </tr>
        <tr>
          <td class="label-col">Submission Date:</td>
          <td class="val-col">${submissionDate}</td>
        </tr>
        <tr>
          <td class="label-col">Application ID:</td>
          <td class="val-col"><strong>${tokenNumber}</strong></td>
        </tr>
      </table>

      <div class="notice-box">
        Our admission team will contact you shortly.
      </div>

      <div class="assistance-box">
        <h4>For any assistance:</h4>
        <ul class="assistance-list">
          <li><strong>Phone:</strong> +91 8258 262725 / +91 94481 33232</li>
          <li><strong>Email:</strong> <a href="mailto:admissions@aiet.org.in">admissions@aiet.org.in</a></li>
          <li><strong>Website:</strong> <a href="https://www.aiet.org.in" target="_blank">www.aiet.org.in</a></li>
        </ul>
      </div>

      <div class="signature">
        Regards,<br>
        <strong>Admissions Office</strong><br>
        Alva's Institute of Engineering & Technology
      </div>
    </div>

    <div class="email-footer">
      &copy; ${new Date().getFullYear()} Alva's Institute of Engineering & Technology. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Dear ${name},

Thank you for applying to Alva's Institute of Engineering & Technology.

We have successfully received your application.

Application Details

Name: ${name}
Email: ${email}
Phone: ${phone}
Admission Type: ${category}
Mode: ${mode}
Branch: ${course}
Submission Date: ${submissionDate}
Application ID: ${tokenNumber}

Our admission team will contact you shortly.

For any assistance:

Phone: +91 8258 262725 / +91 94481 33232
Email: admissions@aiet.org.in
Website: https://www.aiet.org.in

Regards,
Admissions Office
Alva's Institute of Engineering & Technology
  `.trim();

  try {
    const transporter = getTransporter();
    console.log(`📧 [STUDENT EMAIL SENDING] Sending student email to: ${email}`);
    
    const info = await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });
    
    console.log(`✅ [STUDENT EMAIL SENT] Confirmation email sent to ${email}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [STUDENT EMAIL FAILED] Error sending email to ${email}:`);
    console.error(`   Error Message: ${err.message}`);
    console.error(`   Error Code: ${err.code || 'N/A'}`);
    console.error(`   Error Command: ${err.command || 'N/A'}`);
    console.error(`   Error Response: ${err.response || 'N/A'}`);
    console.error(`   Error ResponseCode: ${err.responseCode || 'N/A'}`);
    console.error('   Stack Trace:\n', err.stack);
    return { success: false, error: err.message };
  }
};

/**
 * Send Admin Notification Email
 * Subject: New Admission Application Received
 * Target: process.env.ADMIN_EMAIL
 * 
 * @param {Object} data - Admission details
 */
export const sendAdminNotificationEmail = async (data) => {
  const {
    name,
    email,
    phone,
    category, // Admission Level (UG / PG)
    mode, // Admission Mode
    course, // Selected Branch
    submissionTime, // Time
    tokenNumber, // Application ID
    ipAddress, // IP Address
    browser, // Browser / User-Agent
  } = data;

  const adminEmail = process.env.ADMIN_EMAIL || 'admissions@aiet.org.in';
  const subject = 'New Admission Application Received';
  const fromEmail = getFromAddress('AIET Portal');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
      color: #1f2937;
    }
    .admin-container {
      max-width: 640px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
    }
    .admin-header {
      background-color: #0f172a;
      padding: 24px;
      color: #ffffff;
    }
    .admin-header h2 {
      margin: 0;
      font-size: 20px;
      color: #38bdf8;
    }
    .admin-header p {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #94a3b8;
    }
    .admin-body {
      padding: 28px;
    }
    .admin-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    .admin-table td {
      padding: 12px 16px;
      font-size: 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    .admin-table tr:last-child td {
      border-bottom: none;
    }
    .field-label {
      font-weight: 600;
      color: #475569;
      width: 38%;
      background-color: #f8fafc;
    }
    .field-value {
      color: #0f172a;
      font-weight: 500;
    }
    .tech-info {
      font-family: monospace;
      font-size: 12.5px;
      color: #475569;
      background-color: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      word-break: break-all;
    }
    .admin-footer {
      background-color: #f8fafc;
      padding: 16px 28px;
      text-align: right;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="admin-container">
    <div class="admin-header">
      <h2>New Admission Application Received</h2>
      <p>AIET Admission Portal Notification System</p>
    </div>
    <div class="admin-body">
      <p style="font-size: 15px; margin-top: 0;">
        A new student application has been submitted on the portal. Below are the submission details:
      </p>
      
      <table class="admin-table">
        <tr>
          <td class="field-label">Student Name:</td>
          <td class="field-value"><strong>${name}</strong></td>
        </tr>
        <tr>
          <td class="field-label">Email:</td>
          <td class="field-value"><a href="mailto:${email}" style="color: #0284c7; text-decoration: none;">${email}</a></td>
        </tr>
        <tr>
          <td class="field-label">Phone:</td>
          <td class="field-value"><a href="tel:${phone}" style="color: #0284c7; text-decoration: none;">${phone}</a></td>
        </tr>
        <tr>
          <td class="field-label">Admission Level:</td>
          <td class="field-value"><strong>${category}</strong></td>
        </tr>
        <tr>
          <td class="field-label">Admission Mode:</td>
          <td class="field-value">${mode}</td>
        </tr>
        <tr>
          <td class="field-label">Selected Branch:</td>
          <td class="field-value">${course}</td>
        </tr>
        <tr>
          <td class="field-label">Time:</td>
          <td class="field-value">${submissionTime}</td>
        </tr>
        <tr>
          <td class="field-label">Application ID:</td>
          <td class="field-value"><strong style="color: #0369a1;">${tokenNumber}</strong></td>
        </tr>
        <tr>
          <td class="field-label">IP Address:</td>
          <td class="field-value"><span class="tech-info">${ipAddress}</span></td>
        </tr>
        <tr>
          <td class="field-label">Browser:</td>
          <td class="field-value"><span class="tech-info">${browser}</span></td>
        </tr>
      </table>
    </div>
    <div class="admin-footer">
      AIET Automated System Notification &bull; Target: ${adminEmail}
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
New Admission Application Received

Student Name: ${name}
Email: ${email}
Phone: ${phone}
Admission Level: ${category}
Admission Mode: ${mode}
Selected Branch: ${course}
Time: ${submissionTime}
Application ID: ${tokenNumber}
IP Address: ${ipAddress}
Browser: ${browser}
  `.trim();

  try {
    const transporter = getTransporter();
    console.log(`📧 [ADMIN EMAIL SENDING] Sending admin email to: ${adminEmail}`);

    const info = await transporter.sendMail({
      from: fromEmail,
      to: adminEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`✅ [ADMIN EMAIL SENT] Notification email sent to ${adminEmail}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [ADMIN EMAIL FAILED] Error sending email to ${adminEmail}:`);
    console.error(`   Error Message: ${err.message}`);
    console.error(`   Error Code: ${err.code || 'N/A'}`);
    console.error(`   Error Command: ${err.command || 'N/A'}`);
    console.error(`   Error Response: ${err.response || 'N/A'}`);
    console.error(`   Error ResponseCode: ${err.responseCode || 'N/A'}`);
    console.error('   Stack Trace:\n', err.stack);
    return { success: false, error: err.message };
  }
};
