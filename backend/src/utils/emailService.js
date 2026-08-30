const nodemailer = require('nodemailer')

/**
 * Creates and returns a Nodemailer transporter.
 */
function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SERVICE } = process.env

  // If Gmail service is explicitly specified
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
  const from = process.env.EMAIL_FROM || (process.env.SMTP_USER ? `"RideXpress" <${process.env.SMTP_USER}>` : '"RideXpress Security" <no-reply@ridexpress.com>')
  const subject = `Your RideXpress Verification Code: ${otp}`

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; background-color: #F5F0E8; font-family: 'Helvetica Neue', Arial, sans-serif; }
        .container { max-width: 540px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(26,26,26,0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
        .header { background-color: #1A1A1A; padding: 32px 24px; text-align: center; }
        .brand { font-size: 24px; font-weight: 900; color: #F5F0E8; letter-spacing: 1px; }
        .brand-x { color: #6B9E72; font-style: italic; }
        .content { padding: 36px 32px; color: #1A1A1A; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .otp-box { margin: 28px 0; padding: 20px; background: #f4f8f5; border: 2px dashed #6B9E72; border-radius: 12px; text-align: center; }
        .otp-code { font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; color: #2e6035; letter-spacing: 8px; margin: 0; }
        .otp-note { font-size: 12px; color: #666666; margin-top: 8px; }
        .warning { font-size: 13px; color: #888888; margin-top: 24px; border-top: 1px solid #eeeeee; padding-top: 16px; }
        .footer { background: #faf8f5; padding: 20px; text-align: center; font-size: 12px; color: #999999; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">Ride<span class="brand-x">X</span>press</div>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name},</div>
          <p>You recently requested to sign in to your <strong>RideXpress</strong> account. Use the 6-digit verification code below to complete your authentication:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="otp-note">⏱️ Valid for 10 minutes</div>
          </div>

          <p>If you did not request this code, you can safely ignore this email. Your account remains completely secure.</p>
          
          <div class="warning">
            🔒 <strong>Security Tip:</strong> Never share your verification code with anyone. RideXpress staff will never ask for your code.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} RideXpress Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `

  const textContent = `Hello ${name},\n\nYour RideXpress login verification code is: ${otp}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this, please ignore this message.`

  const transporter = createTransporter()

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      })
      console.log(`✅  [REAL EMAIL DELIVERED] To: ${to} | MessageID: ${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (err) {
      console.error(`⚠️  [SMTP DELIVERY ERROR for ${to}]:`, err.message)
      console.log(`🔑  [DEV FALLBACK OTP CODE FOR ${to}]: ${otp}`)
      return { success: true, devMode: true, otp, error: err.message }
    }
  } else {
    // Zero-config dev mode with clear console banner
    console.log(`\n==================================================================`)
    console.log(`📧  [EMAIL DISPATCH - DEV SIMULATION]`)
    console.log(`    To: ${to}`)
    console.log(`    Subject: ${subject}`)
    console.log(`    🔑 6-DIGIT OTP CODE: [ ${otp} ] (Valid for 10 mins)`)
    console.log(`    💡 Note: To send to real Gmail inboxes, add SMTP_USER & SMTP_PASS to backend/.env`)
    console.log(`==================================================================\n`)
    return { success: true, devMode: true, otp }
  }
}

module.exports = {
  sendOtpEmail,
}
