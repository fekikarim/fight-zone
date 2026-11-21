# FIGHT ZONE V1
# Complete Design & UX Redesign Specification

**Project:** Fight Zone  
**Version:** V1 — Full Design Enhancement  
**Document Type:** UI/UX & Frontend Engineering Specification  
**Objective:** Complete platform-wide redesign and experience enhancement  
**Scope:** Public Portal · Member Portal · Admin Portal  
**Priority:** Production Quality  
**Status:** Ready for Implementation

---

# 1. PROJECT VISION

## 1.1 Mission

Fight Zone V1 is already implemented and functionally complete. The next objective is to transform the entire platform into a visually exceptional, modern, engaging, and professionally engineered sports experience.

This is not a simple styling update.

This is a comprehensive redesign of the complete Fight Zone ecosystem, covering every important page, component, interaction, responsive layout, animation, and user journey.

The redesigned platform must communicate:

- Athletic energy.
- Discipline and determination.
- Competition and achievement.
- Community and belonging.
- Professionalism and trust.
- A strong, recognizable sports identity.

Every visitor should immediately understand the personality of Fight Zone and feel encouraged to explore the platform.

Members should enjoy returning to their personal space.

The administrator should benefit from an efficient, intuitive, and professional management interface.

## 1.2 Three Different Experiences, One Brand

Fight Zone must become one recognizable brand with three carefully designed experiences.

| Experience | Primary objective | Design personality |
|---|---|---|
| Public Portal | Attract, inform, convert visitors into members | Expressive, energetic, editorial |
| Member Portal | Engage members and simplify daily activities | Personal, motivating, interactive |
| Admin Portal | Manage the entire platform efficiently | Professional, structured, operational |

The three experiences must share the same visual identity while respecting their different purposes.

## 1.3 Main Design Objective

Deliver an experience that feels like a professionally designed sports platform rather than a generic SaaS dashboard or a standard template.

The result must be:

- Visually memorable.
- Consistent across all pages.
- Fully responsive.
- Smooth and interactive.
- Accessible.
- Fast.
- Maintainable.
- Production-ready.

---

# 2. CRITICAL ENGINEERING RULES

These requirements are mandatory.

## 2.1 Preserve the Existing V1

The current V1 is already implemented. The redesign must improve its presentation without unnecessarily rebuilding its functional foundations.

Before changing anything:

1. Inspect the repository structure.
2. Understand the existing architecture.
3. Identify every route and layout.
4. Inspect existing components and styling conventions.
5. Understand authentication and authorization.
6. Inspect database schemas and migrations.
7. Understand existing Supabase integrations.
8. Identify all existing workflows.
9. Review the current responsive behavior.
10. Identify existing technical debt and visual inconsistencies.

Do not begin by replacing the existing architecture.

Do not remove features simply because they are difficult to redesign.

Do not introduce a new technology without a clear technical justification.

## 2.2 Preserve Backend Functionality

The following must remain functional:

- Supabase authentication.
- User sessions.
- Role-based authorization.
- Database relationships.
- Row Level Security policies.
- Database triggers.
- PostgreSQL functions and RPCs.
- Storage permissions.
- Event registration.
- Membership management.
- Manual payment verification.
- Member profiles.
- Messaging.
- Notifications.
- CMS functionality.
- Achievements and rewards.
- Existing administrative operations.

Never replace real data with hardcoded demonstrations.

Never introduce fake statistics.

Never bypass existing backend validation.

Never expose sensitive information through frontend components.

## 2.3 Preserve Security

The visual redesign must not weaken the security of the platform.

In particular:

- Never trust a user role supplied by the client.
- Never trust a client-provided user ID for authorization.
- Never allow members to access administrator operations.
- Never expose private payment evidence publicly.
- Never bypass RLS.
- Never move privileged service credentials into client-side code.
- Never make administrative actions available through visual controls alone.
- Continue validating important operations server-side.

All existing authorization rules must be respected.

## 2.4 Real Functionality Only

Every interactive component must have a meaningful implementation.

Examples:

- Buttons must perform their advertised actions.
- Search fields must actually search.
- Filters must modify displayed results.
- Tabs must switch content.
- Dropdowns must work.
- Notifications must open the appropriate destination.
- Forms must validate and submit.
- Modals must support closing and keyboard interaction.
- Pagination must work.
- Calendar controls must change the displayed period.

Do not create decorative buttons that do nothing.

If an existing feature is unavailable or intentionally incomplete, communicate that state clearly instead of pretending it works.

## 2.5 Avoid Unnecessary Rewrites

Prefer improving existing components and introducing reusable foundations.

Do not:

- Replace the entire application unnecessarily.
- Duplicate existing business logic.
- Create competing design systems.
- Introduce unnecessary dependencies.
- Change database structures for purely visual requirements.
- Rewrite stable backend functionality without a demonstrated need.

---

# 3. INITIAL REPOSITORY AUDIT

Before implementation, perform a complete audit.

## 3.1 Repository Exploration

Inspect:

- Package configuration.
- Next.js application structure.
- Existing routes.
- Layouts.
- Components.
- CSS and Tailwind configuration.
- Design tokens.
- Fonts.
- Icons.
- Image assets.
- Supabase clients.
- Authentication helpers.
- Server actions.
- API routes.
- Database migrations.
- Storage configuration.
- Existing tests.
- Documentation.

Identify the actual application structure instead of assuming route names.

## 3.2 Page Inventory

Build a complete inventory of:

### Public Portal

- Homepage.
- Sports or disciplines section.
- Events listing.
- Event details.
- News listing.
- News details.
- About.
- Contact.
- FAQ.
- Legal pages.
- Authentication pages.
- Registration pages.

### Member Portal

- Member dashboard.
- Events.
- Event details.
- Registrations.
- Membership information.
- Payment-related screens.
- Member profile.
- Achievements.
- Rewards.
- Messages.
- Notifications.
- Account settings.

### Admin Portal

- Administrative dashboard.
- Analytics.
- Calendar.
- Event management.
- Event creation and editing.
- Member management.
- Membership management.
- Payment verification.
- CMS.
- News management.
- About-page management, if supported.
- Messaging.
- Notifications.
- Administrative settings.

This list is an audit checklist, not permission to invent missing features.

If the existing V1 does not contain a listed feature, document that fact and do not fabricate its backend functionality.

## 3.3 Existing User Journey Audit

Test the complete user journeys.

### Visitor Journey

1. Open the homepage.
2. Explore the platform.
3. Discover sports and activities.
4. Browse upcoming events.
5. Open an event.
6. Read platform information.
7. Register or sign in.

### Member Journey

1. Authenticate.
2. Access the member dashboard.
3. Review personal information.
4. Explore available events.
5. Register for an event.
6. Review membership information.
7. Submit payment evidence when applicable.
8. Review notifications.
9. Use messaging.
10. Review achievements.

### Administrator Journey

1. Authenticate as administrator.
2. Access the admin dashboard.
3. Review operational information.
4. Manage events.
5. Manage members.
6. Review payment submissions.
7. Publish or update content.
8. Communicate with members.
9. Review notifications and administrative activity.

## 3.4 Audit Deliverable

Create:

`docs/design-redesign-audit.md`

Include:

- Existing route inventory.
- Existing component inventory.
- Current architecture summary.
- Existing visual inconsistencies.
- Existing functional issues.
- Responsive problems.
- Accessibility issues.
- Performance concerns.
- Missing features.
- Proposed implementation sequence.

Do not proceed blindly without understanding the existing platform.

---

# 4. DESIGN DIRECTION

## 4.1 Overall Visual Identity

Establish an original visual language inspired by modern sports brands, premium athletic experiences, competitive environments, and contemporary editorial design.

The platform should feel energetic without becoming visually aggressive.

It should feel premium without becoming unnecessarily complicated.

The design must work for different sports and activities, not only combat sports or bodybuilding.

## 4.2 Visual Principles

Apply these principles consistently:

1. Strong visual hierarchy.
2. Clear typography.
3. High-quality photography.
4. Purposeful whitespace.
5. Consistent spacing.
6. Carefully composed layouts.
7. Strong contrast.
8. Meaningful visual emphasis.
9. Smooth interactions.
10. Consistent component behavior.

## 4.3 Avoid Generic Design

Do not blindly reproduce common AI-generated SaaS interfaces.

Avoid:

- Excessive glassmorphism.
- Unnecessary neon colors.
- Large quantities of gradients.
- Excessive glow effects.
- Repetitive rounded cards.
- Oversized empty dashboards.
- Random floating decorative shapes.
- Excessive animation.
- Generic hero sections.
- Unnecessary visual noise.
- Inconsistent icon styles.
- Excessive use of identical card layouts.

A premium design does not require every element to have a shadow, border, gradient, or rounded container.

Use composition, typography, imagery, spacing, and contrast to create visual quality.

## 4.4 Creative Freedom

Explore original concepts.

Consider:

- Sports editorial layouts.
- Asymmetric compositions.
- Full-width photographic sections.
- Dynamic event presentations.
- Strong typography.
- Sport-specific visual identities.
- Structured information layouts.
- Interactive activity sections.
- High-quality transitions.
- Sophisticated dark and light surfaces where appropriate.

The existing Fight Zone identity and brand assets must be inspected before deciding which visual elements to preserve.

Do not discard recognizable brand elements without justification.

---

# 5. GLOBAL DESIGN SYSTEM

Create a unified design system before implementing page-specific styling.

The design system must be reusable across all three portals.

## 5.1 Design Tokens

Establish tokens for:

### Colors

Define:

- Primary brand color.
- Secondary brand color.
- Accent color.
- Main background.
- Secondary background.
- Surface.
- Elevated surface.
- Primary text.
- Secondary text.
- Muted text.
- Borders.
- Success.
- Warning.
- Error.
- Information.
- Disabled states.

Colors must have sufficient contrast.

Use semantic tokens rather than scattering raw color values throughout components.

### Typography

Define a consistent typographic hierarchy:

- Display.
- Heading 1.
- Heading 2.
- Heading 3.
- Heading 4.
- Body large.
- Body regular.
- Body small.
- Caption.
- Overline.
- Button labels.

Choose typography that communicates athletic confidence and professionalism while remaining highly readable.

Use responsive typography where appropriate.

Avoid excessive font sizes and inconsistent font weights.

### Spacing

Establish a predictable spacing scale.

Apply it consistently to:

- Page sections.
- Containers.
- Cards.
- Forms.
- Navigation.
- Tables.
- Dialogs.
- Dashboard layouts.

### Layout

Define:

- Maximum content widths.
- Standard page gutters.
- Responsive grid systems.
- Sidebar widths.
- Header heights.
- Content spacing.
- Mobile navigation behavior.

### Radius

Use a deliberate radius system.

Do not apply extremely rounded corners to every component.

### Shadows and Borders

Create a restrained elevation system.

Use shadows only when they communicate hierarchy or separation.

### Motion Tokens

Define:

- Fast transitions.
- Standard transitions.
- Slow transitions.
- Entrance animations.
- Hover interactions.
- Modal transitions.
- Page transitions.
- Scroll-triggered animations.

## 5.2 Component Library

Build or refine reusable components.

### Global Components

- Button.
- IconButton.
- Input.
- Textarea.
- Select.
- Checkbox.
- Radio.
- Switch.
- Badge.
- Avatar.
- Tooltip.
- Dropdown.
- Modal.
- Dialog.
- Drawer.
- Tabs.
- Accordion.
- Toast.
- Alert.
- Skeleton.
- EmptyState.
- ErrorState.
- LoadingState.
- Pagination.
- Breadcrumb.
- SearchBar.

### Sports Components

- SportCard.
- EventCard.
- EventStatus.
- EventDate.
- EventCategory.
- MemberAvatar.
- AchievementBadge.
- ProgressIndicator.
- ActivityTimeline.
- MembershipStatus.

### Administrative Components

- MetricCard.
- DataTable.
- FilterBar.
- SearchToolbar.
- Calendar.
- StatusBadge.
- ConfirmationDialog.
- PaymentEvidencePreview.
- AdminPageHeader.

Components must have consistent variants, sizes, states, and responsive behavior.

## 5.3 Component Quality

Each reusable component must support:

- Default state.
- Hover state.
- Focus state.
- Active state.
- Disabled state.
- Loading state when applicable.
- Error state when applicable.

Avoid creating one-off components when an existing reusable component can be extended cleanly.

---

# 6. MOTION AND INTERACTION SYSTEM

Animations are an important part of the redesign.

However, motion must improve the experience rather than distract from it.

## 6.1 Objectives

Introduce:

- Smooth page transitions where appropriate.
- Scroll-triggered reveals.
- Subtle entrance animations.
- Hover feedback.
- Interactive card states.
- Button feedback.
- Navigation transitions.
- Modal animations.
- Number transitions where meaningful.
- Image reveal effects.
- Section transitions.

## 6.2 Scroll Animations

Use scroll-triggered animations for important content sections.

Examples:

- Hero content entrance.
- Sports section reveal.
- Event card stagger.
- Editorial content reveal.
- Statistics appearance.
- Image transitions.
- CTA section entrance.

Animations should be subtle, controlled, and consistent.

Do not animate every element independently.

Do not make users wait for important information to become visible.

## 6.3 Animation Technology

Inspect the existing project first.

Possible implementation approaches:

- CSS transitions.
- CSS keyframes.
- Intersection Observer.
- Framer Motion or another suitable animation library when justified.

Choose the smallest reliable solution that supports the required experience.

Do not introduce multiple animation libraries without a clear reason.

## 6.4 Performance

Animations must:

- Prefer transform and opacity.
- Avoid unnecessary layout recalculation.
- Avoid expensive continuous scroll listeners.
- Avoid excessive blur filters.
- Avoid excessive particle effects.
- Avoid unnecessary GPU-intensive effects.
- Remain smooth on mobile devices.

## 6.5 Accessibility

Respect:

`prefers-reduced-motion`

Provide appropriate reduced-motion alternatives.

Essential content and functionality must never depend on an animation.

---

# 7. PUBLIC PORTAL REDESIGN

The public portal is the first impression of Fight Zone.

Its purpose is to communicate the brand, attract visitors, present activities, showcase events, and encourage registration.

This section deserves exceptional attention.

## 7.1 Public Navigation

Redesign the navigation experience.

Requirements:

- Clear brand presentation.
- Accessible navigation.
- Responsive desktop layout.
- Mobile navigation.
- Active page indication.
- Clear authentication actions.
- Appropriate sticky behavior.
- Smooth menu interactions.

Do not allow the navigation to consume excessive vertical space.

On mobile, ensure the menu is easy to open, navigate, and close.

## 7.2 Homepage

The homepage must be a complete brand experience.

### Section 1 — Hero

Create a memorable opening section.

Requirements:

- Strong headline.
- Supporting description.
- Clear CTA.
- Secondary CTA where appropriate.
- High-quality sports imagery or video.
- Strong visual composition.
- Responsive text and image placement.
- Carefully implemented motion.

The hero should immediately answer:

- What is Fight Zone?
- What makes it interesting?
- What can visitors do next?

Avoid generic marketing headlines.

Use authentic brand messaging.

### Section 2 — Brand Introduction

Introduce the Fight Zone concept.

Explain the platform's identity, activities, and community.

Use an engaging layout rather than a large block of text.

### Section 3 — Sports and Disciplines

Present available sports or disciplines.

Requirements:

- Strong imagery.
- Clear titles.
- Short descriptions.
- Consistent presentation.
- Responsive layouts.
- Links to relevant information where supported.

Do not invent sports that do not exist in the platform.

### Section 4 — Upcoming Events

Show real upcoming events.

Each event presentation should include available information such as:

- Event title.
- Date.
- Location.
- Category.
- Relevant image.
- Registration status.
- CTA.

Use actual backend data.

Handle empty states properly.

### Section 5 — Why Fight Zone

Present the real advantages of the platform.

Use meaningful content and strong visual hierarchy.

Avoid unsupported claims.

### Section 6 — Community and Experience

Showcase the community and real experiences where suitable content is available.

Do not generate fake testimonials, fake member counts, or fabricated achievements.

### Section 7 — News and Updates

Present recent published content.

Use an editorial layout with clear titles, images, publication dates, and navigation.

### Section 8 — Final CTA

End with a visually strong registration or discovery section.

### Section 9 — Footer

Include relevant:

- Brand identity.
- Navigation links.
- Contact information.
- Social links when available.
- Legal links.
- Copyright information.

Ensure the footer is complete and responsive.

## 7.3 Events Listing

Redesign the complete events browsing experience.

Requirements:

- Clear page introduction.
- Search if supported.
- Category filters if supported.
- Date filters if supported.
- Event cards.
- Event status.
- Pagination or loading behavior where applicable.
- Empty state.
- Error state.
- Responsive layout.

Users should be able to understand which events are available and what action they can take.

## 7.4 Event Details

Create a strong event detail experience.

Present available information clearly:

- Event name.
- Main visual.
- Date and time.
- Location.
- Description.
- Category.
- Capacity if supported.
- Registration status.
- Relevant instructions.
- Registration CTA.

Make the primary action visually clear.

Do not expose private administrative information.

## 7.5 News and Editorial Pages

Create an editorial experience that makes news enjoyable to explore.

### News Listing

- Strong introductory heading.
- Featured article where appropriate.
- News grid or editorial layout.
- Publication dates.
- Category labels where supported.
- Responsive imagery.
- Pagination where appropriate.

### News Details

- Article title.
- Featured image.
- Publication date.
- Article content.
- Appropriate typography.
- Related articles where supported.
- Back navigation.

Prioritize reading comfort.

## 7.6 About Page

Create a visually engaging presentation of Fight Zone.

Use the content actually managed by the platform.

If the existing CMS supports dynamic About content, preserve that integration.

Do not hardcode content that administrators are expected to manage.

## 7.7 Contact Page

Requirements:

- Clear contact information.
- Functional contact form if already supported.
- Validation.
- Loading state.
- Success feedback.
- Error feedback.
- Responsive layout.

## 7.8 FAQ

Use a clear accordion experience.

Requirements:

- Keyboard accessible.
- Clear expanded state.
- Readable typography.
- Responsive spacing.

Preserve existing FAQ content and data sources.

## 7.9 Legal Pages

Ensure consistent styling for:

- Privacy policy.
- Terms and conditions.
- Other existing legal content.

Prioritize readability and accessible typography.

## 7.10 Authentication Pages

Improve login and registration interfaces.

Requirements:

- Consistent brand identity.
- Clear form hierarchy.
- Appropriate validation.
- Loading feedback.
- Error messages.
- Password visibility control when applicable.
- Accessible labels.
- Responsive layout.

Preserve existing authentication behavior.

---

# 8. MEMBER PORTAL REDESIGN

The member portal must feel like a personal sports and community hub.

It should motivate members to remain active and make common tasks easy.

## 8.1 Member Application Shell

Redesign:

- Navigation.
- Header.
- Sidebar where applicable.
- Mobile navigation.
- Profile menu.
- Notifications.
- Main content layout.

Ensure the navigation adapts intelligently to screen size.

Do not simply shrink the desktop sidebar on mobile.

## 8.2 Member Dashboard

The dashboard should answer:

- What is happening?
- What should I do next?
- What is my current membership status?
- Which events can I join?
- What progress have I made?

Potential sections, only where supported by real data:

### Welcome Area

A personalized greeting and a concise introduction.

### Membership Overview

Display:

- Membership status.
- Relevant membership information.
- Expiration date when available.
- Payment status where appropriate.

Clearly distinguish pending, approved, rejected, expired, and active states when these exist in the backend.

### Upcoming Events

Display relevant upcoming events and registration information.

### Activity Summary

Use real member activity.

### Achievements

Display actual achievements and progress.

### Notifications

Show recent notifications and relevant actions.

### Quick Actions

Provide direct access to frequently used member operations.

Do not overload the dashboard.

Prioritize the most useful information.

## 8.3 Member Events

Redesign the event discovery and registration experience.

Requirements:

- Event listing.
- Event details.
- Registration status.
- Capacity information when supported.
- Registration action.
- Registration confirmation.
- Already-registered state.
- Cancellation state if supported.
- Empty state.
- Loading state.
- Error state.

Avoid duplicate registrations and preserve existing backend rules.

## 8.4 Membership Experience

Present membership information clearly.

Members must be able to understand:

- Current membership status.
- Membership type where applicable.
- Validity period.
- Relevant payment information.
- Pending actions.

Do not display a membership as active before backend confirmation.

## 8.5 Manual Payment Experience

Fight Zone uses a manual payment verification process.

This is an important business rule.

Do not introduce online payment processing or pretend that payment is automatically confirmed.

The interface must clearly explain the existing process.

Where payment evidence submission is supported:

1. Explain what the member must submit.
2. Provide a clear upload interface.
3. Display supported file requirements.
4. Validate file type and size.
5. Show upload progress.
6. Display submission confirmation.
7. Show the current verification status.

Possible statuses, according to existing backend rules:

- Not submitted.
- Pending verification.
- Approved.
- Rejected.

The administrator remains responsible for manual verification.

Never expose uploaded payment evidence through public URLs.

## 8.6 Member Profile

Improve:

- Profile header.
- Personal information.
- Profile image.
- Editable fields.
- Validation.
- Save feedback.
- Account information.
- Mobile layout.

Only expose editable fields that the existing backend permits.

## 8.7 Achievements and Rewards

Create an engaging visual presentation for achievements.

Use:

- Achievement badges.
- Progress indicators.
- Completion states.
- Relevant descriptions.
- Milestones where supported.

Do not invent achievement conditions.

Never calculate authoritative rewards exclusively on the client.

The backend remains the source of truth.

## 8.8 Messaging

Improve the messaging experience.

Requirements:

- Clear conversation list.
- Readable messages.
- Sender identification.
- Message timestamps.
- Appropriate message grouping.
- Responsive layout.
- Empty state.
- Loading state.
- Error feedback.

Preserve existing messaging permissions and privacy.

## 8.9 Notifications

Create a clear notification experience.

Requirements:

- Unread indication.
- Notification categories when supported.
- Relevant timestamps.
- Navigation to related content.
- Read/unread behavior.
- Empty state.

Ensure notifications do not expose information to unauthorized users.

---

# 9. ADMIN PORTAL REDESIGN

The admin portal is an operational command center.

It must prioritize clarity, efficiency, reliability, and control.

The design should be professional and data-oriented without becoming visually boring.

## 9.1 Admin Shell

Redesign:

- Sidebar.
- Header.
- Navigation.
- Breadcrumbs.
- Page titles.
- Profile menu.
- Notifications.
- Mobile navigation.

The administrator must be able to navigate quickly between operational areas.

Avoid unnecessarily complicated navigation.

## 9.2 Admin Dashboard

Create a clear operational overview.

Potential sections:

### Welcome and Overview

A clear introduction to the administrative workspace.

### Key Metrics

Use only actual available backend metrics.

Potential examples:

- Total members.
- Active members.
- Pending payment reviews.
- Upcoming events.
- Event registrations.
- Recent activity.

Never fabricate values.

### Recent Activity

Show actual available administrative or platform activity.

### Pending Actions

Highlight operations requiring attention.

### Event Overview

Present relevant upcoming events.

### Quick Actions

Provide shortcuts to frequently used operations.

Avoid overwhelming the administrator with unnecessary charts.

## 9.3 Analytics

Where analytics functionality already exists:

- Improve chart readability.
- Improve filtering.
- Improve legends.
- Improve responsive behavior.
- Improve data labels.
- Improve empty states.
- Improve loading states.

Charts must represent actual data.

Use meaningful visualizations instead of charts added purely for decoration.

## 9.4 Calendar

Redesign the event calendar.

Requirements:

- Clear date navigation.
- Month/week views where supported.
- Event presentation.
- Current-date indication.
- Event details.
- Responsive behavior.
- Useful mobile alternative.

Preserve existing event data and operations.

## 9.5 Event Management

Improve the complete event management workflow.

### Events Overview

- Search.
- Filters.
- Sorting.
- Status indicators.
- Event dates.
- Relevant actions.
- Pagination where applicable.

### Create Event

Use a clear, organized form.

Group related fields logically.

Provide:

- Labels.
- Validation.
- Required-field indication.
- Image upload when supported.
- Date and time inputs.
- Capacity fields when supported.
- Description editor where supported.
- Submission feedback.

### Edit Event

Preserve existing data and provide clear update feedback.

### Delete Event

Use confirmation dialogs.

Explain destructive actions.

Do not delete related information unexpectedly.

## 9.6 Member Management

Redesign member administration.

Requirements:

- Search.
- Filters.
- Member status.
- Profile details.
- Relevant membership information.
- Relevant registration information.
- Appropriate administrative actions.

Use responsive tables on desktop and a more appropriate presentation on mobile.

Do not expose unnecessary sensitive information.

## 9.7 Membership Management

Where supported:

- Clear membership overview.
- Membership status.
- Validity period.
- Relevant member information.
- Administrative actions.
- Status updates.

Make status changes explicit and confirm important operations.

## 9.8 Manual Payment Verification

This is a particularly important administrative workflow.

Create an efficient payment review interface.

The administrator should be able to:

1. View pending payment submissions.
2. Identify the associated member.
3. Review relevant payment information.
4. Securely inspect submitted evidence.
5. Approve or reject the submission.
6. Provide a rejection reason where supported.
7. Confirm the operation.
8. See the resulting status.

Important requirements:

- Clear pending status.
- Clear approval status.
- Clear rejection status.
- Secure evidence access.
- Confirmation before irreversible actions.
- Feedback after successful operations.
- Error handling.
- Appropriate loading states.

The interface must never suggest that a payment was verified when the backend operation failed.

## 9.9 CMS Management

Improve content management workflows.

Preserve existing CMS capabilities.

Potential areas:

- News.
- Articles.
- About content.
- Images.
- Publication status.
- Content editing.

Make content editing intuitive.

Provide clear distinctions between draft, published, and other existing states.

Do not hardcode dynamic CMS content in public pages.

## 9.10 Messaging and Notifications

Improve the administrator's communication tools.

Where supported:

- Conversation management.
- Member selection.
- Message composition.
- Message status.
- Notification management.
- Relevant filtering.

Ensure all communication respects existing permissions.

## 9.11 Administrative Tables

Create a consistent table system.

Requirements:

- Readable column hierarchy.
- Responsive overflow handling.
- Search.
- Filters.
- Sorting.
- Pagination.
- Empty states.
- Loading skeletons.
- Row actions.
- Confirmation dialogs.

On mobile, use compact layouts or structured record cards when appropriate.

Never make important administrative actions inaccessible on mobile.

---

# 10. RESPONSIVE DESIGN

The entire platform must be designed for desktop, tablet, and mobile.

Responsive behavior is mandatory, not an afterthought.

## 10.1 Target Viewports

Test at these widths:

| Device category | Width |
|---|---:|
| Small mobile | 320px |
| Mobile | 360px |
| Mobile | 390px |
| Large mobile | 430px |
| Small tablet | 768px |
| Tablet / laptop | 1024px |
| Desktop | 1280px |
| Large desktop | 1440px |
| Wide desktop | 1920px |

Also test intermediate widths.

## 10.2 Mobile Requirements

On mobile:

- No horizontal page overflow.
- No clipped content.
- No overlapping navigation.
- No inaccessible buttons.
- No tiny text.
- No broken tables.
- No oversized hero sections.
- No excessive vertical whitespace.
- No difficult forms.
- No unusable dialogs.
- No hover-only interactions.

Use appropriate mobile layouts rather than compressing desktop designs.

## 10.3 Tablet Requirements

Ensure tablet layouts have deliberate composition.

Pay special attention to:

- Navigation.
- Sidebars.
- Grid columns.
- Tables.
- Dashboard cards.
- Event layouts.
- Dialog dimensions.

## 10.4 Desktop Requirements

Use available space intelligently.

Avoid:

- Extremely wide text columns.
- Oversized cards.
- Excessively empty dashboards.
- Unbalanced section widths.

Maintain strong visual composition on large screens.

## 10.5 Responsive QA

Test every major route at multiple widths.

Use actual browser inspection and screenshots.

Do not consider responsiveness complete simply because CSS breakpoints exist.

---

# 11. ACCESSIBILITY

Target WCAG 2.2 AA where applicable.

## 11.1 Requirements

- Semantic HTML.
- Correct heading hierarchy.
- Accessible labels.
- Keyboard navigation.
- Visible focus indicators.
- Sufficient color contrast.
- Descriptive buttons.
- Accessible form errors.
- Meaningful image alternatives.
- Accessible dialogs.
- Accessible navigation.
- Proper status communication.

## 11.2 Keyboard Interaction

Verify:

- Tab navigation.
- Shift + Tab.
- Enter.
- Space.
- Escape.
- Arrow keys where expected.

Interactive elements must be usable without a mouse.

## 11.3 Forms

Every form must have:

- A visible label.
- Clear required-field indication.
- Understandable validation messages.
- Correct error association.
- Appropriate success feedback.

Do not rely on color alone to communicate errors or statuses.

## 11.4 Motion Accessibility

Respect reduced-motion settings.

Avoid animations that create unnecessary discomfort.

---

# 12. IMAGES, VIDEO, AND VISUAL ASSETS

High-quality visuals are essential to the Fight Zone identity.

## 12.1 Image Strategy

Inspect available assets before sourcing new ones.

Use authentic, relevant sports photography.

Prioritize:

- Realistic sports environments.
- Athletes in action.
- Training.
- Competition.
- Community.
- Event atmosphere.
- Sport-specific details.

The imagery must represent the actual identity and activities of Fight Zone.

## 12.2 Image Quality

Requirements:

- Appropriate aspect ratios.
- Consistent cropping.
- Responsive image sizing.
- Optimized formats.
- Lazy loading where appropriate.
- Meaningful alt text.
- Proper fallbacks.

Avoid stretched images and inconsistent image quality.

## 12.3 Licensing

Use only assets that are owned, licensed, or otherwise permitted for the intended use.

Do not download random copyrighted images.

Do not use watermarked imagery.

## 12.4 Video

If using video:

- Optimize file size.
- Avoid unnecessary autoplay.
- Provide fallback content.
- Respect reduced motion.
- Avoid blocking page rendering.
- Ensure mobile performance.

Video should enhance the experience, not compromise usability.

---

# 13. PERFORMANCE ENGINEERING

The redesigned platform must remain fast.

## 13.1 Next.js Architecture

Respect the existing Next.js architecture.

Prefer Server Components by default when appropriate.

Use Client Components only when interactivity requires them.

Avoid unnecessarily converting large page trees into client-rendered components.

## 13.2 Rendering

Optimize:

- Server rendering.
- Client hydration.
- Component boundaries.
- Data fetching.
- Re-render frequency.
- Suspense boundaries.
- Loading behavior.

Avoid unnecessary client-side data fetching when server-side fetching is appropriate.

## 13.3 Assets

Optimize:

- Images.
- Fonts.
- Icons.
- Video.
- Animation assets.

Avoid unnecessarily large dependencies.

## 13.4 Core Web Vitals

Evaluate:

- Largest Contentful Paint.
- Interaction to Next Paint.
- Cumulative Layout Shift.

Aim for strong performance under realistic conditions.

## 13.5 Performance Testing

Use Lighthouse or equivalent tools.

Record:

- Performance.
- Accessibility.
- Best Practices.
- SEO.

Investigate major regressions.

Do not sacrifice accessibility or functional correctness to improve a synthetic score.

---

# 14. DATA INTEGRITY AND BUSINESS RULES

Visual improvements must preserve the actual Fight Zone business model.

## 14.1 Source of Truth

The backend remains authoritative.

Frontend state is not proof of:

- Payment approval.
- Membership activation.
- Event registration.
- User authorization.
- Achievement completion.
- Administrative operations.

## 14.2 Status Consistency

Use consistent status presentations throughout the platform.

The same backend status should have the same meaning across relevant screens.

Do not confuse:

- Pending with approved.
- Submitted with verified.
- Registered with attended.
- Expired with active.
- Published with draft.

## 14.3 Currency and Dates

Respect the platform's existing locale and formatting conventions.

Where appropriate, present monetary values in Tunisian dinars (TND).

Use consistent date and time formatting.

Do not silently change stored date semantics or time-zone behavior.

## 14.4 Error Handling

Every important operation must handle:

- Network failure.
- Validation failure.
- Permission failure.
- Missing data.
- Unexpected server response.
- Upload failure.
- Duplicate action.

Show useful messages without exposing sensitive internal errors.

---

# 15. LOADING, EMPTY, ERROR, AND SUCCESS STATES

A complete redesign must cover more than successful data presentation.

For every major page and workflow, implement appropriate states.

## 15.1 Loading

Use polished skeletons or loading indicators.

Preserve layout dimensions where possible to avoid layout shifts.

## 15.2 Empty

Explain why no content is available.

Where appropriate, provide a useful next action.

Examples:

- No upcoming events.
- No notifications.
- No conversations.
- No achievements.
- No pending payment reviews.
- No search results.

## 15.3 Error

Display clear and actionable error feedback.

Provide retry options when appropriate.

## 15.4 Success

Communicate completed actions clearly.

Examples:

- Event created.
- Profile updated.
- Payment evidence submitted.
- Payment verified.
- Content published.

Never display success before the operation actually succeeds.

---

# 16. DESIGN AND ENGINEERING TOOLS

The agent is explicitly encouraged to explore and use any relevant available resources that can improve the quality of the final result.

This includes:

- Installed AI skills.
- MCP tools.
- Design tools.
- Browser automation.
- Screenshot tools.
- Accessibility tools.
- Visual regression tools.
- Component libraries.
- Animation libraries.
- Image optimization tools.
- Performance analysis tools.
- Documentation and design references.

## 16.1 Tool Discovery

Before selecting tools:

1. Inspect available skills.
2. Inspect available MCP integrations.
3. Identify useful browser and visual testing capabilities.
4. Evaluate design and component resources.
5. Verify compatibility with the existing stack.
6. Select the tools that provide measurable value.

## 16.2 Tool Selection Rules

Do not install tools just because they are available.

Evaluate:

- Compatibility.
- Maintenance.
- Security.
- Bundle size.
- Performance.
- Accessibility.
- Developer experience.
- Actual usefulness.

Do not introduce unnecessary dependencies.

## 16.3 Visual Verification

Use browser previews and screenshots to inspect the actual implementation.

Do not rely exclusively on code inspection.

Review:

- Desktop composition.
- Mobile composition.
- Typography.
- Spacing.
- Navigation.
- Animation.
- Image quality.
- Interactive states.
- Overflow.
- Accessibility.

Use screenshots to identify and correct visual defects.

---

# 17. IMPLEMENTATION PHASES

Execute the redesign in controlled phases.

Do not attempt to modify the entire application without a structured process.

## PHASE 1 — Audit and Planning

Tasks:

- Inspect repository.
- Inventory routes.
- Inspect existing architecture.
- Review existing UI.
- Test important user journeys.
- Identify current issues.
- Inspect available tools and skills.
- Define implementation strategy.

Deliverable:

`docs/design-redesign-audit.md`

Do not make unnecessary architectural changes.

## PHASE 2 — Design System

Tasks:

- Establish visual direction.
- Define tokens.
- Define typography.
- Define colors.
- Define spacing.
- Define layout conventions.
- Define motion.
- Refine reusable components.
- Define responsive foundations.

Deliverables:

- Global design tokens.
- Shared component foundations.
- `docs/design-system.md`
- `docs/motion-guidelines.md`

## PHASE 3 — Shared Application Foundations

Tasks:

- Improve shared navigation.
- Improve page containers.
- Improve headers.
- Improve buttons and forms.
- Improve dialogs.
- Improve notifications.
- Improve loading and empty states.
- Improve responsive foundations.

Verify shared components before using them throughout the application.

## PHASE 4 — Public Portal

Redesign every existing public page.

Priority:

1. Homepage.
2. Navigation.
3. Events.
4. Event details.
5. News.
6. News details.
7. About.
8. Contact.
9. FAQ.
10. Legal pages.
11. Authentication pages.

Verify all public routes and links.

## PHASE 5 — Member Portal

Redesign:

1. Application shell.
2. Dashboard.
3. Events.
4. Event details.
5. Registrations.
6. Membership.
7. Manual payment experience.
8. Profile.
9. Achievements.
10. Messaging.
11. Notifications.

Test the complete member journey.

## PHASE 6 — Admin Portal

Redesign:

1. Application shell.
2. Dashboard.
3. Analytics.
4. Calendar.
5. Event management.
6. Member management.
7. Membership management.
8. Manual payment verification.
9. CMS.
10. Messaging.
11. Notifications.

Test the complete administrative journey.

## PHASE 7 — Motion and Visual Polish

Tasks:

- Implement purposeful transitions.
- Implement scroll reveals.
- Refine hover interactions.
- Improve image presentation.
- Refine visual hierarchy.
- Improve spacing.
- Improve typography.
- Remove inconsistent styling.
- Optimize motion.

Verify reduced-motion behavior.

## PHASE 8 — Responsive and Accessibility QA

Tasks:

- Test all major routes.
- Test target viewports.
- Fix horizontal overflow.
- Test mobile navigation.
- Test forms.
- Test tables.
- Test dialogs.
- Test keyboard navigation.
- Review contrast.
- Verify reduced-motion behavior.

Deliverable:

`docs/responsive-qa.md`

## PHASE 9 — Performance and Regression QA

Tasks:

- Run project linting.
- Run type checking.
- Run tests.
- Build production application.
- Test important workflows.
- Review browser console.
- Review network failures.
- Review image loading.
- Review performance.
- Check for regressions.

Fix all important issues introduced by the redesign.

## PHASE 10 — Final Delivery

Prepare a comprehensive implementation report.

Deliverable:

`docs/design-redesign-implementation-report.md`

Clearly document what was:

- Implemented.
- Tested.
- Improved.
- Blocked.
- Not implemented.

Do not claim that a workflow was tested if it was not.

---

# 18. DETAILED ACCEPTANCE CHECKLIST

## 18.1 Global

- [ ] Complete repository audit performed.
- [ ] Existing architecture understood.
- [ ] Existing functionality preserved.
- [ ] Unified visual system implemented.
- [ ] Typography consistent.
- [ ] Colors consistent.
- [ ] Spacing consistent.
- [ ] Reusable components refined.
- [ ] Interactive states implemented.
- [ ] Motion system implemented.
- [ ] Reduced-motion support implemented.
- [ ] Loading states implemented.
- [ ] Empty states implemented.
- [ ] Error states implemented.
- [ ] Success states implemented.

## 18.2 Public Portal

- [ ] Homepage redesigned.
- [ ] Navigation redesigned.
- [ ] Sports section redesigned.
- [ ] Events listing redesigned.
- [ ] Event details redesigned.
- [ ] News listing redesigned.
- [ ] News details redesigned.
- [ ] About page redesigned.
- [ ] Contact page redesigned.
- [ ] FAQ redesigned.
- [ ] Legal pages redesigned.
- [ ] Authentication pages redesigned.
- [ ] All public navigation verified.
- [ ] Public content remains data-driven.

## 18.3 Member Portal

- [ ] Member shell redesigned.
- [ ] Dashboard redesigned.
- [ ] Events redesigned.
- [ ] Event details redesigned.
- [ ] Registration states verified.
- [ ] Membership redesigned.
- [ ] Manual payment flow redesigned.
- [ ] Profile redesigned.
- [ ] Achievements redesigned.
- [ ] Messaging redesigned.
- [ ] Notifications redesigned.
- [ ] Existing member permissions preserved.
- [ ] Backend operations verified.

## 18.4 Admin Portal

- [ ] Admin shell redesigned.
- [ ] Dashboard redesigned.
- [ ] Analytics redesigned.
- [ ] Calendar redesigned.
- [ ] Event management redesigned.
- [ ] Member management redesigned.
- [ ] Membership management redesigned.
- [ ] Payment review redesigned.
- [ ] CMS redesigned.
- [ ] Messaging redesigned.
- [ ] Notifications redesigned.
- [ ] Administrative permissions preserved.
- [ ] Destructive actions protected.
- [ ] Backend operations verified.

## 18.5 Responsive

- [ ] 320px.
- [ ] 360px.
- [ ] 390px.
- [ ] 430px.
- [ ] 768px.
- [ ] 1024px.
- [ ] 1280px.
- [ ] 1440px.
- [ ] 1920px.
- [ ] No horizontal overflow.
- [ ] Mobile navigation works.
- [ ] Tables remain usable.
- [ ] Dialogs remain usable.
- [ ] Forms remain usable.
- [ ] Text remains readable.

## 18.6 Accessibility

- [ ] Semantic HTML.
- [ ] Heading hierarchy.
- [ ] Keyboard navigation.
- [ ] Visible focus states.
- [ ] Form labels.
- [ ] Form errors.
- [ ] Color contrast.
- [ ] Accessible dialogs.
- [ ] Reduced motion.
- [ ] Image alt text.

## 18.7 Engineering

- [ ] Lint passes.
- [ ] Type checking passes.
- [ ] Relevant tests pass.
- [ ] Production build succeeds.
- [ ] Browser console reviewed.
- [ ] No important broken routes.
- [ ] No fake data.
- [ ] No fake interactions.
- [ ] No unauthorized backend changes.
- [ ] No exposed secrets.
- [ ] Performance reviewed.
- [ ] Existing business rules preserved.

---

# 19. VISUAL QUALITY ACCEPTANCE

The project is not complete simply because the pages compile.

The actual visual experience must be evaluated.

For every major portal:

1. Open the application in a real browser.
2. Inspect the desktop experience.
3. Inspect the mobile experience.
4. Capture screenshots.
5. Review the screenshots.
6. Identify visual inconsistencies.
7. Correct spacing and composition issues.
8. Verify interaction states.
9. Repeat until the result is coherent.

## 19.1 Quality Questions

Ask:

- Does the homepage immediately communicate the Fight Zone identity?
- Does the platform look professionally designed?
- Is the visual hierarchy clear?
- Are important actions obvious?
- Are the images appropriate?
- Does the design feel consistent?
- Are the animations tasteful?
- Is the mobile experience genuinely excellent?
- Is the member portal motivating?
- Is the admin portal efficient?
- Are the three experiences visually related?
- Does anything look unfinished or generic?

Do not accept a merely functional result when visual quality remains weak.

---

# 20. DOCUMENTATION REQUIREMENTS

Maintain clear project documentation.

Create or update:

```text
docs/
├── design-redesign-audit.md
├── design-system.md
├── motion-guidelines.md
├── responsive-qa.md
└── design-redesign-implementation-report.md
```

Adapt filenames only if the project already has an equivalent documentation structure.

Documentation must reflect the actual implementation.

---

# 21. FINAL ENGINEERING REPORT

At completion, provide a structured report.

## 21.1 Summary

Explain the redesign and the most important improvements.

## 21.2 Public Portal

List the pages and experiences redesigned.

## 21.3 Member Portal

List the pages and workflows redesigned.

## 21.4 Admin Portal

List the administrative areas redesigned.

## 21.5 Design System

Explain:

- Visual direction.
- Typography.
- Color system.
- Reusable components.
- Animation system.
- Responsive approach.

## 21.6 Engineering

Document:

- Architecture decisions.
- Dependencies added or removed.
- Performance improvements.
- Accessibility improvements.
- Relevant technical changes.

## 21.7 Testing

Provide actual results for:

- Lint.
- Type checking.
- Unit tests.
- Integration tests.
- Production build.
- Browser verification.
- Responsive QA.
- Accessibility review.

Distinguish between passed, failed, and not executed.

## 21.8 Remaining Issues

List unresolved problems honestly.

Never hide blockers or claim success without evidence.

---

# 22. FINAL PRODUCT STANDARD

The final Fight Zone V1 must deliver three excellent experiences.

### Public Portal

A memorable, energetic, premium sports destination that captures attention and encourages visitors to discover Fight Zone.

### Member Portal

A personal and motivating sports hub that makes membership, events, communication, and achievements enjoyable and simple.

### Admin Portal

A dependable, professional command center that makes platform operations efficient and understandable.

All three must feel like parts of the same product.

The redesign must be complete, consistent, responsive, accessible, performant, and production-ready.

---

# 23. FINAL INSTRUCTION TO THE AI AGENT

You are not being asked to produce a design proposal, a homepage concept, a static mockup, or a superficial theme update.

You are being asked to engineer a complete redesign of the existing Fight Zone V1 platform.

You have the freedom to explore and use relevant AI skills, MCPs, design resources, browser automation tools, and other technologies that can improve the quality of the final result.

Use professional judgment.

Audit before modifying.

Design before implementing.

Implement every existing relevant page.

Preserve backend functionality and business rules.

Verify visually in a real browser.

Test actual workflows.

Optimize for real devices.

Do not stop after completing the homepage.

Do not leave the member or admin portals behind.

Do not replace working functionality with mock data.

Do not claim completion without verification.

**The objective is to transform Fight Zone into a cohesive, modern, premium, and production-quality sports platform while preserving the complete functionality of V1.**

**One brand. Three experiences. One complete redesign.**