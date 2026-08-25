import "server-only";

import { Resend } from 'resend';

/**
 * Resend email service for Fight Zone
 * 
 * This service provides a production-ready email integration using Resend API.
 * All email operations are server-side only to protect API keys and ensure security.
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

/**
 * Send a welcome email to a new member
 */
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
}) {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: params.to,
      subject: 'Welcome to Fight Zone!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #e11d48; text-transform: uppercase; font-weight: bold;">Welcome to Fight Zone</h1>
          <p>Hi ${params.name},</p>
          <p>Welcome to the Fight Zone community! We're excited to have you start your training journey with us.</p>
          <p>Your account has been successfully created. You can now:</p>
          <ul>
            <li>Book training sessions</li>
            <li>Register for events</li>
            <li>Track your progress</li>
            <li>Connect with our coaching team</li>
          </ul>
          <p>If you have any questions, feel free to reach out to our team.</p>
          <p style="margin-top: 30px; color: #666;">Train. Fight. Win.</p>
          <p>— The Fight Zone Team</p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
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
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: params.to,
      subject: 'Booking Confirmed - Fight Zone',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #e11d48; text-transform: uppercase; font-weight: bold;">Booking Confirmed</h1>
          <p>Hi ${params.name},</p>
          <p>Your booking has been confirmed! Here are the details:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Session:</strong> ${params.sessionTitle}</p>
            <p><strong>Date & Time:</strong> ${new Date(params.scheduledAt).toLocaleString()}</p>
          </div>
          <p>Please arrive 10 minutes early for your session. If you need to cancel or reschedule, please contact us at least 24 hours in advance.</p>
          <p style="margin-top: 30px; color: #666;">Train. Fight. Win.</p>
          <p>— The Fight Zone Team</p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send booking confirmation email:', error);
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    throw error;
  }
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
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: EMAIL_CONFIG.replyTo,
      subject: `New Contact Form Submission: ${params.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #e11d48; text-transform: uppercase; font-weight: bold;">New Contact Form Submission</h1>
          <p>You have received a new message through the Fight Zone contact form.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Name:</strong> ${params.name}</p>
            <p><strong>Email:</strong> ${params.email}</p>
            <p><strong>Subject:</strong> ${params.subject}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap; background: white; padding: 10px; border-radius: 3px;">${params.message}</p>
          </div>
          <p>Please respond to this inquiry at your earliest convenience.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send contact notification:', error);
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending contact notification:', error);
    throw error;
  }
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  resetLink: string;
}) {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: params.to,
      subject: 'Reset Your Password - Fight Zone',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #e11d48; text-transform: uppercase; font-weight: bold;">Reset Your Password</h1>
          <p>We received a request to reset your password for your Fight Zone account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="margin: 30px 0;">
            <a href="${params.resetLink}" 
               style="background: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour for security purposes.</p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
          <p style="margin-top: 30px; color: #666;">Train. Fight. Win.</p>
          <p>— The Fight Zone Team</p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

/**
 * Send a notification email
 */
export async function sendNotificationEmail(params: {
  to: string;
  subject: string;
  content: string;
}) {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: params.to,
      subject: params.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #e11d48; text-transform: uppercase; font-weight: bold;">${params.subject}</h1>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="white-space: pre-wrap;">${params.content}</p>
          </div>
          <p style="margin-top: 30px; color: #666;">Train. Fight. Win.</p>
          <p>— The Fight Zone Team</p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send notification email:', error);
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending notification email:', error);
    throw error;
  }
}