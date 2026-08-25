# Resend Email Integration

## Overview

Fight Zone uses Resend for email services, providing a production-ready email integration for:
- Welcome emails for new users
- Password reset emails
- Contact form notifications
- Booking confirmations
- General notifications

## Security Features

- **Server-only execution**: All email operations run server-side to protect API keys
- **API key validation**: Validates API key format and presence before initialization
- **Environment variable isolation**: API keys are stored in environment variables, never in code
- **Error handling**: Graceful degradation - email failures don't break core functionality
- **No client-side exposure**: Resend client is only instantiated in server components

## Configuration

### Required Environment Variables

```bash
# Resend API Key (required)
RESEND_API_KEY=re_123456789_placeholder

# Optional: Custom sender email (defaults to onboarding@resend.dev)
RESEND_FROM_EMAIL=noreply@fightzone.example.com

# Optional: Custom reply-to email (defaults to contact@fightzone.example.com)
RESEND_REPLY_TO_EMAIL=contact@fightzone.example.com
```

### Setting Up Your Resend Account

1. Create a Resend account at https://resend.com
2. Verify your domain and configure sender email addresses
3. Get your API key from the Resend dashboard
4. Add the API key to your `.env.local` file

## Usage

### Sending a Welcome Email

```typescript
import { sendWelcomeEmail } from "@/lib/email/resend";

await sendWelcomeEmail({
  to: "user@example.com",
  name: "John Doe",
});
```

### Sending a Password Reset Email

```typescript
import { sendPasswordResetEmail } from "@/lib/email/resend";

await sendPasswordResetEmail({
  to: "user@example.com",
  resetLink: "https://fightzone.com/reset-password",
});
```

### Sending a Contact Notification

```typescript
import { sendContactNotification } from "@/lib/email/resend";

await sendContactNotification({
  name: "John Doe",
  email: "john@example.com",
  subject: "Training Inquiry",
  message: "I'm interested in personal training sessions.",
});
```

### Sending a Booking Confirmation

```typescript
import { sendBookingConfirmationEmail } from "@/lib/email/resend";

await sendBookingConfirmationEmail({
  to: "user@example.com",
  name: "John Doe",
  sessionTitle: "Personal Training Session",
  scheduledAt: "2026-08-25T10:00:00Z",
});
```

### Sending a Custom Notification

```typescript
import { sendNotificationEmail } from "@/lib/email/resend";

await sendNotificationEmail({
  to: "user@example.com",
  subject: "Upcoming Event Reminder",
  content: "Your boxing class starts in 2 hours.",
});
```

## Integration Points

The Resend integration is currently integrated into:

1. **User Registration** (`lib/actions/auth.ts`):
   - Sends welcome email when users sign up

2. **Password Reset** (`lib/actions/auth.ts`):
   - Sends password reset email when users request password reset

3. **Contact Form** (`lib/actions/contact.ts`):
   - Sends notification to admin when contact form is submitted

## Error Handling

All email functions:
- Log errors to the application error system
- Throw errors that can be caught by calling code
- Allow core functionality to continue even if email fails
- Provide meaningful error messages for debugging

Example error handling:

```typescript
try {
  await sendWelcomeEmail({ to: email, name: name });
} catch (error) {
  // Log error but don't fail the registration
  logError("Failed to send welcome email", error);
}
```

## Email Templates

All email templates use:
- Fight Zone branding (dark arena color scheme)
- Professional typography
- Responsive design
- Clear call-to-action buttons
- Brand signature: "Train. Fight. Win."

## Security Best Practices

1. **Never expose API keys**: API keys are only accessed server-side
2. **Validate input**: All email functions validate required parameters
3. **Rate limiting**: Resend provides built-in rate limiting
4. **No sensitive data in emails**: Emails don't contain passwords or sensitive tokens
5. **Error message safety**: User-facing errors don't expose technical details

## Testing

To test email functionality in development:

1. Ensure your `.env.local` has a valid Resend API key
2. The Resend API will send real emails during development
3. Check your email inbox for test deliveries
4. Monitor console logs for any email errors

## Production Considerations

1. **Domain verification**: Verify your sending domain in Resend dashboard
2. **DKIM/SPF records**: Configure DNS records for better deliverability
3. **Monitoring**: Monitor email delivery rates and bounce rates
4. **Unsubscribe mechanism**: Consider adding unsubscribe links for marketing emails
5. **Rate limits**: Be aware of Resend's rate limits and implement queueing if needed

## Troubleshooting

### Common Issues

1. **"RESEND_API_KEY is not configured"**
   - Ensure the environment variable is set in `.env.local`
   - Restart the development server after adding the variable

2. **"Email delivery failed"**
   - Check that your API key is valid
   - Verify your domain is configured in Resend dashboard
   - Check recipient email address is valid

3. **Build errors**
   - Ensure `resend` package is installed: `npm install resend`
   - Check that imports are correct: `import { Resend } from 'resend'`

## License

This email integration is part of the Fight Zone project and follows the same license terms.