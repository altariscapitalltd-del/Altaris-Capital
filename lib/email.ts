import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendOTPEmail(email: string, name: string, otp: string, purpose: string) {
  const safeName = name?.trim() || 'there'
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
    html: renderEmail({
      name: safeName,
      eyebrow: 'Security verification',
      title: `Use this one-time code to ${purposeText[purpose] || 'verify your account'}.`,
      body: 'This code is required to continue securely inside the app. Enter it exactly as shown below. It expires in 5 minutes and cannot be reused.\n\nIf you did not request this code, you can safely ignore this email and your account remains protected.',
      content: `<div style="font-family:Georgia,'Times New Roman',serif;font-size:46px;font-weight:600;letter-spacing:0.22em;color:#E4C25C;text-align:center;font-variant-numeric:tabular-nums;background:rgba(201,162,39,0.08);border:1px solid rgba(201,162,39,0.22);border-radius:16px;padding:26px 20px;">${otp}</div>`,
      footer: 'Never share this code with anyone. Altaris Capital will never ask for it.',
    }),
  })
}

export async function sendNotificationEmail(email: string, name: string, title: string, body: string) {
  const safeName = name?.trim() || 'there'
  const safeTitle = title?.trim() || 'Update'
  const safeBody = body?.trim() || 'You have a new update in your Altaris Capital account.'
  await transporter.sendMail({
    from: `"Altaris Capital" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `${safeTitle} — Altaris Capital`,
    text: `Hello ${safeName},\n\n${safeTitle}\n${safeBody}\n\nOpen the app to view this update.\n\nAltaris Capital`,
    html: renderEmail({
      name: safeName,
      eyebrow: 'Account update',
      title: safeTitle,
      body: safeBody.length < 120 ? `${safeBody}\n\nOpen the app to review the full details, confirm the change, and continue your next step without delay.` : safeBody,
      content: '',
      footer: 'Open the app to review this update and continue from where you left off.',
    }),
  })
}

export async function sendKycStatusEmail(email: string, name: string, status: 'approved' | 'rejected', reason?: string) {
  const isApproved = status === 'approved'
  await transporter.sendMail({
    from: `"Altaris Capital" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: isApproved ? 'Identity Verified — Altaris Capital' : 'KYC Update — Altaris Capital',
    html: renderEmail({
      name,
      eyebrow: 'Identity verification',
      title: isApproved ? 'Your identity has been verified' : 'Your KYC submission needs attention',
      body: isApproved
        ? 'Congratulations. Your account is verified and you now have full access to the platform. Withdrawals, deposits, and premium account actions are available immediately.'
        : `Your KYC submission was not approved yet. ${reason ? `Reason: ${reason}` : 'Please resubmit with clearer documents.'}\n\nPlease open the app, review the required correction, and upload a clearer document so we can complete verification without delay.`,
      content: `<div style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:${isApproved ? 'rgba(63,185,132,0.12)' : 'rgba(224,86,107,0.12)'};color:${isApproved ? '#3FB984' : '#E0566B'};font-weight:700;font-size:13px;letter-spacing:0.02em;">${isApproved ? 'Verified' : 'Action required'}</div>`,
      footer: isApproved ? 'You can now use withdrawals and premium features.' : 'Open the app to review and resubmit.',
      buttonText: isApproved ? 'Go to Dashboard' : 'Resubmit Documents',
      buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/kyc`,
      buttonTone: isApproved ? 'gold' : 'danger',
    }),
  })
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`
  await transporter.sendMail({
    from: `"Altaris Capital" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Reset your Altaris Capital password',
    html: renderEmail({
      name,
      eyebrow: 'Password reset',
      title: 'Reset your password',
      body: 'We received a request to reset your Altaris Capital password. Use the button below to set a new password. For your security, this link expires in 1 hour and can only be used once.\n\nIf you did not request this, no action is required.',
      content: '',
      footer: "If you didn't request this, ignore this email and your password will stay unchanged.",
      buttonText: 'Reset Password',
      buttonUrl: resetUrl,
      buttonTone: 'gold',
    }),
  })
}

function renderEmail(opts: {
  name: string
  eyebrow: string
  title: string
  body: string
  content?: string
  footer?: string
  buttonText?: string
  buttonUrl?: string
  buttonTone?: 'gold' | 'danger'
}) {
  const buttonBg = opts.buttonTone === 'danger' ? '#E0566B' : '#C9A227'
  const buttonFg = opts.buttonTone === 'danger' ? '#ffffff' : '#0A0A08'
  const serif = "Georgia,'Times New Roman',serif"
  return `<!DOCTYPE html><html><body style="margin:0;background:#050608 !important;background-color:#050608 !important;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#ECE7DB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${opts.title}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050608 !important;background-color:#050608 !important;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#0E1014 !important;background-color:#0E1014 !important;border:1px solid rgba(201,162,39,0.18);border-radius:20px;overflow:hidden;box-shadow:0 28px 70px rgba(0,0,0,0.55);">
        <tr><td style="padding:24px 28px;border-bottom:1px solid rgba(201,162,39,0.14);background:#0B0C0F !important;">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td style="vertical-align:middle;padding-right:10px;"><span style="display:inline-block;width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:16px solid #C9A227;"></span></td>
            <td style="vertical-align:middle;">
              <span style="font-size:15px;font-weight:800;letter-spacing:0.16em;color:#ECE7DB;">ALTARIS</span>
              <span style="font-size:10px;font-weight:700;letter-spacing:0.20em;text-transform:uppercase;color:#C9A227;margin-left:6px;">Capital</span>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 28px 6px;">
          <div style="font-size:11px;letter-spacing:0.20em;text-transform:uppercase;color:#C9A227;font-weight:700;">${opts.eyebrow}</div>
          <div style="font-family:${serif};font-size:27px;line-height:1.22;font-weight:600;color:#ECE7DB;margin-top:12px;">Hello ${opts.name || 'there'},</div>
          <div style="font-size:14px;color:#9A958A;margin-top:8px;line-height:1.7;">${opts.title}</div>
          <div style="height:1px;background:linear-gradient(90deg,#C9A227,rgba(201,162,39,0));margin:18px 0 4px;opacity:0.6;"></div>
        </td></tr>
        <tr><td style="padding:14px 28px 28px;">
          <div style="font-size:15px;line-height:1.8;color:#B8B2A6;white-space:pre-line;">${opts.body}</div>
          ${opts.content ? `<div style="margin-top:22px;">${opts.content}</div>` : ''}
          ${opts.buttonText && opts.buttonUrl ? `<div style="text-align:center;margin-top:28px;"><a href="${opts.buttonUrl}" style="display:inline-block;background:${buttonBg};color:${buttonFg};font-weight:800;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">${opts.buttonText}</a></div>` : ''}
          <div style="margin-top:24px;font-size:13px;line-height:1.75;color:#6E6A5F;">${opts.footer || ''}</div>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid rgba(201,162,39,0.12);font-size:11px;color:#6E6A5F;text-align:center;background:#0B0C0F !important;">© ${new Date().getFullYear()} Altaris Capital · A considered home for serious capital</td></tr>
      </table>
    </td></tr>
  </table></body></html>`
}
