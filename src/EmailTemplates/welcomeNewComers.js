const getWelcomeTemplate = (name, currentYear, personOrg) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Our Fellowship</title>
    </head>
    <body style="margin:0;padding:20px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:32px;">
        <tr>
          <td>
            <h2 style="color: #2c3e50; margin-top: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Hello ${name}, ✨</h2>
            
            <p style="font-size: 16px; color: #34495e; line-height: 1.6;">
              ${personOrg} wants to take a quick moment to say a massive thank you for sharing your time with us today! 
              It was an absolute joy and privilege to fellowship with you. Your presence brought a truly 
              special warmth to our service, and we feel incredibly blessed that you chose to spend your day with us.
            </p>
            
            <p style="font-size: 16px; color: #34495e; line-height: 1.6;">
              We hope you felt right at home and experienced the depth of love and community we share here. 
              You are always welcome in our family, and we are already looking forward to the next time we get 
              to see your smiling face and share in fellowship together.
            </p>
            
            <p style="font-size: 16px; color: #34495e; line-height: 1.6; font-weight: bold;">
              May your week ahead be beautifully blessed, filled with peace, unmeasurable joy, and favor!
            </p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            
            <p style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">With love and warmest regards from ${personOrg},</p>
            <p style="font-size: 16px; color: #2c3e50; font-weight: bold; margin-top: 0;">Your PresencePro🤝</p>
            
            <!-- Dynamic Current Year Footer -->
            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top:12px;">
              &copy; ${currentYear} PresencePro. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

module.exports = getWelcomeTemplate;
