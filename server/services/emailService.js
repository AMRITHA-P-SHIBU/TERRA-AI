/**
 * Email Service for Terra AI
 * Supports transactional emails for email verification, password reset,
 * organization approvals, rejections, and member invitations.
 */

export async function sendEmail({ to, subject, html, text }) {
  // If SMTP is not configured or in development mode, log formatted preview to console
  const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

  if (!smtpConfigured) {
    console.log('\n================== [TERRA AI EMAIL DISPATCH] ==================');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('-----------------------------------------------------------------');
    console.log(text || html);
    console.log('=================================================================\n');
    return { success: true, simulated: true };
  }

  // If SMTP credentials exist, you can use nodemailer here
  try {
    // Dynamic import to avoid hard dependency if not installed
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Terra AI" <no-reply@terra.eco>',
      to,
      subject,
      text,
      html,
    });
    return { success: true, simulated: false };
  } catch (err) {
    console.error('[EmailService Error]:', err.message);
    return { success: false, error: err.message };
  }
}

export async function sendVerificationEmail(email, token, fullName) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const verifyUrl = `${clientUrl}/verify-email?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: '🌱 Verify Your Terra AI Account',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #047857;">Welcome to Terra AI, ${fullName}!</h2>
        <p>Thank you for joining our mission for sustainable environmental management.</p>
        <p>Please click the button below to verify your email address:</p>
        <div style="margin: 32px 0;">
          <a href="${verifyUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p style="color: #64748b; font-size: 13px;">Or copy and paste this link in your browser: ${verifyUrl}</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">This link will expire in 24 hours.</p>
      </div>
    `,
    text: `Welcome to Terra AI, ${fullName}!\n\nPlease verify your email by clicking: ${verifyUrl}\n\nThis link will expire in 24 hours.`,
  });
}

export async function sendPasswordResetEmail(email, token) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password?token=${token}`;

  return sendEmail({
    to: email,
    subject: '🔒 Reset Your Terra AI Password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">Password Reset Request</h2>
        <p>We received a request to reset the password for your Terra AI account.</p>
        <p>Click the link below to choose a new secure password:</p>
        <div style="margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 13px;">Or link: ${resetUrl}</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
    text: `Reset your Terra AI password:\n\n${resetUrl}\n\nExpires in 1 hour.`,
  });
}

export async function sendOrgDecisionEmail(email, orgName, decision, reason = '') {
  const isApproved = decision === 'APPROVED';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const loginUrl = `${clientUrl}/login`;

  const subject = isApproved
    ? `🎉 Your Organization "${orgName}" has been APPROVED on Terra AI`
    : `⚠️ Update regarding your Organization registration for "${orgName}"`;

  const html = isApproved
    ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #047857;">Congratulations! Organization Approved</h2>
        <p>Your organization <strong>${orgName}</strong> has been officially approved by the Terra AI Admin Team.</p>
        <p>Your account is now activated. You can access the Organization Admin Dashboard to manage your team and collaborative initiatives.</p>
        <div style="margin: 32px 0;">
          <a href="${loginUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Org Dashboard</a>
        </div>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #b91c1c;">Organization Application Status</h2>
        <p>Thank you for submitting your organization <strong>${orgName}</strong> for registration on Terra AI.</p>
        <p>After review, the registration was not approved at this time.</p>
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0;">
          <strong>Reason:</strong> ${reason || 'Incomplete documentation or verification criteria not met.'}
        </div>
        <p>You may log in to review the feedback and resubmit your documents.</p>
        <div style="margin: 32px 0;">
          <a href="${loginUrl}" style="background-color: #334155; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Status & Resubmit</a>
        </div>
      </div>
    `;

  return sendEmail({
    to: email,
    subject,
    html,
    text: isApproved
      ? `Your organization ${orgName} has been approved! Login at ${loginUrl}`
      : `Your organization ${orgName} was not approved. Reason: ${reason}. Check details at ${loginUrl}`,
  });
}

export async function sendMemberInvitationEmail(email, orgName, inviterName, inviteToken) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const joinUrl = `${clientUrl}/join-organization?token=${inviteToken}`;

  return sendEmail({
    to: email,
    subject: `🌿 Invitation to join "${orgName}" on Terra AI`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #047857;">You're Invited!</h2>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Terra AI.</p>
        <p>Collaborate with your organization on sustainability actions, GreenFeed initiatives, and track group impact.</p>
        <div style="margin: 32px 0;">
          <a href="${joinUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
        </div>
        <p style="color: #64748b; font-size: 13px;">Link: ${joinUrl}</p>
      </div>
    `,
    text: `You have been invited by ${inviterName} to join ${orgName} on Terra AI. Join here: ${joinUrl}`,
  });
}

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrgDecisionEmail,
  sendMemberInvitationEmail,
};
