# Sending email with SMTP (Nodemailer)

The app sends email via **Nodemailer** when SMTP env vars are set. It falls back to Resend if only `RESEND_API_KEY` is set.

## .env (SMTP)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your@gmail.com
```

Other providers: use their SMTP host/port (e.g. Mailgun, SendGrid, Outlook).

---

## Gmail setup

1. **Use an App Password**  
   Gmail no longer allows “less secure apps.” You must use a [Google App Password](https://support.google.com/accounts/answer/185833).

2. **Enable 2-Step Verification** (required for App Passwords)  
   - [Google Account](https://myaccount.google.com/) → Security → **2-Step Verification** → turn on.

3. **Create an App Password**  
   - [App Passwords](https://myaccount.google.com/apppasswords) (or Security → 2-Step Verification → App passwords).  
   - Select app: **Mail**, device: **Other** (e.g. “SocialMediaManager”).  
   - Copy the 16-character password (no spaces).

4. **Set env**
   - `SMTP_USER` = your Gmail address.  
   - `SMTP_PASS` = the 16-character App Password.  
   - `EMAIL_FROM` = same as `SMTP_USER` (or `"Your Name <your@gmail.com>"`).

5. **Restart the app** and use signup or `POST /api/email/test` with `{"to": "you@example.com"}` to test.

---

## Gmail SMTP reference

| Setting   | Value           |
|----------|-----------------|
| Host     | `smtp.gmail.com`|
| Port     | `587` (TLS) or `465` (SSL) |
| Secure   | Port 465 = yes, 587 = no   |

If you hit “username and password not accepted,” use an App Password, not your normal Gmail password.
