const nodemailer = require("nodemailer");
const { BrevoClient } = require("@getbrevo/brevo");
const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

// configure transporter (example: Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail", // you can also use "Outlook", "Yahoo", or custom SMTP
  auth: {
    user: process.env.EMAIL_USER, // your email address
    pass: process.env.EMAIL_PASS, // your email password or app-specific password
  },
});

// function to send mail
async function sendMail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });
    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

/**
 * Universal function to send a transactional email via Brevo
 * @param {string} recipientEmail - The email address of the receiver
 * @param {string} recipientName - The full name of the receiver
 * @param {string} customMessage - The body text/HTML of the email
 * @param {string} [subject] - Optional email subject line
 * @returns {Promise<object>} - Returns Brevo's API success response
 */

const sendUniversalMail = async (
  recipientEmail,
  recipientName,
  customMessage,
  subject = "We loved fellowshiping with you!",
) => {
  // Basic input validation guards
  if (!recipientEmail || !recipientEmail.includes("@")) {
    throw new Error(
      `Invalid recipient email address provided: ${recipientEmail}`,
    );
  }

  // Constructing the email body wrapper
  const emailHtml = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          ${customMessage}
        </div>
      </body>
    </html>
  `;

  try {
    // FIX 1 & 2: Added "const data =" so data is defined, and structure parameters match the SDK expectations
    const data = await brevo.transactionalEmails.sendTransacEmail({
      to: [{ email: recipientEmail, name: recipientName }],
      sender: { email: "elikemjjames@gmail.com", name: "PresencePro" },
      subject: subject,
      htmlContent: emailHtml,
    });

    console.log(
      `Email successfully routed to ${recipientEmail}. Message ID:`,
      data.messageId,
    );
    return data;
  } catch (error) {
    console.error(
      `Failed to route universal mail to ${recipientEmail}:`,
      error,
    );
    throw error;
  }
};

module.exports = { sendMail, sendUniversalMail };
