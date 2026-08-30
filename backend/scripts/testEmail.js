/**
 * scripts/testEmail.js
 * Test sending a live OTP email to any recipient.
 * Usage: node scripts/testEmail.js [your_email@gmail.com]
 */
require('dotenv').config()
const { sendOtpEmail } = require('../src/utils/emailService')

async function main() {
  const targetEmail = process.argv[2] || process.env.SMTP_USER || 'test@example.com'
  const testOtp = Math.floor(100000 + Math.random() * 900000).toString()

  console.log(`\nTesting email dispatch to: ${targetEmail}...`)
  console.log(`SMTP_USER: ${process.env.SMTP_USER || '(Not configured - running in dev mode)'}`)
  console.log(`SMTP_SERVICE: ${process.env.SMTP_SERVICE || '(None)'}\n`)

  const result = await sendOtpEmail({
    to: targetEmail,
    otp: testOtp,
    name: 'Test User',
  })

  console.log('Result:', result)
}

main()
