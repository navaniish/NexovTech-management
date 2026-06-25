require('dotenv').config();
const { sendEmail } = require('../utils/mailer');

const toEmail = process.argv[2] || 'nexovtech@myyahoo.com';
const downloadUrl = 'https://nexovtech-management.vercel.app/nexovtech.apk';

const subject = 'NexovTech Secure Android Application (APK)';
const body = `Hello,

As requested, here is the secure download link for the NexovTech Management Android Application (APK):

Download Link: ${downloadUrl}

Instructions:
1. Click the link above on your Android device to download the 'nexovtech.apk' file.
2. Open the downloaded file to begin installation.
3. If prompted, enable "Install from Unknown Sources" in your device settings.
4. Launch the application and proceed with biometric setup.

Regards,
NexovTech Administration System`;

const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #4f46e5; margin: 0;">NexovTech</h2>
    <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; margin: 5px 0 0 0;">Defense Node Admin</p>
  </div>
  
  <div style="padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
    <h3 style="color: #0f172a; margin-top: 0;">Android App Installation (APK)</h3>
    <p style="color: #334155; font-size: 14px; line-height: 1.6;">
      As requested, here is the secure download link to install the latest <strong>NexovTech Management Android App</strong> on your device.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${downloadUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
        Download Android APK
      </a>
    </div>
    
    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    
    <h4 style="color: #0f172a; margin-bottom: 10px;">Installation Instructions:</h4>
    <ol style="color: #334155; font-size: 13px; line-height: 1.6; padding-left: 20px;">
      <li>Tap the <strong>Download Android APK</strong> button above directly on your Android device.</li>
      <li>Open the downloaded <code>nexovtech.apk</code> file to initiate installation.</li>
      <li>If prompted, approve the permission to <em>"Install unknown apps"</em> from your browser.</li>
      <li>Launch the app and enroll your biometric credentials.</li>
    </ol>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 11px;">
    <p>NexovTech Security Portal &copy; 2026. This email was generated automatically.</p>
  </div>
</div>
`;

async function main() {
  console.log(`Sending APK download link to ${toEmail}...`);
  const success = await sendEmail(toEmail, subject, body, html);
  if (success) {
    console.log('Email dispatched successfully!');
    process.exit(0);
  } else {
    console.error('Email dispatch failed.');
    process.exit(1);
  }
}

main();
