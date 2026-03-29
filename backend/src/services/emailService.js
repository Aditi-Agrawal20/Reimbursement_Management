const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const LOG_FILE = path.join(__dirname, '..', '..', 'email_log.txt');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

// ─── SMTP Transporter (Gmail) ────────────────────────────────
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.MAIL_USERNAME;
  const pass = process.env.MAIL_PASSWORD;

  if (!user || !pass) {
    console.log('⚠️  MAIL_USERNAME / MAIL_PASSWORD not set — emails will be logged to console only.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  // Verify connection on first use
  transporter.verify()
    .then(() => console.log('✅ Gmail SMTP connected'))
    .catch(err => {
      console.error('❌ Gmail SMTP connection failed:', err.message);
      transporter = null; // Fallback to console logging
    });

  return transporter;
}

// ─── Helpers ──────────────────────────────────────────────────

function generateTempPassword() {
  return crypto.randomBytes(6).toString('base64url'); // e.g. "aB3kL9mNx1"
}

function logEmail(subject, to, body) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] TO: ${to} | SUBJECT: ${subject}`;
  console.log(`\n📧 ${line}\n`);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (_) {}
}

async function sendMail(to, subject, html) {
  logEmail(subject, to, html);

  const smtp = getTransporter();
  if (!smtp) return false; // No SMTP configured — already logged

  try {
    await smtp.sendMail({
      from: `"ClearClaim" <${process.env.MAIL_USERNAME}>`,
      to,
      subject,
      html,
    });
    console.log(`  ✉️  Delivered to ${to}`);
    return true;
  } catch (err) {
    console.error(`  ❌ Send failed to ${to}:`, err.message);
    return false;
  }
}

// ─── Email 1: Temp Password (Welcome) ────────────────────────

async function sendTempPassword(email, tempPassword, recipientName, companyName) {
  const name = recipientName || email.split('@')[0];
  const company = companyName || 'your company';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#04050a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#04050a;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
  style="background:#0d1120;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">

  <!-- Header -->
  <tr>
    <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="background:linear-gradient(135deg,#00e5a0,#00b4d8);width:32px;height:32px;border-radius:8px;text-align:center;vertical-align:middle;">
          <span style="color:#04050a;font-weight:800;font-size:14px;">CC</span>
        </td>
        <td style="padding-left:10px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">ClearClaim</span>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:36px 40px;">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">Hello ${name},</p>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 16px;line-height:1.3;">
        You've been added to<br>
        <span style="background:linear-gradient(135deg,#00e5a0,#00b4d8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${company}</span>
      </h1>
      <p style="color:#64748b;font-size:13px;line-height:1.7;margin:0 0 28px;">
        Your account on ClearClaim has been created. Use the credentials below to log in and start submitting expense claims.
      </p>

      <!-- Credentials box -->
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#080b14;border:1px solid rgba(255,255,255,0.06);border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:24px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.05);">
                <p style="color:#4b5563;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Login Email</p>
                <p style="color:#e2e8f0;font-size:14px;font-weight:500;margin:0;">${email}</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:16px;">
                <p style="color:#4b5563;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">Temporary Password</p>
                <div style="background:#0f1424;border:1px solid rgba(0,229,160,0.2);border-radius:8px;padding:12px 16px;display:inline-block;">
                  <code style="color:#00e5a0;font-size:18px;font-family:'Courier New',monospace;font-weight:600;letter-spacing:0.15em;">${tempPassword}</code>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- Warning -->
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;margin-bottom:28px;">
        <tr><td style="padding:14px 18px;">
          <p style="color:#fbbf24;font-size:12px;margin:0;line-height:1.6;">
            <strong>Important:</strong> This is a temporary password. Please log in and change it immediately from your profile settings.
          </p>
        </td></tr>
      </table>

      <!-- CTA -->
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="background:linear-gradient(135deg,#00e5a0,#00b4d8);border-radius:8px;">
          <a href="${FRONTEND_URL}"
            style="display:inline-block;padding:13px 32px;color:#04050a;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
            Log in to ClearClaim
          </a>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="color:#374151;font-size:11px;margin:0;line-height:1.6;">
        This email was sent because an admin at ${company} added you to ClearClaim.
        If this was a mistake, you can safely ignore this email.
      </p>
    </td>
  </tr>

</table>
</td></tr></table>
</body></html>`;

  return sendMail(email, `You've been added to ${company} on ClearClaim`, html);
}

// ─── Email 2: Expense Status (Approved / Rejected) ──────────

async function sendExpenseStatusEmail(toEmail, toName, expense, action, comment) {
  const isApproved = action === 'approved';

  const statusColor = isApproved ? '#00e5a0' : '#ef4444';
  const statusBg = isApproved ? 'rgba(0,229,160,0.08)' : 'rgba(239,68,68,0.08)';
  const statusBorder = isApproved ? 'rgba(0,229,160,0.25)' : 'rgba(239,68,68,0.25)';
  const statusLabel = isApproved ? 'Approved' : 'Rejected';
  const statusIcon = isApproved ? '✓' : '✕';

  const subject = isApproved
    ? 'Your expense has been approved — ClearClaim'
    : 'Your expense was rejected — ClearClaim';

  const commentBlock = comment ? `
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;margin-top:16px;">
        <tr><td style="padding:16px 20px;">
          <p style="color:#4b5563;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px;">Reviewer's comment</p>
          <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.6;font-style:italic;">"${comment}"</p>
        </td></tr>
      </table>` : '';

  // Format amount
  const amount = typeof expense.amount === 'number' ? expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : expense.amount;
  const convertedAmount = expense.converted_amount
    ? expense.converted_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : null;
  const currency = expense.currency || 'INR';
  const showConverted = convertedAmount && currency !== 'INR';
  const convertedLine = showConverted
    ? `<p style="color:#4b5563;font-size:12px;margin:4px 0 0;font-family:'Courier New',monospace;">≈ INR ${convertedAmount}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#04050a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#04050a;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
  style="background:#0d1120;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">

  <!-- Header -->
  <tr>
    <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="background:linear-gradient(135deg,#00e5a0,#00b4d8);width:32px;height:32px;border-radius:8px;text-align:center;vertical-align:middle;">
          <span style="color:#04050a;font-weight:800;font-size:14px;">CC</span>
        </td>
        <td style="padding-left:10px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">ClearClaim</span>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:36px 40px;">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">Hello ${toName},</p>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 24px;">
        Your expense has been
        <span style="color:${statusColor};">${statusLabel.toLowerCase()}</span>
      </h1>

      <!-- Expense detail card -->
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#080b14;border:1px solid rgba(255,255,255,0.06);border-radius:12px;margin-bottom:20px;">
        <tr><td style="padding:24px 28px;">

          <!-- Status badge -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
            <td style="background:${statusBg};border:1px solid ${statusBorder};border-radius:20px;padding:5px 14px;">
              <span style="color:${statusColor};font-size:12px;font-weight:600;">${statusIcon} ${statusLabel}</span>
            </td>
          </tr></table>

          <!-- Fields -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.05);">
                <p style="color:#4b5563;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Description</p>
                <p style="color:#e2e8f0;font-size:14px;font-weight:500;margin:0;">${expense.description || expense.category}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <p style="color:#4b5563;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Amount</p>
                <p style="color:#e2e8f0;font-size:20px;font-weight:700;font-family:'Courier New',monospace;margin:0;">${currency} ${amount}</p>
                ${convertedLine}
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                <p style="color:#4b5563;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Vendor</p>
                <p style="color:#e2e8f0;font-size:13px;margin:0;">${expense.vendor || '—'}</p>
              </td>
            </tr>
          </table>

          ${commentBlock}
        </td></tr>
      </table>

      <!-- CTA -->
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="background:linear-gradient(135deg,#00e5a0,#00b4d8);border-radius:8px;">
          <a href="${FRONTEND_URL}"
            style="display:inline-block;padding:13px 32px;color:#04050a;font-size:13px;font-weight:700;text-decoration:none;">
            View in ClearClaim
          </a>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="color:#374151;font-size:11px;margin:0;line-height:1.6;">
        You are receiving this because you submitted an expense on ClearClaim.
      </p>
    </td>
  </tr>

</table>
</td></tr></table>
</body></html>`;

  return sendMail(toEmail, subject, html);
}

// ─── Email 3: Password Changed Confirmation ──────────────────

async function sendPasswordChangedNotification(email, name) {
  const displayName = name || email.split('@')[0];

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#04050a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#04050a;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
  style="background:#0d1120;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">

  <!-- Header -->
  <tr>
    <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="background:linear-gradient(135deg,#00e5a0,#00b4d8);width:32px;height:32px;border-radius:8px;text-align:center;vertical-align:middle;">
          <span style="color:#04050a;font-weight:800;font-size:14px;">CC</span>
        </td>
        <td style="padding-left:10px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">ClearClaim</span>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:36px 40px;">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">Hello ${displayName},</p>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 16px;line-height:1.3;">
        Your password has been
        <span style="color:#00e5a0;">changed</span>
      </h1>
      <p style="color:#64748b;font-size:13px;line-height:1.7;margin:0 0 28px;">
        Your ClearClaim password was successfully updated. If you didn't make this change, please contact your admin immediately.
      </p>

      <!-- Security notice -->
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:rgba(0,229,160,0.05);border:1px solid rgba(0,229,160,0.15);border-radius:10px;margin-bottom:28px;">
        <tr><td style="padding:16px 20px;">
          <p style="color:#00e5a0;font-size:12px;margin:0;line-height:1.7;">
            ✓ Password changed at ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}<br>
            ✓ All previous sessions have been invalidated
          </p>
        </td></tr>
      </table>

      <!-- CTA -->
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="background:linear-gradient(135deg,#00e5a0,#00b4d8);border-radius:8px;">
          <a href="${FRONTEND_URL}"
            style="display:inline-block;padding:13px 32px;color:#04050a;font-size:13px;font-weight:700;text-decoration:none;">
            Open ClearClaim
          </a>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="color:#374151;font-size:11px;margin:0;line-height:1.6;">
        If you did not request this change, please contact your system administrator.
      </p>
    </td>
  </tr>

</table>
</td></tr></table>
</body></html>`;

  return sendMail(email, 'Your ClearClaim password was changed', html);
}

module.exports = {
  generateTempPassword,
  sendTempPassword,
  sendExpenseStatusEmail,
  sendPasswordChangedNotification,
};
