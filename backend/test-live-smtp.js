const nodemailer = require('nodemailer');

async function testGmailSMTP() {
  console.log('--- SMTP LIVE SERVER DIAGNOSTICS ---');
  
  // Use exact configuration used by the NestJS app
  const smtpHost = 'smtp.gmail.com';
  const smtpPort = 465;
  const smtpUser = 'dipakpatil8589@gmail.com';
  const smtpPassword = 'jjvrmqsiyqizmvxk'; // Your Gmail App Password
  const smtpFrom = 'dipakpatil8589@gmail.com';

  console.log(`Connecting to: ${smtpHost}:${smtpPort} as ${smtpUser}...`);

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: true, // SSL port 465 requires secure: true
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    // 1. Verify connection configuration
    console.log('Sending connection handshake verification check...');
    await transporter.verify();
    console.log('STATUS: SMTP Handshake successful! Transporter configured correctly.');

    // 2. Send test email
    console.log('Sending diagnostic test mail to user address...');
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: 'dipakpatil8589@gmail.com',
      subject: 'KnowledgeAI - Live Server SMTP Diagnostic Verification',
      text: 'If you receive this mail, live server SMTP configurations are 100% fine!',
    });

    console.log('STATUS: Diagnostic Email sent successfully! MessageID:', info.messageId);
  } catch (err) {
    console.error('SMTP ERROR OCCURRED:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  }
}

testGmailSMTP();
