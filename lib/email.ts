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
  const purposeMap: Record<string, string> = {
    SIGNUP: 'complete your account setup',
    LOGIN: 'confirm your sign-in',
    WITHDRAWAL: 'authorise your withdrawal',
    KYC: 'submit your identity verification',
  }
  const purposeText = purposeMap[purpose] || 'verify your account'

  await transporter.sendMail({
    from: `"Altaris Capital" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Your Altaris Capital code: ${otp}`,
    html: renderEmail({
      name: safeName,
      eyebrow: 'Security code',
      title: `One-time code to ${purposeText}`,
      body: 'Enter the code below to continue. It expires in 5 minutes and can only be used once. Do not share this code with anyone — our team will never ask for it.',
      content: `
        <div style="margin:24px 0;text-align:center;">
          <div style="display:inline-block;background:#111214;border:1px solid rgba(201,162,39,0.35);border-radius:12px;padding:22px 40px;">
            <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8B8FA8;margin-bottom:10px;font-family:Arial,sans-serif;">Your verification code</div>
            <div style="font-family:Arial,sans-serif;font-size:44px;font-weight:700;letter-spacing:0.28em;color:#C9A227;line-height:1;">${otp}</div>
            <div style="font-size:11px;color:#8B8FA8;margin-top:10px;font-family:Arial,sans-serif;">Expires in 5 minutes</div>
          </div>
        </div>`,
      footer: 'If you did not request this code, your account is not at risk — simply ignore this email.',
    }),
  })
}

export async function sendNotificationEmail(email: string, name: string, title: string, body: string) {
  const safeName = name?.trim() || 'there'
  const safeTitle = title?.trim() || 'Account Update'
  const safeBody = body?.trim() || 'You have a new update in your Altaris Capital account.'

  await transporter.sendMail({
    from: `"Altaris Capital" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `${safeTitle} — Altaris Capital`,
    html: renderEmail({
      name: safeName,
      eyebrow: 'Account update',
      title: safeTitle,
      body: safeBody,
      footer: 'Log in to the app to review this update and take any required action.',
      buttonText: 'Open App',
      buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
      buttonTone: 'gold',
    }),
  })
}

export async function sendKycStatusEmail(email: string, name: string, status: 'approved' | 'rejected', reason?: string) {
  const safeName = name?.trim() || 'there'
  const isApproved = status === 'approved'

  await transporter.sendMail({
    from: `"Altaris Capital" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: isApproved ? 'Identity Verified — Altaris Capital' : 'KYC Action Required — Altaris Capital',
    html: renderEmail({
      name: safeName,
      eyebrow: 'Identity verification',
      title: isApproved ? 'Your identity has been verified' : 'Your submission needs attention',
      body: isApproved
        ? 'Your identity has been successfully verified. You now have full access to the platform — including withdrawals, deposits, and all premium account features.'
        : `Your KYC submission could not be approved at this time. ${reason ? `Reason: ${reason}` : 'Please resubmit with clearer, legible documents.'}\n\nOpen the app to review what's needed and upload updated documents so we can complete verification without further delay.`,
      content: `
        <div style="margin:20px 0;">
          <span style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:999px;
            background:${isApproved ? 'rgba(63,185,132,0.10)' : 'rgba(224,86,107,0.10)'};
            color:${isApproved ? '#3FB984' : '#E0566B'};
            font-weight:700;font-size:12px;letter-spacing:0.08em;font-family:Arial,sans-serif;">
            ${isApproved ? '&#10003;&nbsp;&nbsp;Identity Verified' : '&#9888;&nbsp;&nbsp;Action Required'}
          </span>
        </div>`,
      footer: isApproved
        ? 'Withdrawals and all premium features are now available in your account.'
        : 'Open the app to review the required documents and resubmit.',
      buttonText: isApproved ? 'Go to Dashboard' : 'Resubmit Documents',
      buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/kyc`,
      buttonTone: isApproved ? 'gold' : 'danger',
    }),
  })
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const safeName = name?.trim() || 'there'
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`

  await transporter.sendMail({
    from: `"Altaris Capital" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Reset your Altaris Capital password',
    html: renderEmail({
      name: safeName,
      eyebrow: 'Password reset',
      title: 'Reset your password',
      body: 'We received a request to reset the password on your Altaris Capital account. Click the button below to set a new password.\n\nThis link expires in 1 hour and can only be used once. If you did not request this, no action is needed — your password has not been changed.',
      footer: "Didn't request this? Ignore this email and your password will remain unchanged.",
      buttonText: 'Reset Password',
      buttonUrl: resetUrl,
      buttonTone: 'gold',
    }),
  })
}

// ---------------------------------------------------------------------------
// Shared renderer
// ---------------------------------------------------------------------------

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
  const buttonFg = '#000000'

  // Escape newlines in body for HTML
  const bodyHtml = opts.body
    .split('\n\n')
    .map((para) => `<p style="margin:0 0 14px 0;">${para.replace(/\n/g, '<br>')}</p>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>${opts.eyebrow} — Altaris Capital</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0B0E;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preview text (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${opts.title} — Altaris Capital</div>

  <!-- Outer wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0A0B0E;min-height:100vh;">
    <tr>
      <td align="center" valign="top" style="padding:40px 16px;">

        <!-- Email card — max 600px -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background-color:#111214;border:1px solid #1E2028;border-bottom:none;border-radius:16px 16px 0 0;padding:24px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Gold triangle logomark -->
                  <td style="padding-right:10px;vertical-align:middle;">
                    <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:14px solid #C9A227;"></div>
                  </td>
                  <!-- Wordmark -->
                  <td style="vertical-align:middle;">
                    <span style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.18em;color:#FFFFFF;text-transform:uppercase;">ALTARIS</span>
                    <span style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.22em;color:#C9A227;text-transform:uppercase;margin-left:6px;">Capital</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Gold accent bar -->
          <tr>
            <td style="background:linear-gradient(90deg,#C9A227 0%,rgba(201,162,39,0.15) 100%);height:2px;border-left:1px solid #1E2028;border-right:1px solid #1E2028;"></td>
          </tr>

          <!-- ── BODY CARD ── -->
          <tr>
            <td style="background-color:#111214;border:1px solid #1E2028;border-top:none;border-bottom:none;padding:36px 32px 28px;">

              <!-- Eyebrow label -->
              <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.20em;text-transform:uppercase;color:#C9A227;">${opts.eyebrow}</p>

              <!-- Greeting -->
              <h1 style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#FFFFFF;line-height:1.25;">Hello, ${opts.name}</h1>

              <!-- Title / subheading -->
              <p style="margin:0 0 20px 0;font-family:Arial,sans-serif;font-size:15px;color:#8B8FA8;line-height:1.55;">${opts.title}</p>

              <!-- Divider -->
              <div style="height:1px;background-color:#1E2028;margin-bottom:24px;"></div>

              <!-- Body text -->
              <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.75;color:#C8CBD8;">
                ${bodyHtml}
              </div>

              <!-- Optional content block (OTP box, status badge, etc.) -->
              ${opts.content ? `<div style="margin:8px 0 4px;">${opts.content}</div>` : ''}

              <!-- CTA button -->
              ${opts.buttonText && opts.buttonUrl ? `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${opts.buttonUrl}"
                       style="display:inline-block;background-color:${buttonBg};color:${buttonFg};font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.04em;text-decoration:none;padding:14px 36px;border-radius:8px;mso-padding-alt:14px 36px;">
                      ${opts.buttonText}
                    </a>
                  </td>
                </tr>
              </table>` : ''}

            </td>
          </tr>

          <!-- ── FOOTER NOTE ── -->
          ${opts.footer ? `
          <tr>
            <td style="background-color:#0F1013;border:1px solid #1E2028;border-top:none;border-bottom:none;padding:18px 32px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#8B8FA8;line-height:1.6;">${opts.footer}</p>
            </td>
          </tr>` : ''}

          <!-- ── LEGAL FOOTER ── -->
          <tr>
            <td style="background-color:#0A0B0E;border:1px solid #1E2028;border-top:1px solid #1E2028;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
              <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.16em;color:#8B8FA8;text-transform:uppercase;">Altaris Capital</p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#3D4052;line-height:1.6;">
                &copy; ${new Date().getFullYear()} Altaris Capital. All rights reserved.<br>
                This email was sent to you as a registered user of the Altaris Capital platform.<br>
                Please do not reply to this email — it is sent from an unmonitored address.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Email card -->

      </td>
    </tr>
  </table>

</body>
</html>`
}
