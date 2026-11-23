// EmailTemplates/adminServiceReportEmail.js

const getAdminServiceReportTemplate = (
  recipientName = "Admin",
  segments = [],
  currentYear = new Date().getFullYear(),
  personOrg = "PresencePro",
  submittedBy = "Service Coordinator"
) => {
  // Escape HTML characters so user notes don't break the email layout
  const escapeHtml = (str) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const segmentRowsHtml = segments
    .map(
      (seg) => `
      <tr>
        <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; width: 32%; vertical-align: top; font-weight: 700; color: #1e293b; background-color: #f8fafc;">
          ${escapeHtml(seg.title || "Service Segment")}
        </td>
        <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; width: 68%; vertical-align: top; color: #334155; line-height: 1.55;">
          ${escapeHtml(seg.notes || "No remarks recorded.").replace(/\n/g, "<br/>")}
        </td>
      </tr>
    `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Service Report</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);">
            
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #4f46e5, #0ea5e9); padding: 28px 32px; text-align: left;">
                <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #e0f2fe;">
                  ${escapeHtml(personOrg)} • Administrative Briefing
                </p>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">
                  Service Report &amp; Notes Summary
                </h1>
              </td>
            </tr>

            <!-- Intro -->
            <tr>
              <td style="padding: 24px 32px 12px 32px; color: #334155; font-size: 15px; line-height: 1.6;">
                <p style="margin: 0 0 12px 0;">Hello <strong>${escapeHtml(recipientName)}</strong>,</p>
                <p style="margin: 0;">
                  Here is the structured service report submitted by <strong>${escapeHtml(submittedBy)}</strong>:
                </p>
              </td>
            </tr>

            <!-- Structured Service Segments Table -->
            <tr>
              <td style="padding: 12px 32px 28px 32px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; border-collapse: collapse; font-size: 14px;">
                  <thead>
                    <tr>
                      <th align="left" style="padding: 12px 16px; background-color: #0f172a; color: #ffffff; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px;">
                        Segment
                      </th>
                      <th align="left" style="padding: 12px 16px; background-color: #0f172a; color: #ffffff; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px;">
                        Notes &amp; Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    ${segmentRowsHtml}
                  </tbody>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; padding: 18px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
                <p style="margin: 0 0 4px 0;">Automated Dispatch via <strong>PresencePro</strong></p>
                <p style="margin: 0;">&copy; ${currentYear} ${escapeHtml(personOrg)}. All rights reserved.</p>
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

module.exports = getAdminServiceReportTemplate; 