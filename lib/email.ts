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
      title: `Your code to ${purposeText[purpose] || 'verify your account'}`,
      body: 'Use the one-time code below to continue. It expires in 5 minutes.',
      content: `<div style="font-size:48px;font-weight:900;letter-spacing:0.24em;color:#f2ba0e;text-align:center;font-variant-numeric:tabular-nums;background:rgba(242,186,14,0.08);border:1px solid rgba(242,186,14,0.18);border-radius:18px;padding:26px 20px;">${otp}</div>`,
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
      body: safeBody,
      content: '',
      footer: 'Open the app to review this update and continue.',
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
        ? 'Congratulations. Your account is verified and you now have full access to the platform.'
        : `Your KYC submission was not approved yet. ${reason ? `Reason: ${reason}` : 'Please resubmit with clearer documents.'}`,
      content: `<div style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:${isApproved ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)'};color:${isApproved ? '#0ECB81' : '#F6465D'};font-weight:800;font-size:13px;">${isApproved ? 'Verified' : 'Action required'}</div>`,
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
      body: 'We received a request to reset your Altaris Capital password. Use the button below to choose a new one. This link expires in 1 hour.',
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
  const buttonBg = opts.buttonTone === 'danger' ? '#F6465D' : '#F2BA0E'
  const buttonFg = opts.buttonTone === 'danger' ? '#fff' : '#000'
  return `<!DOCTYPE html><html><body style="margin:0;background:#07090c;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#e8e8e8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#07090c;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:22px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.35);">
        <tr><td style="padding:28px 28px 18px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#f2ba0e;font-weight:800;">${opts.eyebrow}</div>
          <div style="font-size:24px;line-height:1.25;font-weight:800;color:#ffffff;margin-top:10px;">Hello ${opts.name || 'there'},</div>
          <div style="font-size:14px;color:#9aa4b2;margin-top:8px;line-height:1.6;">${opts.title}</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <div style="font-size:15px;line-height:1.75;color:#c9d1d9;white-space:pre-line;">${opts.body}</div>
          ${opts.content ? `<div style="margin-top:22px;">${opts.content}</div>` : ''}
          ${opts.buttonText && opts.buttonUrl ? `<div style="text-align:center;margin-top:26px;"><a href="${opts.buttonUrl}" style="display:inline-block;background:${buttonBg};color:${buttonFg};font-weight:800;font-size:15px;padding:14px 34px;border-radius:12px;text-decoration:none;">${opts.buttonText} →</a></div>` : ''}
          <div style="margin-top:22px;font-size:13px;line-height:1.7;color:#7e8794;">${opts.footer || ''}</div>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#65707f;text-align:center;">© ${new Date().getFullYear()} Altaris Capital</td></tr>
      </table>
    </td></tr>
  </table></body></html>`
}
