const forgetPasswordTemplate = (custome, currentYear) => { 
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 20px; background-color: #f8fafc;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px;">
          <tr>
            <td>
              <p>Dear user,</p>
              <p>We received a request to restore access to your account.</p>
              <p>Kindly click the link below to safely reset your password:</p>
              <p style="margin: 20px 0;">
                <a href="${custome}" style="background-color: #2c3e50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Reset Password
                </a>
              </p>
              <p>This verification link will expire in <strong>15 minutes</strong>.</p>
              <p style="color: #7f8c8d; font-size: 0.9em;">If you didn’t request this change, you can safely ignore this email or report it to your system administrator.</p>
              <br>
              <p>Best regards,<br>
              <strong>PresencePro Support Team</strong></p>
              
              <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top:12px;">
                &copy; ${currentYear} PresencePro. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `; // Fixed: Removed trailing comma inside structural blocks
};

module.exports = forgetPasswordTemplate;
