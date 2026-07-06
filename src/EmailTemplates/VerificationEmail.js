// templates/otpTemplate.js
const getOtpTemplate = (name, otpCode, currentYear) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Account</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:48px 20px;">
        <tr>
          <td align="center">
            <table width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
              <tr>
                <td style="padding-bottom:24px;border-bottom:1px solid #f1f5f9;">
                  <span style="font-size:18px;font-weight:700;color:#0f172a;">PresencePro</span>
                </td>
              </tr>
              <tr>
                <td style="padding-top:24px;">
                  <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#0f172a;">Verify your identity</h2>
                  <p style="margin:0 0 24px;font-size:14px;line-height:24px;color:#475569;">
                    Hello ${name},<br><br>
                    Use the following one-time password (OTP) to complete your verification:
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:16px 0 24px;">
                  <table border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;border-radius:8px;">
                    <tr>
                      <td style="padding:14px 32px;font-family:monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#0f172a;">
                        ${otpCode}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td>
                  <p style="margin:0 0 32px;font-size:13px;line-height:22px;color:#64748b;">
                    This code is valid for <strong>5 minutes</strong>. Do not share it with anyone.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid #f1f5f9;padding-top:24px;">
                  <p style="margin:0;font-size:12px;color:#94a3b8;line-height:18px;">
                    &copy; ${currentYear} PresencePro. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

module.exports = getOtpTemplate
