const getWeMissedUTemplate = (name, currentYear, personOrg) => { 
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>We Missed You</title>
    </head>
    <body style="margin:0;padding:20px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:32px;">
        <tr>
          <td>
            <h2 style="color: #2c3e50; margin-top:0;">Hi ${name}, ❤️</h2>
            
            <p style="font-size: 16px; color: #34495e; line-height: 1.6;">
              We missed you at church today! Our service was beautiful, but it truly wasn't the same 
              without your presence in fellowship with us. 
            </p>
            
            <p style="font-size: 16px; color: #34495e; line-height: 1.6;">
              We wanted to reach out and check in to make sure you are doing completely okay. We hope 
              there is no problem at all, and that you are just having a restful, refreshing weekend. 
            </p>
            
            <p style="font-size: 16px; color: #34495e; line-height: 1.6; font-weight: bold;">
              Please know that you are deeply valued here. If you need prayers, support, or anything at all 
              this week, do not hesitate to reach back out to us. 
            </p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            
            <p style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">Sending you peace and love,<br><strong>${personOrg}</strong></p>
            
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

module.exports = getWeMissedUTemplate;
