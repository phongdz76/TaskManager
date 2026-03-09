import nodemailer from "nodemailer";

// Gmail transporter — dùng App Password (không phải mật khẩu Gmail thông thường)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password 16 ký tự từ Google Account
  },
});

/**
 * Gửi email reset password
 * @param {string} to       - Địa chỉ email người nhận
 * @param {string} resetUrl - Link reset password đầy đủ (có token)
 */
export const sendPasswordResetEmail = async (to, resetUrl) => {
  const mailOptions = {
    from: `"Task Manager" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset Your Password - Task Manager",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 0;">
          <tr>
            <td align="center">
              <!-- Main Container -->
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                       Password Reset
                    </h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 20px; font-weight: 600;">
                      Hello there! 
                    </h2>
                    <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                      We received a request to reset your password for your <strong>Task Manager</strong> account. 
                      Click the button below to create a new password:
                    </p>

                    <!-- Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" 
                             style="display: inline-block; 
                                    padding: 16px 40px; 
                                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                    color: #ffffff; 
                                    text-decoration: none; 
                                    border-radius: 8px; 
                                    font-weight: 600; 
                                    font-size: 16px;
                                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                                    transition: all 0.3s ease;">
                            Reset My Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; margin: 24px 0;">
                      <tr>
                        <td style="padding: 16px 20px;">
                          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                             <strong>Important:</strong> This link will expire in <strong>15 minutes</strong> for security reasons.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 24px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                      If you didn't request this password reset, please ignore this email or 
                      <a href="mailto:${process.env.EMAIL_USER}" style="color: #667eea; text-decoration: none;">contact support</a> 
                      if you have concerns.
                    </p>

                    <!-- Alternative Link -->
                    <p style="margin: 24px 0 0 0; padding: 16px; background-color: #f7fafc; border-radius: 6px; color: #718096; font-size: 12px; line-height: 1.5; word-break: break-all;">
                      <strong>Button not working?</strong> Copy and paste this link into your browser:<br/>
                      <a href="${resetUrl}" style="color: #667eea; text-decoration: none;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px 0; color: #a0aec0; font-size: 12px;">
                      Task Manager &copy; ${new Date().getFullYear()} • All rights reserved
                    </p>
                    <p style="margin: 0; color: #cbd5e0; font-size: 11px;">
                      This is an automated email, please do not reply.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};
