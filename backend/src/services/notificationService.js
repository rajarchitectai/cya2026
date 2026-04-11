const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

// Lazily initialize clients so missing env vars only error when notifications are sent
let twilioClient;

const getTwilioClient = () => {
  if (!twilioClient) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

const fillTemplate = (template, txn) =>
  template
    .replace(/<<Deposit Date>>/g,        txn.date)
    .replace(/<<Deposit Amount>>/g,      Math.abs(txn.amount).toFixed(2))
    .replace(/<<Deposit Description>>/g, txn.name);

const sendSMS = async (to, body) => {
  if (!process.env.TWILIO_PHONE_FROM) {
    console.warn('TWILIO_PHONE_FROM not set — skipping SMS');
    return;
  }
  try {
    const msg = await getTwilioClient().messages.create({
      from: process.env.TWILIO_PHONE_FROM,
      to,
      body,
    });
    console.log(`SMS sent: ${msg.sid}`);
  } catch (err) {
    console.error('SMS send failed:', err.message);
  }
};

const sendEmail = async (to, subject, text) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not set — skipping email');
    return;
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  try {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM || 'alerts@cyadmin.app',
      subject,
      text,
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error('Email send failed:', err.response?.body?.errors?.[0] || err.message);
  }
};

const notify = async (alert, txn) => {
  const smsBody   = fillTemplate(alert.smsTemplate,   txn);
  const emailBody = fillTemplate(alert.emailTemplate, txn);

  if (alert.notifyPhone) await sendSMS(alert.notifyPhone, smsBody);
  if (alert.notifyEmail) await sendEmail(alert.notifyEmail, 'CYA Alert: New Transaction', emailBody);
};

module.exports = { notify };
