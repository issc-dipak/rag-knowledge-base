const nodemailer = require('nodemailer');

async function testMail() {
  console.log('Initializing SMTP connection test...');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // port 587 is not secure on initial connection, upgraded via STARTTLS
    auth: {
      user: 'dipakpatil8589@gmail.com',
      pass: 'jjvrmqsiyqizmvxk'
    }
  });

  try {
    console.log('Sending test email to dipakpatil8589@gmail.com...');
    const info = await transporter.sendMail({
      from: 'dipakpatil8589@gmail.com',
      to: 'dipakpatil8589@gmail.com',
      subject: 'SMTP Connection Test',
      text: 'If you receive this, your Gmail SMTP configuration is perfectly working!'
    });
    console.log('Email sent successfully! MessageID:', info.messageId);
  } catch (err) {
    console.error('SMTP test failed:', err.message);
  }
}

testMail();
