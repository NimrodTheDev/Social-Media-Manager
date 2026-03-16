const dns = require('dns');
const nodemailer = require('nodemailer');

// Prefer IPv4 for SMTP (avoids EHOSTUNREACH when IPv6 to Gmail is unreachable)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// --- Config: SMTP (Nodemailer) or Resend ---
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT || '587';
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const resendApiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM || 'noreply@localhost';

const useSmtp = !!(smtpHost && smtpUser && smtpPass);

let transporter = null;
if (useSmtp) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: smtpPort === '465',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}


const isConfigured = useSmtp;

/**
 * Send email via SMTP (Nodemailer) or Resend.
 * Uses SMTP when SMTP_HOST + SMTP_USER + SMTP_PASS are set; otherwise Resend if RESEND_API_KEY is set.
 *
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Subject line
 * @param {string} [options.html] - HTML body
 * @param {string} [options.text] - Plain text body (optional)
 * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
 */


async function sendEmail({ to, subject, html, text }) {
  if (!isConfigured) {
    console.warn('Email not sent: configure SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) or RESEND_API_KEY');
    return { success: false, error: 'Email service not configured' };
  }

  const toList = Array.isArray(to) ? to : [to];

  if (useSmtp) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toList.join(', '),
        subject,
        text: text || (html ? html.replace(/<[^>]+>/g, '') : undefined),
        html: html || undefined,
      });
      return { success: true, id: info.messageId };
    } catch (err) {
      console.error('SMTP send failed:', err);
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'Email service not configured' };
}

async function sendText(to, subject, text) {
  return sendEmail({ to, subject, text });
}

async function sendHtml(to, subject, html) {
  return sendEmail({ to, subject, html });
}

module.exports = {
  sendEmail,
  sendText,
  sendHtml,
  isConfigured,
};
