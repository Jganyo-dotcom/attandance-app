const forgotPasskey = (message, sender, currentyear, custome, orgName);
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
          .btn-container { text-align: center; margin: 28px 0; }
          .btn-action { display: inline-block; background-color: #0284c7; color: #ffffff !important; font-size: 0.95rem; font-weight: 600; padding: 14px 28px; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.15); }
          .btn-action:hover { background-color: #0369a1; }
          .footer-warning { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px !important; font-size: 0.8rem !important; color: #9ca3af !important; line-height: 1.4; }
          .link-fallback { word-break: break-all; color: #0284c7; text-decoration: underline; font-size: 0.85rem; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h2>Account Protection Security</h2>
            </div>
            <div class="body-content">
              <span class="org-badge">🔒 ${orgName}</span>
              <p>Hello Admin,</p>
              <p>A request was authorized to reset the management security passkey assigned to your dashboard account configuration profile.</p>
              <p>To establish a new administrative configuration token, please click the verification button below:</p>
              
              <div class="btn-container">
                <a href="${custome}" class="btn-action" target="_blank">Reset Security Passkey</a>
              </div>
              
              <p><strong>Note:</strong> This verification routing channel will automatically terminate and expire in exactly 60 minutes for infrastructure safety boundaries.</p>
              <p class="footer-warning">
                If you did not initiate this recovery protocol transaction, please disregard this automated payload notice safely. Your current credential layers remain completely secured.<br><br>
                Trouble opening the button? Copy and paste this URL destination address into your browser window frame:<br>
                <a href="${resetUrl}" class="link-fallback" target="_blank">${resetUrl}</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

module.exports = forgotPasskey;
