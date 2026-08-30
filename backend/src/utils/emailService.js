const nodemailer = require('nodemailer')

/**
 * Creates and returns a Nodemailer transporter.
 */
function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SERVICE } = process.env

  // If Gmail service is specified
  if (SMTP_SERVICE === 'gmail' && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS.replace(/\s+/g, ''), // strip spaces from app password
      },
    })
  }

  // If custom SMTP host is specified
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587', 10),
      secure: SMTP_PORT === '465',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS.replace(/\s+/g, ''),
      },
      tls: {
        rejectUnauthorized: false,
      },
    })
  }

  return null
}

/**
 * Sends a 6-digit OTP verification email.
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.otp - 6-digit verification code
 * @param {string} [params.name] - Recipient name
 */
async function sendOtpEmail({ to, otp, name = 'User' }) {
  const senderEmail = process.env.SMTP_USER || 'no-reply@ridexpress.com'
  const from = `RideXpress Security <${senderEmail}>`
  const subject = `Your RideXpress Verification Code: ${otp}`

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RideXpress Verification Code</title>
      <style>
        body { margin: 0; padding: 0; background-color: #F5F0E8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #F5F0E8; padding: 30px 0; }
        .main { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(26,26,26,0.08); box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
        .header { background-color: #1A1A1A; padding: 28px 24px; text-align: center; }
        .brand { font-size: 26px; font-weight: 900; color: #F5F0E8; letter-spacing: 1px; }
        .brand-x { color: #6B9E72; font-style: italic; }
        .body-content { padding: 36px 32px; color: #1A1A1A; line-height: 1.6; }
        .greeting { font-size: 19px; font-weight: 700; color: #1A1A1A; margin-bottom: 12px; }
        .desc { font-size: 14.5px; color: #444444; margin-bottom: 24px; }
        .otp-container { margin: 24px 0; padding: 20px; background: #f4f8f5; border: 2px dashed #6B9E72; border-radius: 12px; text-align: center; }
        .otp-digits { font-family: 'Courier New', monospace; font-size: 38px; font-weight: 800; color: #2e6035; letter-spacing: 10px; margin: 0; }
        .otp-validity { font-size: 12px; font-weight: 600; color: #666666; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .security-box { font-size: 12.5px; color: #777777; background: #fafafa; border-radius: 8px; padding: 12px 16px; margin-top: 24px; border: 1px solid #eeeeee; }
        .footer { background: #faf8f5; padding: 18px 24px; text-align: center; font-size: 12px; color: #999999; border-top: 1px solid #eeeeee; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="main">
          <div class="header">
            <div class="brand">Ride<span class="brand-x">X</span>press</div>
          </div>
          <div class="body-content">
            <div class="greeting">Hello ${name},</div>
            <div class="desc">
              We received a request to authenticate your <strong>RideXpress</strong> account. Please use the verification code below to sign in:
            </div>
            
            <div class="otp-container">
              <div class="otp-digits">${otp}</div>
              <div class="otp-validity">⏱️ Valid for 10 minutes</div>
            </div>

            <div class="desc" style="font-size: 13px; color: #666;">
              If you didn't request this code, you can safely ignore this email. No action is required.
            </div>

            <div class="security-box">
              🔒 <strong>Security Notice:</strong> Never share your verification code with anyone. RideXpress representatives will never contact you asking for your code.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} RideXpress Technologies. All rights reserved.
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  const textContent = `Hello ${name},\n\nYour RideXpress login verification code is: ${otp}\n\nThis code is valid for 10 minutes.\n\nNever share this code with anyone.\n\nRideXpress Team`

  const transporter = createTransporter()

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        replyTo: senderEmail,
        subject,
        text: textContent,
        html: htmlContent,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
        },
      })
      console.log(`✅  [REAL EMAIL DELIVERED] To: ${to} | MessageID: ${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (err) {
      console.error(`⚠️  [SMTP DELIVERY ERROR for ${to}]:`, err.message)
      console.log(`🔑  [DEV FALLBACK OTP CODE FOR ${to}]: ${otp}`)
      return { success: true, devMode: true, otp, error: err.message }
    }
  } else {
    // Zero-config dev simulation
    console.log(`\n==================================================================`)
    console.log(`📧  [EMAIL DISPATCH - DEV SIMULATION]`)
    console.log(`    To: ${to}`)
    console.log(`    Subject: ${subject}`)
    console.log(`    🔑 6-DIGIT OTP CODE: [ ${otp} ] (Valid for 10 mins)`)
    console.log(`==================================================================\n`)
    return { success: true, devMode: true, otp }
  }
}

module.exports = {
  sendOtpEmail,
}
