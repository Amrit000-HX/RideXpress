require('dotenv').config()
const nodemailer = require('nodemailer')

async function debugSmtp() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    logger: true,
    debug: true,
  })

  console.log('1. Verifying SMTP connection with Gmail...')
  await transporter.verify()
  console.log('✅ Google SMTP Server Authentication: SUCCESS!\n')

  const targetEmail = process.argv[2] || 'amritacharya2007@gmail.com'
  const testOtp = Math.floor(100000 + Math.random() * 900000).toString()

  console.log(`2. Sending test OTP email from ${process.env.SMTP_USER} to ${targetEmail}...`)
  
  const info = await transporter.sendMail({
    from: `RideXpress <${process.env.SMTP_USER}>`,
    to: targetEmail,
    subject: `Your RideXpress Verification Code: ${testOtp}`,
    text: `Hello,\n\nYour RideXpress login verification code is: ${testOtp}\n\nValid for 10 minutes.\n\nThank you,\nRideXpress Team`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:20px auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;background:#ffffff;">
        <h2 style="color:#1A1A1A;margin-top:0;">RideXpress Verification</h2>
        <p style="color:#444;font-size:14px;">Your 6-digit login verification code is:</p>
        <div style="background:#f4f8f5;padding:16px;border-radius:8px;text-align:center;margin:20px 0;border:1.5px dashed #6B9E72;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#2e6035;font-family:monospace;">${testOtp}</span>
        </div>
        <p style="color:#666;font-size:12px;">This code will expire in 10 minutes.</p>
      </div>
    `,
  })

  console.log('\n--- SMTP SERVER DELIVERY RESULT ---')
  console.log('Message ID:', info.messageId)
  console.log('Accepted recipients:', info.accepted)
  console.log('Rejected recipients:', info.rejected)
  console.log('Google Server Response:', info.response)
  console.log('Envelope:', info.envelope)
  console.log('\n✅ Email was successfully accepted by Google Gmail servers for delivery!')
}

debugSmtp().catch(console.error)
