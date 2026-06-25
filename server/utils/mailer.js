const nodemailer = require('nodemailer');

let cachedTransporter = null;
let cachedUser = null;
let cachedPass = null;
let cachedHost = null;
let cachedPort = null;
let cachedSecure = null;

function getTransporter(host, port, secure, user, pass) {
  if (
    cachedTransporter &&
    cachedUser === user &&
    cachedPass === pass &&
    cachedHost === host &&
    cachedPort === port &&
    cachedSecure === secure
  ) {
    return cachedTransporter;
  }

  console.log(`✉️ MAILER: Creating new pooled SMTP transporter for user: ${user}`);
  
  if (cachedTransporter) {
    try {
      cachedTransporter.close();
    } catch (e) {
      console.warn('Error closing old SMTP transporter:', e.message);
    }
  }

  cachedHost = host;
  cachedPort = port;
  cachedSecure = secure;
  cachedUser = user;
  cachedPass = pass;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    pool: true, // Enable pooling to keep connection open and avoid Yahoo bad auth locks
    maxConnections: 3,
    maxMessages: 100,
    auth: {
      user,
      pass
    }
  });

  return cachedTransporter;
}

/**
 * Sends a real email using SMTP (defaulting to Yahoo Mail configuration).
 * Falls back to console logging with a warning if SMTP_PASS is not set.
 */
async function sendEmail(to, subject, body, html, attachments = null) {
  const host = process.env.SMTP_HOST || 'smtp.mail.yahoo.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE !== 'false'; // true for port 465, false for 587
  const user = process.env.SMTP_USER || 'nexovtech@myyahoo.com';
  const pass = process.env.SMTP_PASS;

  console.log(`✉️ MAILER: Preparing email to [${to}] - Subject: "${subject}" (HTML: ${!!html})`);

  if (!pass || pass === 'YOUR_YAHOO_APP_PASSWORD_HERE' || pass === 'placeholder' || pass.trim() === '') {
    console.warn(`⚠️ SMTP_PASS is missing or has placeholder value. Real email transmission skipped.`);
    console.log(`--- [MOCK MAIL LOG] ---`);
    console.log(`To: ${to}`);
    console.log(`From: ${user}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (Text):\n${body}`);
    if (html) {
      console.log(`Body (HTML):\n${html}`);
    }
    if (attachments) {
      console.log(`Attachments:\n${JSON.stringify(attachments.map(a => a.filename))}`);
    }
    console.log(`------------------------`);
    return false;
  }

  try {
    const transporter = getTransporter(host, port, secure, user, pass);

    const mailOptions = {
      from: `"NexovTech Administration" <${user}>`,
      to,
      subject,
      text: body
    };

    if (html) {
      mailOptions.html = html;
    }

    if (attachments) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ MAILER: Real email dispatched successfully. Message ID: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`❌ MAILER_FAILURE: Failed to dispatch real email via SMTP:`, err.message);
    return false;
  }
}

module.exports = { sendEmail };
