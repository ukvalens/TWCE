const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
};

const emailTemplates = {
  verification: (token) => ({
    subject: 'Verify your TWCE account',
    html: `<p>Click <a href="${process.env.CLIENT_URL}/verify-email?token=${token}">here</a> to verify your email.</p>`,
  }),
  passwordReset: (token) => ({
    subject: 'Reset your TWCE password',
    html: `<p>Click <a href="${process.env.CLIENT_URL}/reset-password?token=${token}">here</a> to reset your password. Link expires in 1 hour.</p>`,
  }),
  orderConfirmation: (orderNumber) => ({
    subject: 'Order Confirmed - TWCE',
    html: `<p>Your order <strong>#${orderNumber}</strong> has been confirmed. Thank you for shopping with TWCE!</p>`,
  }),
};

module.exports = { sendEmail, emailTemplates };
