import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendOTPEmail(email: string, name: string, otp: string, purpose: string) {
  const purposeText: Record<string, string> = {
    SIGNUP: 'verify your account',
    LOGIN: 'confirm your login',
    WITHDRAWAL: 'authorize your withdrawal',
    KYC: 'submit your verification',
  }

  await transporter.sendMail({
    from: `"Altaris Capital" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Your Altaris Capital verification code: ${otp}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0B0E11;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0E11;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#151A21;border-radius:16px;border:1px solid #2B3139;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#1E2329 0%,#151A21 100%);padding:32px 40px;text-align:center;border-bottom:1px solid #2B3139;">
            <div style="display:inline-flex;align-items:center;gap:12px;">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 2L30 28H2L16 2Z" fill="none" stroke="#F0B90B" stroke-width="2.5" stroke-linejoin="round"/>
                <line x1="16" y1="12" x2="16" y2="22" stroke="#F0B90B" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:0.08em;">ALTARIS</span>
              <span style="font-size:12px;color:#B0B3B8;letter-spacing:0.15em;margin-top:2px;">Capital</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="color:#B0B3B8;font-size:16px;margin:0 0 8px;">Hello, ${name}</p>
            <h1 style="color:#FFFFFF;font-size:24px;font-weight:700;margin:0 0 24px;line-height:1.3;">
              Your verification code to ${purposeText[purpose] || 'verify your identity'}
            </h1>
            <div style="background:#1E2329;border:1px solid #2B3139;border-radius:12px;padding:32px;text-align:center;margin:0 0 24px;">
              <span style="font-size:48px;font-weight:800;color:#F0B90B;letter-spacing:0.2em;font-variant-numeric:tabular-nums;">${otp}</span>
            </div>
            <p style="color:#B0B3B8;font-size:14px;margin:0 0 8px;">⏱ This code expires in <strong style="color:#FFFFFF;">5 minutes</strong></p>
            <p style="color:#6E757C;font-size:13px;margin:0;">If you did not request this code, please ignore this email and ensure your account is secure.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #2B3139;text-align:center;">
            <p style="color:#6E757C;font-size:12px;margin:0;">© ${new Date().getFullYear()} Altaris Capital. All rights reserved.</p>
            <p style="color:#6E757C;font-size:11px;margin:8px 0 0;"><strong>Never share this code</strong> with anyone, including Altaris Capital staff.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  })
}

export async function sendNotificationEmail(email: string, name: string, title: string, body: string) {
  await transporter.sendMail({
    from: `"Altaris Capital" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `${title} — Altaris Capital`,
    html: `
<!DOCTYPE html><html><body style="background:#0B0E11;font-family:Inter,sans-serif;padding:40px 20px;">
  <div style="max-width:560px;margin:0 auto;background:#151A21;border-radius:16px;border:1px solid #2B3139;padding:40px;">
    <h2 style="color:#F0B90B;margin:0 0 16px;">${title}</h2>
    <p style="color:#B0B3B8;font-size:15px;line-height:1.6;">${body}</p>
    <hr style="border:none;border-top:1px solid #2B3139;margin:24px 0;">
    <p style="color:#6E757C;font-size:12px;">© ${new Date().getFullYear()} Altaris Capital</p>
  </div>
</body></html>
    `,
  })
}

export async function sendKycStatusEmail(email: string, name: string, status: 'approved' | 'rejected', reason?: string) {
  const isApproved = status === 'approved'
  await transporter.sendMail({
    from: `"Altaris Capital" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: isApproved ? 'Identity Verified — Altaris Capital' : 'KYC Update — Altaris Capital',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#000000;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <tr>
          <td style="padding:32px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07);">
            <svg width="36" height="36" viewBox="0 0 80 80" fill="none"><defs><linearGradient id="ag" x1="50%" y1="0%" x2="50%" y2="100%"><stop offset="0%" stop-color="#FFD23A"/><stop offset="100%" stop-color="#C8880A"/></linearGradient></defs><path d="M40 4 L77.6 76 L51.6 76 L40 42 L28.4 76 L2.4 76 Z" fill="url(#ag)"/></svg>
            <span style="display:inline-block;font-size:18px;font-weight:800;color:#FFFFFF;letter-spacing:0.08em;margin-left:10px;vertical-align:middle;">ALTARIS CAPITAL</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="color:#A0A0A0;font-size:15px;margin:0 0 8px;">Hello, ${name}</p>
            <div style="display:inline-block;padding:8px 18px;border-radius:99px;background:${isApproved ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)'};color:${isApproved ? '#0ECB81' : '#F6465D'};font-weight:700;font-size:13px;margin-bottom:20px;">
              ${isApproved ? '✓ Identity Verified' : '✗ Verification Update'}
            </div>
            <h1 style="color:#FFFFFF;font-size:22px;font-weight:700;margin:0 0 16px;">${isApproved ? 'Your identity has been verified!' : 'Your KYC submission needs attention'}</h1>
            <p style="color:#A0A0A0;font-size:14px;line-height:1.7;margin:0 0 24px;">
              ${isApproved
                ? 'Congratulations! Your identity verification is complete. You now have full access to all platform features including withdrawals.'
                : `Your identity verification was not approved at this time. ${reason ? `Reason: <strong style="color:#fff;">${reason}</strong>` : 'Please resubmit with clearer documents.'}`
              }
            </p>
            <div style="text-align:center;margin:0 0 28px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/kyc" style="display:inline-block;background:${isApproved ? '#F2BA0E' : '#F6465D'};color:${isApproved ? '#000' : '#fff'};font-weight:800;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">
                ${isApproved ? 'Go to Dashboard →' : 'Resubmit Documents →'}
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.07);text-align:center;">
            <p style="color:#505050;font-size:11px;margin:0;">© ${new Date().getFullYear()} Altaris Capital. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`
  await transporter.sendMail({
    from: `"Altaris Capital" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Reset your Altaris Capital password',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#000000;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <tr>
          <td style="padding:32px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07);">
            <svg width="36" height="36" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs><linearGradient id="ag" x1="50%" y1="0%" x2="50%" y2="100%"><stop offset="0%" stop-color="#FFD23A"/><stop offset="100%" stop-color="#C8880A"/></linearGradient></defs>
              <path d="M40 4 L77.6 76 L51.6 76 L40 42 L28.4 76 L2.4 76 Z" fill="url(#ag)"/>
            </svg>
            <span style="display:inline-block;font-size:18px;font-weight:800;color:#FFFFFF;letter-spacing:0.08em;margin-left:10px;vertical-align:middle;">ALTARIS CAPITAL</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="color:#A0A0A0;font-size:15px;margin:0 0 8px;">Hello, ${name}</p>
            <h1 style="color:#FFFFFF;font-size:22px;font-weight:700;margin:0 0 20px;">Reset your password</h1>
            <p style="color:#A0A0A0;font-size:14px;margin:0 0 28px;line-height:1.6;">
              We received a request to reset your Altaris Capital password. Click the button below to choose a new password. This link expires in 1 hour.
            </p>
            <div style="text-align:center;margin:0 0 28px;">
              <a href="${resetUrl}" style="display:inline-block;background:#F2BA0E;color:#000000;font-weight:800;font-size:15px;padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.02em;">
                Reset Password →
              </a>
            </div>
            <p style="color:#505050;font-size:12px;margin:0;text-align:center;">
              If you didn't request this, you can safely ignore this email. Your password will not change.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.07);text-align:center;">
            <p style="color:#505050;font-size:11px;margin:0;">© ${new Date().getFullYear()} Altaris Capital. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
