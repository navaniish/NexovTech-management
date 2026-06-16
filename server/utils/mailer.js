const nodemailer = require('nodemailer');

/**
 * Sends a real email using SMTP (defaulting to Yahoo Mail configuration).
 * Falls back to console logging with a warning if SMTP_PASS is not set.
 */
async function sendEmail(to, subject, body) {
  const host = process.env.SMTP_HOST || 'smtp.mail.yahoo.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE !== 'false'; // true for port 465, false for 587
  const user = process.env.SMTP_USER || 'nexovtech@myyahoo.com';
  const pass = process.env.SMTP_PASS;

  console.log(`✉️ MAILER: Preparing email to [${to}] - Subject: "${subject}"`);

  if (!pass || pass === 'YOUR_YAHOO_APP_PASSWORD_HERE' || pass === 'placeholder' || pass.trim() === '') {
    console.warn(`⚠️ SMTP_PASS is missing or has placeholder value. Real email transmission skipped.`);
    console.log(`--- [MOCK MAIL LOG] ---`);
    console.log(`To: ${to}`);
    console.log(`From: ${user}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    console.log(`------------------------`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });

    const info = await transporter.sendMail({
      from: `"NexovTech Administration" <${user}>`,
      to,
      subject,
      text: body
    });

    console.log(`✅ MAILER: Real email dispatched successfully. Message ID: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`❌ MAILER_FAILURE: Failed to dispatch real email via SMTP:`, err.message);
    return false;
  }
}

module.exports = { sendEmail };
