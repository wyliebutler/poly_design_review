import { Resend } from 'resend';
import { NewRevisionEmail, NewCommentEmail } from '@/emails/templates';

// We wrap initialization in a try/catch or conditional to avoid breaking 
// if the user hasn't set the API key yet.
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// The "from" email address when sending emails. Must be a verified domain in Resend.
// For testing without a verified domain, Resend provides 'onboarding@resend.dev'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export async function sendNewRevisionEmail({
  to,
  projectName,
  projectUrl,
  unsubscribeUrl,
}: {
  to: string | string[]; // Can be an array of emails
  projectName: string;
  projectUrl: string;
  unsubscribeUrl?: string; // If specific to a user
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping sending NewRevisionEmail to:", to);
    return;
  }
  
  // Resend fails if 'to' is an empty array
  if (Array.isArray(to) && to.length === 0) return;

  try {
    const { data, error } = await resend.emails.send({
      from: `Design Portal <${FROM_EMAIL}>`,
      to,
      subject: `New Revision Uploaded: ${projectName}`,
      react: NewRevisionEmail({ projectName, projectUrl, unsubscribeUrl }),
    });
    
    if (error) {
      console.error("[RESEND ERROR] Failed to send revision email:", error);
    } else {
      console.log("[RESEND SUCCESS] Revision email sent to:", to, data);
    }
    
    return { success: !error, data, error };
  } catch (error) {
    console.error("Error sending revision email:", error);
    return { success: false, error };
  }
}

export async function sendNewCommentEmail({
  to,
  projectName,
  authorName,
  commentContent,
  projectUrl,
  unsubscribeUrl,
}: {
  to: string | string[];
  projectName: string;
  authorName: string;
  commentContent: string;
  projectUrl: string;
  unsubscribeUrl?: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping sending NewCommentEmail to:", to);
    return;
  }
  
  if (Array.isArray(to) && to.length === 0) return;

  try {
    const { data, error } = await resend.emails.send({
      from: `Design Portal <${FROM_EMAIL}>`,
      to,
      subject: `New Comment on ${projectName}`,
      react: NewCommentEmail({
        projectName,
        authorName,
        commentContent,
        projectUrl,
        unsubscribeUrl,
      }),
    });
    
    if (error) {
      console.error("[RESEND ERROR] Failed to send comment email:", error);
    } else {
      console.log("[RESEND SUCCESS] Comment email sent to:", to, data);
    }
    
    return { success: !error, data, error };
  } catch (error) {
    console.error("Error sending comment email:", error);
    return { success: false, error };
  }
}
