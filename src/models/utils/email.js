const nodemailer = require("nodemailer");
const { BrevoClient } = require("@getbrevo/brevo");
const getOtpTemplate = require("../../EmailTemplates/VerificationEmail");
const getWelcomeTemplate = require("../../EmailTemplates/welcomeNewComers");
const forgetPasswordTemplate = require("../../EmailTemplates/forgetPasswordEmail");
const getWeMissedUTemplate = require("../../EmailTemplates/NewComersEmail");
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

const sendUniversalMail = async (type, options) => {
  const { recipientEmail, recipientName, subject, otpCode, personOrg ,custome} = options;
  const currentYear = new Date().getFullYear();

  // Basic input validation guard
  if (!recipientEmail || !recipientEmail.includes("@")) {
     console.error(`[Mail Aborted] Cannot send email. Address is invalid: ${recipientEmail}`);
    
    return null; // 🚀 CRITICAL FIX: Explicitly returns and halts execution instantly!
  }

  let htmlContent = "";

  // Select template explicitly based on strict type indicator
  if (type === "OTP") {
    htmlContent = getOtpTemplate(recipientName, otpCode, currentYear);
  } else if (type === "WE_MISSED_YOU") {
    htmlContent = getWeMissedUTemplate(recipientName, currentYear, personOrg);
  }else if (type === "Welcome_first_timers") {
    htmlContent = getWelcomeTemplate(recipientName, currentYear, personOrg);
  }
  else if (type === "forgetPassword") {
    htmlContent = forgetPasswordTemplate(custome, currentYear );
  }else {
    throw new Error(`Unknown email template type requested: ${type}`);
  }

  try {
    const data = await brevo.transactionalEmails.sendTransacEmail({
      to: [{ email: recipientEmail, name: recipientName }],
      sender: { email: "elikemjjames@gmail.com", name: "PresencePro" },
      subject: subject,
      htmlContent: htmlContent,
    });

    console.log(`Email [${type}] successfully routed to ${recipientEmail}. Message ID:`, data.messageId);
    return data;
  } catch (error) {
    console.error(`Failed to route universal mail to ${recipientEmail}:`, error);
    throw error;
  }
};
module.exports = { sendMail, sendUniversalMail };
