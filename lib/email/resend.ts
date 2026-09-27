import "server-only";

import { Resend } from 'resend';
import {
  buildBookingConfirmationEmail,
  buildContactNotificationEmail,
  buildGenericNotificationEmail,
  buildPasswordResetEmail,
  buildWelcomeEmail,
} from "@/lib/email/templates";

/**
 * Resend email service for Fight Zone
 *
 * This service provides a production-ready email integration using Resend API.
 * All email operations are server-side only to protect API keys and ensure security.
 *
 * Rendering lives in pure builders (`lib/email/templates.ts`) on the shared
 * branded layout (`lib/email/layout.ts`); these senders only transmit.
 */

/**
 * Validates that the Resend API key is configured
 * Throws an error if the API key is missing or invalid
 */
function validateResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_xxxxxxxxx') {
    throw new Error('RESEND_API_KEY is not configured. Please set a valid API key in your environment variables.');
  }
  if (!apiKey.startsWith('re_')) {
    throw new Error('RESEND_API_KEY appears to be invalid. It should start with "re_".');
  }
}

// Initialize Resend with API key from environment variables
// This runs server-side only due to the 'server-only' import in files that use this
let resendInstance: Resend | null = null;

function getResendClient(): Resend {
  if (!resendInstance) {
    validateResendConfig();
    resendInstance = new Resend(process.env.RESEND_API_KEY!);
  }
  return resendInstance;
}

/**
 * Email configuration
 */
const EMAIL_CONFIG = {
  // Default sender - should be configured in Resend dashboard
  from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
  // Default reply-to for customer responses
  replyTo: process.env.RESEND_REPLY_TO_EMAIL || 'contact@fightzone.example.com',
} as const;

async function transmit(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  label: string;
}) {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      console.error(`Failed to send ${params.label} email:`, error);
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error(`Error sending ${params.label} email:`, error);
    throw error;
  }
}

/**
 * Send a welcome email to a new member
 */
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
}) {
  const payload = buildWelcomeEmail({ name: params.name });
  return transmit({
    from: EMAIL_CONFIG.from,
    to: params.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    label: 'welcome',
  });
}

/**
 * Send a booking confirmation email
 */
export async function sendBookingConfirmationEmail(params: {
  to: string;
  name: string;
  sessionTitle: string;
  scheduledAt: string;
}) {
  const payload = buildBookingConfirmationEmail({
    name: params.name,
    sessionTitle: params.sessionTitle,
    scheduledAt: params.scheduledAt,
  });
  return transmit({
    from: EMAIL_CONFIG.from,
    to: params.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    label: 'booking confirmation',
  });
}

/**
 * Send a contact form submission notification
 */
export async function sendContactNotification(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const payload = buildContactNotificationEmail({
    name: params.name,
    email: params.email,
    subject: params.subject,
    message: params.message,
  });
  return transmit({
    from: EMAIL_CONFIG.from,
    to: EMAIL_CONFIG.replyTo,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    label: 'contact notification',
  });
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  resetLink: string;
}) {
  const payload = buildPasswordResetEmail({ resetLink: params.resetLink });
  return transmit({
    from: EMAIL_CONFIG.from,
    to: params.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    label: 'password reset',
  });
}

/**
 * Send a notification email
 */
export async function sendNotificationEmail(params: {
  to: string;
  subject: string;
  content: string;
}) {
  const payload = buildGenericNotificationEmail({
    subject: params.subject,
    content: params.content,
  });
  return transmit({
    from: EMAIL_CONFIG.from,
    to: params.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    label: 'notification',
  });
}
