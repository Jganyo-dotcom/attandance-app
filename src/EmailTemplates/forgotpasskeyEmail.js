const forgotPasskeyTemplate = (resetToken, currentYear, orgName) => {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding: 40px 0; }
          .container { max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden; }
          .header { background: #0284c7; padding: 32px; text-align: center; }
          .header h2 { color: #ffffff; margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.025em; }
          .body-content { padding: 32px; }
          .body-content p { font-size: 0.95rem; line-height: 1.6; color: #4b5563; margin: 0 0 16px 0; }
          .org-badge { display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; font-size: 0.85rem; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-bottom: 20px; }
          .token-box { background-color: #f8fafc; border: 2px dashed #0284c7; padding: 18px; border-radius: 12px; text-align: center; margin: 24px 0; word-break: break-all; }
          .token-code { font-family: 'Courier New', Courier, monospace; font-size: 1.1rem; font-weight: 700; color: #0284c7; letter-spacing: 1px; }
          .footer-warning { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px !important; font-size: 0.8rem !important; color: #9ca3af !important; line-height: 1.4; }
          .footer-copy { text-align: center; font-size: 0.8rem; color: #9ca3af; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h2>Account Protection Security</h2>
            </div>
            <div class="body-content">
              <span class="org-badge">🔒 ${orgName || "Organization"}</span>
              <p>Hello Admin,</p>
              <p>A request was authorized to reset the management security passkey assigned to your dashboard profile.</p>
              <p>Copy the security token code below and paste it into the reset password field in your application:</p>
              
              <div class="token-box">
                <span class="token-code">${resetToken}</span>
              </div>
              
              <p><strong>Note:</strong> This token will automatically expire in <strong>60 minutes</strong> for safety boundaries.</p>
              <p class="footer-warning">
                If you did not initiate this recovery protocol transaction, please disregard this automated payload notice safely. Your current credential layers remain completely secured.
              </p>
              <div class="footer-copy">
                &copy; ${currentYear} PresencePro. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
};

module.exports = forgotPasskeyTemplate;
