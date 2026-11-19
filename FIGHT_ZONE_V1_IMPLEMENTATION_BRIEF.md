# Fight Zone V1 — Product, Engineering & Implementation Brief

> **Audience:** AI coding agent working inside the existing Fight Zone repository  
> **Product owner / sole coach / administrator:** Coach Seif Dridi  
> **Release objective:** Upgrade the existing V0 into a coherent, secure, responsive, data-driven event and member-management platform.  
> **Status:** Implementation specification. The repository and live Supabase state must be audited before implementation; this document is not evidence that any feature or migration already exists.

---

## 0. Mission and non-negotiable outcome

Deliver Fight Zone V1 as one integrated platform with three connected surfaces:

1. **Public portal** — the public-facing brand, event discovery, news, coach/about content, contact and legal information.
2. **Admin portal** — the private operating workspace used by Seif to manage the entire platform.
3. **Member portal** — each member's personal workspace for events, registration/payment follow-up, messaging, notifications, profile and achievements.

All three surfaces must use the same authoritative backend and consistent business rules. A successful UI mock-up is not completion. Every important action must persist, be authorized, be reflected in related views and have clear feedback.

### Product model

- Fight Zone is a **single-coach / single-owner** platform. Seif Dridi is the only platform administrator and coach in the current business model.
- Do not introduce a coach marketplace, multi-coach discovery, multi-tenant organization model or staff-management complexity unless the product owner explicitly changes the business model.
- Events are the central commercial and operational object.
- **There is no online payment gateway in V1.** Do not integrate Stripe, card processing, wallets, subscriptions, automatic bank verification or payment-provider checkout.
- Payments happen offline / face-to-face or by bank transfer. Members may submit a transfer receipt image as evidence. Seif reviews it and manually confirms or rejects it.
- Communication about payment can continue in the private platform conversation between the member and Seif. Do not imply that the platform itself transfers money or verifies a bank transaction.
- Use TND (Tunisian dinar) as the currency for paid event prices. Store monetary values as integer millimes or a clearly documented fixed-precision numeric representation; never use floating-point arithmetic for money. Display formatted TND consistently.
- Free events must be first-class: no payment proof or payment review should be required for a free event.

### Core user journeys

**Public visitor:** Home → Events / News / About → event detail → sign in or create account to register → member portal.

**Member:** Sign in → dashboard → discover event → request/join event → see registration status and payment instructions → optionally submit bank-transfer proof → message Seif → receive admin confirmation → event appears in confirmed/upcoming/past event lists → earn participation credit after attendance is recorded → receive notifications and eligible rewards.

**Seif:** Sign in securely → admin dashboard → review upcoming events, new registrations, payment proofs, unread conversations and content activity → create/edit/publish events and news → manage registrations, capacities and attendance → confirm/reject payment evidence → message members → manage About page, FAQs, legal content and platform settings → inspect reports and reward liabilities.

---

## 1. Existing repository: audit before changing anything

The known V0 baseline from project history is:

- Next.js 16 App Router (Turbopack in development), React 19, TypeScript.
- Tailwind CSS v4 and an existing dark arena visual identity (historically `#0a0a0a`, rose/red accent, Oswald display typography and Geist body typography). Inspect the actual current theme before reusing or changing tokens.
- Supabase: PostgreSQL, Auth, Storage and Row Level Security (RLS).
- Supabase SSR integration, server-side session handling and root `proxy.ts` for session refresh.
- React Hook Form and Zod 4 are part of the established stack.
- Existing route areas include public marketing pages, authentication, `/member` and `/admin`.
- Existing schema history includes profiles/roles, sessions/services, bookings, events, messages, notifications, CMS/content, reviews/transformations and other V0 domains. Some historical features may be incomplete, obsolete or inconsistent with the V1 business model.
- A prior architecture decision separates `sessions` (service catalogue), `bookings` (timed reservations) and `events` (independent calendar occurrences). Preserve these distinctions where they still match the real implementation and V1 workflows; do not force event registration into the session-booking model.

### Mandatory discovery checklist

Before editing:

1. Read `AGENTS.md`, `roadmap.md` and all relevant project docs. Read the existing V0 handoff / final prototype notes if present.
2. Inspect `package.json`, lockfile, Next.js configuration, route tree, component conventions, design tokens and installed versions. Read the installed Next.js documentation for any version-sensitive APIs.
3. Inspect all public, admin and member routes, layouts, navigation, guards, forms, server actions, query functions and loading/error/empty states.
4. Inspect every relevant Supabase migration in order, generated database types, seed data, triggers, SQL functions, indexes, constraints, RLS policies and Storage policies.
5. Compare local migration history with the actual remote Supabase migration state using safe read-only inspection / CLI status commands. Never assume a local migration is deployed.
6. Inspect current Auth role assignment and account lifecycle. Confirm whether the actual database roles are `ADMIN`, `COACH`, `MEMBER` or another enum; map the existing representation to the single-Seif product model without creating a second authorization system.
7. Trace existing messaging and notification behavior end-to-end. Determine whether realtime is already configured and whether it is secure and reliable.
8. Identify all dead routes, placeholder CRUD, mock data, hard-coded metrics, TODOs, duplicate business logic and schema drift.
9. Produce a concise audit and phased implementation plan, then implement the work. Do not stop after producing a plan unless a genuine blocker requires product-owner input.

### Preserve and improve, do not blindly rewrite

- Reuse working authentication, RLS, validated server actions, UI primitives and migrations where correct.
- Remove or retire V0 features that contradict the V1 business model only after tracing dependencies and planning safe data migration. In particular, do not expose active subscription, membership billing or online-payment flows as live V1 features.
- Existing services/sessions may remain as informational catalogue content if still useful, but they must not obscure the event-first experience.
- Do not delete historical data or rewrite applied migrations. Use additive/corrective migrations and a documented deprecation path.

---

## 2. Engineering principles and security baseline

These apply to every route, query, action, component and migration.

### Architecture

- Use Server Components and server-side data fetching by default. Use Client Components only for real interaction, realtime subscriptions, browser APIs or local UI state.
- Keep business rules in validated server-side services/actions and database constraints/functions where appropriate, not duplicated across UI components.
- Use strict TypeScript. Do not use `any`, `@ts-ignore`, unsafe casts to bypass errors, or broad `select("*")` queries. Select explicit columns.
- Use Zod schemas for all untrusted inputs, including server action payloads, URL/query parameters and uploaded metadata.
- Derive the current user from the verified server-side Supabase session. Never trust a client-provided user ID, role, ownership, event price, payment state, capacity, reward eligibility or attendance status.
- Server Actions / Route Handlers are trust boundaries. Authenticate, authorize, validate, enforce business rules, return safe errors and revalidate affected paths/tags.
- PostgreSQL RLS is the final data-access boundary. Application guards do not replace RLS.
- Keep service-role keys and all privileged secrets server-only. Never expose them through `NEXT_PUBLIC_*` variables or client bundles.
- Use explicit transaction boundaries / database functions for multi-row operations that must remain atomic (e.g. capacity-safe registration, attendance reward issuance, reward redemption).
- Add idempotency protections to webhook-like/internal automation, notification creation, badge awarding and any retriable mutation.
- Avoid N+1 queries. Use server-side filtering, pagination and indexes for growing lists.
- Add structured server-side logging for operational failures without logging secrets, message bodies unnecessarily, or sensitive uploaded documents.

### Security and authorization

- Public visitors can read only published public content and public event fields.
- Members can read/update only their own permitted profile fields, registrations, payment submissions, notifications and conversations.
- A member must never read another member's private messages, receipt files, profile-private data or registration/payment evidence.
- Only Seif's verified admin account can access admin pages and perform privileged actions. A hidden link or client-side role check is not authorization.
- Prevent IDOR by checking ownership on every record and Storage object access.
- Protect against role escalation: users cannot self-assign admin/coach roles or update role assignment tables.
- Rate-limit or otherwise abuse-protect sign-in, contact submission, message sending and upload endpoints where the current infrastructure permits.
- Validate and constrain file types, file size and image dimensions. Treat filenames and MIME types as untrusted. Prefer safe image processing where supported.
- Use private Storage buckets for payment proofs and private message attachments. Access through authenticated, short-lived signed URLs or authorized server-mediated delivery. Never expose a public bucket URL for private evidence.
- Sanitize or safely render rich content. Never render arbitrary admin-supplied HTML/JavaScript. Use a controlled block schema and safe renderer.
- Implement CSRF-safe patterns consistent with Next.js/Supabase, secure cookie/session behavior, security headers and safe error messages.
- Record audit events for sensitive admin operations: event capacity/price/status changes, registration decisions, payment verification/rejection, attendance, reward grants/revocations, CMS publishing and role changes.

### Data integrity

- Add database constraints for non-negative prices, valid capacity bounds, valid status values, unique registrations and unique badge/reward issuance where applicable.
- Use database timestamps in UTC; display dates/times in the platform's configured timezone (default should be explicitly confirmed from existing settings; Tunisia is expected operational context, but do not hard-code timezone assumptions in every component).
- Define deletion behavior explicitly. Prefer soft-archive for published content/events with historical registrations; preserve financial/audit history.
- Use stable enums/statuses and documented state transitions. Do not encode business state only in UI booleans.

---

## 3. Domain model and terminology

The agent must map this model to the existing schema rather than blindly creating duplicate tables. Names below are conceptual; adapt names to established conventions.

### Main entities

- **Profile / Member:** Auth-linked identity, display name, avatar, contact fields, account status, profile preferences and privacy settings.
- **Role assignment:** Secure database-backed role. Current product has one Seif admin/coach and regular members.
- **Event:** Title, slug, summary, rich description blocks, cover/media, category, tags, visibility, event type/format, start/end, location or meeting instructions, price in TND, capacity rules, registration window, status, cancellation policy/content, creator and timestamps.
- **Event registration:** Member/event relationship, requested/confirmed/waitlisted/cancelled/rejected status, registration timestamp, admin decision metadata and attendance outcome.
- **Payment submission:** Registration reference, payment method (in-person or bank transfer), amount due, proof file reference if applicable, member note, submission status, reviewer, reviewed timestamp and rejection reason.
- **Conversation / Message:** Private member-to-Seif conversation, messages, sender, timestamps, read state, attachment metadata and moderation/deletion policy.
- **Notification:** Recipient, category, title/body, safe deep link, read state, created timestamp and optional deduplication key.
- **News article:** Title, slug, excerpt, content blocks, cover, author, category, tags, publication state and timestamps.
- **CMS page / page revision:** About page configuration using validated content blocks, draft/published state, revision history and publishing metadata.
- **FAQ item:** Question, answer, category/order, published state.
- **Badge definition:** Name, description, visual asset/tier, threshold/rule, reward definition and active state.
- **Member badge / achievement:** Member, badge, earned timestamp, qualifying event/participation count and immutable award reference.
- **Reward ledger:** Reward grant/reservation/redemption/expiry/revocation entries, member, source badge/rule, value, terms, status and admin audit data.
- **Attendance record:** Registration, attendance status, recorded by Seif and timestamp; the authoritative source for participation-based badge progress.
- **Audit log:** Actor, action, target, timestamp and minimal safe metadata.
- **Platform settings:** Public contact details, social links, FAQ/contact settings, default timezone and other controlled site configuration.

### Event formats and capacity

Support Seif-configurable event formats without assuming every event is a group class:

- Individual / one-person event (capacity of one).
- Group event with a configurable maximum number of participants.
- If required by the actual prototype, a team or multi-person registration format; implement only when its rules can be specified clearly and tested.

Model event format separately from visibility. Visibility options:

- **Public:** visible to everyone on the public event listing and detail page.
- **Private:** not discoverable publicly; visible only to invited/eligible members and Seif. Private event access must be enforced server-side and by RLS, not merely hidden in the UI.

Capacity must be controlled by Seif. Provide configurable capacity and clear remaining/available/full states. Define whether waitlisting is enabled per event. Concurrent registration must never exceed capacity: enforce atomically in the database or a transaction-safe RPC. Prevent duplicate active registrations.

Event lifecycle should cover at least draft, published/open, full, in progress, completed, cancelled and archived (adapt to existing enums). Registration lifecycle is separate from payment lifecycle and attendance lifecycle.

---

## 4. Public portal

### 4.1 Home

Create a high-quality, distinctive Fight Zone landing page that communicates the brand and directs visitors to the next useful action.

Required content areas (adapt to existing assets and content):

- Strong hero with clear Fight Zone identity, concise value proposition and primary CTA to discover events / join.
- Coach Seif introduction and credibility, using approved real content only.
- Featured/upcoming public events fetched from published backend records.
- Latest news/articles.
- Training/community highlights and relevant achievements/social proof only when genuine data is available and approved for public display.
- Clear contact and social links.
- Consistent footer with navigation and legal links.

Do not invent participant counts, wins, years of experience, testimonials, rankings or other claims. If real content is absent, use honest editorial copy or omit the metric.

### 4.2 Events listing and event details

- List only published public events to anonymous visitors.
- Include search/filter/sort where useful: upcoming/past, category, tags, date range and availability.
- Event cards show essential information: title, date/time, location/format, price (TND or Free), availability and category.
- Detail page shows full description, schedule, location, requirements, organizer, capacity/availability and registration CTA.
- Public pages must not expose private event data, member lists, payment data or internal notes.
- For private events, use invitation/authorization-specific entry points; do not leak private titles in public search, metadata, sitemap or API responses.
- For logged-out users, registration CTA leads through authentication and then returns them to the intended event safely.
- For logged-in users, CTA reflects their real registration state (register, pending, confirmed, waitlisted, cancelled, full, etc.).
- Display payment instructions only after the relevant registration context is known. Clearly explain that payment is handled offline / bank transfer and reviewed manually by Seif.

### 4.3 News / editorial page

Treat News as a manageable editorial/newsroom experience, not a static list.

- Seif can create, edit, preview, publish, unpublish and archive articles.
- Each article supports title, slug, excerpt, cover image, rich structured content, category, tags, publication date and SEO metadata.
- Categories and tags must be manageable by Seif where appropriate; prevent duplicate/invalid slugs and orphaned references.
- Public listing supports category/tag filters, pagination and search if useful.
- Article detail pages support related articles and clean share metadata.
- Draft and scheduled/unpublished articles must never leak to public visitors, sitemap or social metadata.

### 4.4 About page — fully admin-managed CMS

Seif must be able to shape the About page himself without developer assistance.

Build a responsive block-based page editor, not a free-form HTML editor. Support a well-designed set of reusable content blocks such as:

- Hero / title / subtitle.
- Rich text with safe formatting.
- Image with caption and alignment.
- Image gallery.
- Video embed from an allowlisted provider/URL pattern.
- Statistics only when values are explicitly entered and verified by Seif.
- Timeline / milestones.
- Values / principles cards.
- Achievements / certificates / awards.
- Quote / testimonial (with explicit consent and moderation).
- CTA / contact block.
- Divider / spacing / section background variants.

Editor requirements:

- Add, remove, reorder and duplicate blocks.
- Edit block content with contextual validation.
- Upload/select media with alt text and captions.
- Preview desktop, tablet and mobile layouts.
- Save draft, preview draft, publish and restore a prior revision.
- Warn about unsaved changes and destructive edits.
- Validate content lengths, media references and required fields.
- Store structured JSON with a versioned schema; validate on both write and render.
- Public renderer must be robust to missing optional fields, old schema versions and unexpected data. Unknown block types should fail safely, not crash the whole page.
- Every block must remain responsive for long text, unusual image ratios, missing media, reordered sections and narrow screens. Do not allow arbitrary CSS or script injection.

### 4.5 Contact page and FAQ

- Display Seif's actual approved contact channels: phone, email, WhatsApp/social links and location/working hours only when configured by Seif. Do not invent contact information.
- Provide a validated contact form with name, email, subject/category and message; protect against spam and abuse.
- Store submissions securely and surface them in the admin workspace with status (new, read, replied/closed) or an equivalent simple workflow.
- FAQ is manageable by Seif: create/edit/reorder/publish categories and questions/answers.
- Searchable/collapsible FAQ UI with keyboard accessibility.
- Provide clear confirmation and error states; do not claim a message was sent unless backend persistence succeeds.

### 4.6 Privacy Policy and Terms of Use

- Add dedicated, discoverable `/privacy` and `/terms` pages, linked in footer and relevant forms.
- Provide professional, readable, structured legal-document layouts with last-updated date and version/history support.
- Draft content must accurately describe actual data collected, purposes, storage, messaging, uploaded payment evidence, account rights, retention/deletion handling, cookies/analytics (only if used), third-party processors and contact channel.
- Terms must accurately describe account responsibilities, event registration, capacity, cancellations/refunds as decided by Seif, manual/offline payment, bank-transfer proof review, conduct, content/IP, service availability and liability boundaries.
- Do not invent statutory compliance, legal guarantees, refund policies, retention periods or jurisdiction-specific legal advice. Mark legal text as a draft requiring review by qualified local counsel / the owner before publication.
- Allow Seif to update/publish legal versions through a controlled admin editor or versioned content records. Preserve prior published versions and record acceptance/version where legally/product-required.

### 4.7 Public design, responsiveness and SEO

- Preserve a coherent Fight Zone brand. Improve hierarchy, typography, spacing, contrast, imagery and interaction polish without gratuitous animation.
- Responsive behavior must be deliberately designed for small phones, large phones, tablets, laptops and wide desktop.
- Use optimized images, stable aspect ratios, lazy loading below the fold and accessible alt text.
- Provide page metadata, canonical URLs, Open Graph/Twitter metadata, sitemap and robots behavior. Only public/published content belongs in the sitemap.
- Ensure public pages remain useful when optional sections have no content or a non-critical query fails.

---

## 5. Admin portal — Seif's operating console

The admin portal is the control center for the complete platform. It must be operationally useful, not just visually impressive.

### 5.1 Admin dashboard

Build a live, date-aware dashboard with clearly defined metrics and drill-down links.

Potential panels (show only metrics that can be computed accurately):

- Total active members and new members in a selectable period.
- Upcoming events, events this week/month, completed/cancelled events.
- Registrations by status; pending requests needing review.
- Capacity utilization / remaining places.
- Payment submissions awaiting review; confirmed offline payments and manually recorded income.
- Income reporting based only on payments explicitly recorded/confirmed by Seif. Never infer revenue from event prices multiplied by registrations.
- Unread messages / conversations requiring attention.
- New contact submissions.
- Published news and recent content activity.
- Attendance / participation summaries.
- Badge/reward issuance and outstanding reward liability.
- Recent admin activity / audit trail.

Dashboard controls:

- Date range selection and relevant filters.
- Refresh/revalidation behavior; no stale hard-coded figures.
- Each metric links to its underlying filtered records.
- Clear distinction between paid/confirmed, pending proof, rejected, free registrations and unrecorded amounts.
- Loading, empty, partial failure and retry states.

### 5.2 Event management

Seif can:

- Create, edit, duplicate, preview, publish, unpublish, cancel and archive events.
- Set public/private visibility.
- Set individual / one-person or group format and capacity.
- Set free or paid price in TND.
- Set event start/end, registration open/close windows, location, requirements, instructions, cover and categories/tags.
- Choose waitlist behavior and registration approval mode if supported by the final business rules.
- View registrations grouped by status, inspect member details permitted for operations, confirm/reject registrations, manage waitlist and cancel registrations with a reason.
- Record attendance after the event; attendance must not be self-awarded by members.
- Export a useful attendee/registration list (CSV) only if export access and privacy are handled safely.

All edits must validate capacity against existing registrations. Reducing capacity below current confirmed count must require a deliberate warning and an explicit resolution path; never silently remove members.

### 5.3 Calendar

Create a polished calendar that reads from the same canonical event records as the event manager.

- Month, week, agenda/list views; mobile-friendly agenda fallback.
- Navigate dates and jump to today.
- Color/label by event category or status with an accessible legend.
- Show title, time, visibility, format and capacity/registration state in event previews.
- Click an event to open a useful detail/edit panel or route.
- Create an event from a selected date/time with prefilled fields.
- Filter by status, category and visibility.
- Handle timezone and all-day events consistently.
- Do not create a separate calendar-only event store; calendar and event manager must remain synchronized.

### 5.4 Registration and payment review

Provide a dedicated queue for registrations and payment submissions.

- Separate registration decision from payment review and attendance.
- Show member, event, amount due, payment method, submitted date, proof preview (authorized private access), and current statuses.
- For bank transfers: Seif can open the private proof, compare the declared amount/reference with the event registration, then confirm or reject with an optional/required reason.
- For in-person payment: Seif can manually record receipt/confirmation, amount and date, with an audit entry. Do not ask members to upload a fake bank receipt for in-person payment.
- For free events: mark payment as not required; do not create artificial pending payment tasks.
- Rejection must explain next steps to the member and allow resubmission where policy permits.
- Never treat uploaded evidence as proof that money arrived. Only Seif's explicit review changes payment to confirmed.
- Do not automatically confirm a registration merely because an image was uploaded.
- Prevent duplicate confirmation, amount mismatch and race conditions.

### 5.5 Member management

- Search/filter/paginate members.
- View member profile, event history, registration/payment statuses, attendance, badges/rewards, notifications and conversation.
- Edit only operationally necessary profile fields with audit trail.
- Suspend/deactivate/reactivate accounts only if the existing auth/account lifecycle supports it safely.
- Never expose passwords, auth tokens or private data unnecessarily.

### 5.6 Messaging inbox

- One private conversation between Seif and each member (or a clearly defined thread model).
- Inbox with unread count, last message, member identity, last activity, search/filter and unread priority.
- Conversation view with chronological messages, timestamps, delivery/read indicators where supported, attachment previews and responsive composer.
- Admin can send messages, mark unread/read, and manage conversation state without deleting audit-relevant content.
- Support text and safe image/file attachments with strict size/type rules and private Storage access.
- Realtime updates should be implemented using Supabase Realtime only after verifying project configuration, RLS behavior, channel authorization and subscription cleanup. If secure realtime is not feasible, provide reliable polling/revalidation as a fallback; never expose private messages through public channels.

### 5.7 CMS and settings

Admin can manage:

- About page block editor and revisions.
- News articles, categories and tags.
- Event categories/tags.
- FAQ categories and items.
- Contact details, social links and public business information.
- Privacy Policy and Terms versions.
- Home page featured content/sections within a controlled set of options.
- Notification templates and automatic-message settings.
- Badge definitions and reward policies.

Include preview, draft/publish, confirmation for destructive actions and audit history where appropriate.

### 5.8 Reports and income

- Report registration counts, attendance, event utilization, member activity, manually confirmed payments and outstanding payment reviews.
- Filters by date, event, category and status.
- Income is a ledger of manually recorded/confirmed amounts, not an estimate from registrations.
- Clearly label gross confirmed receipts and any manually entered adjustments. Do not invent costs/profit if expenses are not recorded.
- Exports must match filters and respect access control.

---

## 6. Member portal

The member experience should feel like a connected sports community platform, not a generic account page.

### 6.1 Member dashboard

Personalized sections based on the authenticated member's real records:

- Welcome header and profile/avatar summary.
- Next confirmed/upcoming event and event status.
- My events: upcoming, pending, waitlisted, completed/past and cancelled, with meaningful distinctions.
- Public upcoming events the member may join.
- Latest published news.
- Participation count based on verified attendance, not registration count.
- Current badge progress and earned badges.
- Eligible rewards and redemption status.
- Unread message count / latest message from Seif.
- Notifications and important action reminders (e.g. payment proof needs review, registration decision).
- Optional personal goals only if implemented as a real member-owned feature with clear semantics; do not fabricate training metrics.

Never show fake charts, fabricated objectives or stats that cannot be supported by stored data.

### 6.2 Member events

- Browse public upcoming events with filters and search.
- Open event detail with clear price, capacity, event format and registration requirements.
- Register/request to join according to event configuration.
- Prevent duplicate active registration.
- Show exact status and next action after registration.
- Show private events only when the member has an explicit invitation/eligibility record.
- Show registration history and event details for events the member is entitled to see.
- Provide cancellation request/action only according to Seif's configured policy and event state.

### 6.3 Registration and manual payment flow

Use separate but connected state machines.

**Registration example:** `requested → confirmed` or `waitlisted` or `rejected`; later `cancelled` or `completed` based on event/attendance rules. Exact statuses should be normalized against existing schema.

**Payment example:** `not_required` (free event), `unpaid`, `proof_submitted`, `under_review`, `confirmed`, `rejected`, `recorded_in_person`, `refunded` only if the owner explicitly supports and records refunds. Do not expose refund functionality unless policy and ledger behavior are implemented.

Flow for paid event:

1. Member requests/registers for the event.
2. Server validates event is published/available, registration window is open, member is eligible and capacity rules permit it.
3. Member sees Seif's configured manual payment instructions and the exact amount due.
4. Member chooses in-person or bank transfer.
5. If bank transfer, member uploads proof image and may add a transfer reference/note.
6. Upload is stored privately and linked to the correct member/registration.
7. Member sees `submitted / awaiting Seif review`; this is not a confirmation of payment or guaranteed event place unless the event's capacity policy explicitly reserves a pending place.
8. Seif reviews and explicitly confirms/rejects the proof. Member receives a notification and message if needed.
9. Registration confirmation is controlled by the configured approval/payment policy, not a client-side assumption.

The product owner must define whether pending payment reserves a seat and for how long. If not defined, implement a safe configurable default and document it; do not silently promise a seat.

For free event:

- Payment state is `not_required`.
- Registration follows the event's approval/capacity policy.
- No receipt upload or payment reminder is generated.

### 6.4 Member profile

- View/edit allowed profile information.
- Avatar upload with validation, cropping/resizing if practical, fallback initials and safe storage.
- Show participation milestones, badges and reward history.
- Privacy controls for public display fields where applicable.
- Clear account settings and sign-out.
- Do not expose private event/payment/message data in a public profile by default.

### 6.5 Member messaging

- Direct private conversation with Seif.
- Realtime new-message delivery when secure and correctly configured; otherwise polling/revalidation fallback.
- Message history pagination/infinite scroll without loading all history at once.
- Optimistic UI only when rollback/error handling is correct.
- Read state, unread badge, attachment upload progress and retry/error states.
- Prevent members from creating conversations with arbitrary users or reading another member's conversation.
- Message composer must be accessible and usable on mobile.

### 6.6 Member notifications

- Notification center with unread/read filters and mark-as-read actions.
- Deep links route to the relevant event, payment submission, badge or conversation after authorization.
- Notification preferences should be simple and respect essential transactional messages.
- Do not create duplicate notifications on retries.

---

## 7. Gamification, badges and financially safe rewards

The goal is to recognize real participation, build belonging and encourage return visits without creating uncontrolled financial liability.

### 7.1 Participation definition

- A participation counts only when Seif records the member as attended (or a trusted check-in process is later explicitly approved).
- Registration, payment confirmation, waitlist position or event booking alone must not count as participation.
- One event can count at most once per member, unless Seif explicitly defines a different event-specific rule.
- Corrections to attendance must be auditable and recalculate progress safely.

### 7.2 Milestones and badge ladder

Support configurable milestones such as 10, 20, 30, 40, 50, 60 and onward. Do not hard-code a finite list; Seif should be able to create/edit/activate milestone badge definitions.

Each badge definition may include:

- Name, description and milestone threshold.
- Tier/rarity and visual style.
- Icon/artwork and avatar frame/accent unlock.
- Earned message template.
- Optional reward definition and eligibility rules.
- Active/inactive state and effective dates.

Members receive a well-designed achievement gallery, progress-to-next-milestone indicator and tasteful profile/avatar customization unlocked by earned badges. Keep the UI premium and accessible; do not use manipulative dark patterns or misleading scarcity.

### 7.3 Reward economics and controls

Rewards are optional and must be explicitly configured by Seif. Examples may include a one-time free entry to an eligible event, discount/credit or non-financial recognition. The “11th event free” is an illustrative idea, not an automatic entitlement unless Seif enables and configures it.

For every reward define:

- Reward type and exact value/benefit.
- Eligible event categories or exclusions.
- Whether it covers full or partial entry price.
- Expiry and redemption window.
- Maximum quantity / total liability / per-member limits.
- Whether it is transferable (default: no).
- Whether it can be combined with other offers (default: no).
- Manual approval requirement (default: Seif approval for financial benefits).
- Funding/impact reporting and current outstanding liability.

Required safeguards:

- No reward is automatically redeemable unless its policy is fully configured and validated.
- No reward can create a negative event price or be stacked beyond configured limits.
- Reward redemption must be atomic and single-use; prevent double redemption under concurrent requests.
- Keep immutable reward ledger entries; do not erase financial history.
- Admin can grant/revoke with reason and audit log.
- Show Seif a dashboard of outstanding reward liability and redeemed benefits before activating expensive rewards.
- If a badge has no reward, it can still unlock recognition/avatar cosmetics.
- Clearly explain reward terms to members.

### 7.4 Gamification acceptance

- Attendance recorded once increments progress once.
- Repeated requests/jobs do not duplicate badges or rewards.
- Correcting attendance reverses/reconciles eligibility with an audit trail.
- Threshold crossing awards the badge exactly once and creates the configured message/notification exactly once.
- Reward redemption is validated server-side and recorded atomically.
- Admin can preview the financial impact before activating a reward rule.

---

## 8. Automatic messages and notification automation

Build a controlled automation system for platform-originated messages from Seif/Fight Zone to members.

### 8.1 Required message triggers

At minimum support:

- Welcome message when a new member completes the relevant account/onboarding milestone.
- Registration received / pending decision.
- Registration confirmed, rejected or waitlisted.
- Payment proof received and awaiting review.
- Payment confirmed or rejected by Seif.
- Upcoming event reminder (only if scheduled delivery infrastructure is available and reliable).
- New badge/milestone earned.
- Reward granted, expiring or redeemed.
- Event updated or cancelled.
- New message from Seif (notification, not a redundant automated chat message).

### 8.2 Message design and delivery

- Messages should be warm, professional, concise and in the platform's configured language. Avoid overly promotional or repetitive wording.
- Each template supports variables such as member first name, event title, date, price, badge name and safe deep link.
- Automated messages should appear clearly labeled as system/Fight Zone messages inside the member conversation or a dedicated system-notice stream. Do not impersonate Seif as if he personally typed it.
- Define whether system messages are visible to Seif in the admin inbox; avoid clutter while preserving traceability.
- Allow Seif to enable/disable optional automation types and edit safe template text.
- Essential transactional notifications should not be disabled accidentally.
- Use a unique idempotency key per trigger/entity/member/template so retries cannot send duplicates.
- Persist the event that triggered the automation and delivery status.
- If email/push is later used, it is a separate channel with consent/preferences and should not replace in-app records.

### 8.3 Realtime and sync

- Use Supabase Realtime only for channels that are explicitly authorized and tested with RLS. Subscribe to only the relevant member/admin conversation or notification changes.
- Clean up subscriptions on route changes/unmount and handle reconnects, duplicate events and missed messages.
- Realtime events are hints to refresh authoritative data; never trust a client broadcast as proof of payment, registration or attendance.
- Ensure server-side writes remain authoritative and that dashboards revalidate after mutations.

---

## 9. Design system, responsiveness and interaction quality

### Visual direction

- Preserve Fight Zone's dark, high-energy arena identity while improving visual maturity and usability.
- Use a disciplined design system: typography scale, spacing scale, semantic colors, surfaces, borders, shadows, radii, focus rings, buttons, form controls, tables, dialogs, badges, toasts, skeletons and empty states.
- Use strong but restrained red/rose accent; do not turn every component into a glowing red card.
- Use sports photography only when licensed/approved and optimized. Do not fabricate Seif/member photos or testimonials.
- Keep public site, admin portal and member portal visually related but optimized for their distinct tasks.

### Responsive requirements

Test at minimum:

- 320–375px narrow phone.
- 390–430px typical phone.
- 768px tablet portrait.
- 1024px tablet/compact laptop.
- 1280–1440px desktop.
- 1920px wide desktop.

Requirements:

- No horizontal overflow, clipped modals, inaccessible dropdowns or fixed-width forms.
- Admin tables must become usable card/list layouts or controlled horizontal-scroll regions on mobile; never shrink text until unreadable.
- Sidebars collapse to a mobile navigation pattern with accessible focus management.
- Calendar switches to agenda/list on narrow screens.
- About page blocks remain responsive regardless of admin content order/length/media ratio.
- Touch targets, keyboard navigation, focus visibility and screen-reader labels are implemented.
- Respect `prefers-reduced-motion`; animation must not block interaction or cause layout shifts.

### Interaction states

Every data-driven screen must handle:

- Initial loading / skeleton.
- Empty state with an actionable next step.
- Validation errors.
- Permission denied.
- Network/server failure with retry where sensible.
- Success confirmation.
- Partial data failure when independent sections can still render.
- Stale data / concurrent update conflicts.

Avoid optimistic UI for sensitive transitions such as payment confirmation, attendance, capacity allocation and reward redemption unless server reconciliation and rollback are robust.

---

## 10. Data model and workflow details to implement/test

The agent must document exact status enums and transition rules after inspecting the current schema. At minimum, these separations are mandatory:

1. Event publication/lifecycle status.
2. Registration status.
3. Payment status.
4. Attendance status.
5. Reward lifecycle status.
6. Message read/delivery state.

Do not collapse these into one generic `status` column.

### Capacity-safe registration

- Validate event exists, is published/eligible, registration window is open and member can access it.
- Check duplicate registration.
- Enforce capacity atomically.
- If full, either reject or add to waitlist according to event settings.
- Define whether pending payment reserves a place and its expiry.
- Ensure cancellations release capacity and waitlist promotion follows explicit deterministic rules.

### Event edits

- Changing price after a member registers must not silently change that member's amount due. Snapshot the agreed amount on registration/payment record, or define and document another explicit policy.
- Changing date/location/cancellation must notify affected members and preserve audit history.
- Private/public visibility changes must update public cache, metadata and sitemap correctly.

### Payment proof

- A proof is attached to one member's registration and cannot be reassigned by changing client payloads.
- Verify MIME/signature, size and storage path ownership.
- Use private storage and signed access.
- Track submission/review timestamps and reviewer.
- Reject with reason; allow resubmission only under policy.
- Payment confirmation must be an explicit privileged server-side action.

### Attendance and badges

- Attendance is admin-controlled.
- Use a unique constraint to prevent duplicate attendance for a registration.
- Badge award calculation must be deterministic and idempotent.
- Keep an auditable trail when attendance is corrected.

### Messages and notifications

- Conversation membership is explicit and enforced by RLS.
- Messages are append-oriented; any deletion/edit policy must be deliberate and auditable.
- Notifications are recipient-scoped and idempotent.
- Automated messages should not recursively trigger more automated messages.

---

## 11. Testing strategy and required scenarios

Do not rely only on TypeScript/build checks. Add/update tests at the right layers.

### Unit tests

- Zod schemas and money formatting/calculation.
- Event status and registration transition rules.
- Capacity and waitlist decision logic.
- Payment state transitions.
- Reward eligibility, liability and redemption rules.
- Notification/message template rendering and idempotency keys.
- CMS block schema validation and safe rendering behavior.

### Integration / database tests

- RLS: anonymous, member A, member B and Seif admin access matrix.
- Member A cannot access member B's registration, message, receipt or notification.
- Member cannot modify price, capacity, role, attendance, payment confirmation or badge grants.
- Concurrent registrations cannot exceed capacity.
- Duplicate registrations are rejected safely.
- Private events and private storage objects remain inaccessible to unauthorized users.
- Payment proof upload and admin review state transitions work end-to-end.
- Free event registration never creates a payment obligation.
- Confirmed payment/in-person receipt is recorded once and contributes to income reporting once.
- Attendance/badge/reward automation is idempotent.

### End-to-end journeys

1. Anonymous visitor browses home, events, news, About, FAQ, contact, privacy and terms.
2. Visitor creates account, verifies/signs in as required and returns to intended event.
3. Member registers for a free event; payment is not requested.
4. Member registers for paid event and submits bank-transfer proof; status remains awaiting review.
5. Seif reviews proof, confirms it, and member sees synchronized status and notification.
6. Seif rejects proof with reason; member sees reason and permitted resubmission path.
7. Seif records in-person payment; no fake proof upload is required.
8. Two members race for the last seat; capacity is never exceeded.
9. Seif creates a private individual event and only invited member can see it.
10. Seif edits/publishes About blocks; public page reflects it responsively and prior revision can be restored.
11. Seif creates/publishes news with category/tags; public filters and detail work.
12. Member sends Seif a message; both portals receive the update and read state synchronizes.
13. New member receives one welcome system message.
14. Seif records attendance; participation count increments and milestone badge is awarded once.
15. Member redeems a configured reward; double redemption is prevented and ledger updates.
16. Seif views dashboard/calendar/reports; values reconcile to underlying records.
17. Member A attempts to access member B's private data and is denied.
18. Test responsive flows on mobile, tablet and desktop.

### Quality gates

Run all relevant scripts actually present in `package.json`, including:

- TypeScript/typecheck.
- ESLint/lint.
- Unit and integration tests.
- Production build.
- E2E tests where configured.
- Supabase migration validation / local database tests where available.

Do not invent script names; inspect package scripts first. Report exact commands and results.

---

## 12. Migration, deployment and operational safety

- Inventory local and remote migration state before schema changes.
- Never edit an already-applied migration. Create a new migration with rollback/forward-recovery notes.
- Never run destructive SQL, reset the remote database, drop production data, or push migrations to the remote project without explicit owner approval.
- `supabase db push --dry-run` or equivalent safe status/diff inspection may be used when configured.
- Confirm RLS policies, indexes, constraints, triggers, functions and Storage policies after migration.
- Regenerate database types from the verified schema and ensure the generated file matches the project convention.
- Seed only development/test data. Never pollute production with fake members, events, payments, badges or statistics.
- Verify environment variables and deployment configuration without printing secret values.
- Document backup and recovery expectations before production data migrations.
- Provide a release/rollback checklist and post-deployment smoke test plan.

---

## 13. Suggested implementation sequence

The agent may adjust sequencing based on the audit, but must keep dependencies and acceptance criteria explicit.

### Phase 0 — Repository and product audit

Deliver an inventory of existing routes, components, schema, policies, tests, migrations, placeholders, working features and V0 conflicts. Map every V1 requirement to existing / changed / new implementation.

### Phase 1 — Domain model and security foundation

Finalize event, registration, payment, attendance, message, notification, CMS and reward state models. Implement safe migrations, RLS, constraints, indexes, private storage and server-side service/action boundaries.

### Phase 2 — Event and manual payment workflows

Complete admin event CRUD, calendar, member discovery/registration, capacity enforcement, payment proof submission, manual/in-person payment recording, admin review and synchronized statuses.

### Phase 3 — Messaging and notifications

Complete private member-Seif conversations, attachments, read state, realtime/polling behavior, notification center and idempotent automatic system messages.

### Phase 4 — Admin operations

Complete dashboard, registration/payment queues, member management, attendance, reports and audit views.

### Phase 5 — Public portal and CMS

Complete home, event discovery/details, newsroom, About block editor/revisions, contact/FAQ, privacy and terms management, SEO and responsive rendering.

### Phase 6 — Member experience and gamification

Complete dashboard, events, profile/avatar, messaging, notifications, attendance-derived badge ladder, reward configuration/ledger/redemption and liability controls.

### Phase 7 — UX, accessibility and performance

Polish all surfaces, responsive states, forms, tables, calendar, editor, motion, loading/empty/error states, accessibility, query performance and caching/revalidation.

### Phase 8 — Full verification and release readiness

Run the full test matrix, security/RLS/Storage audit, E2E journeys, responsive review, production build, migration review and release checklist. Fix all P0/P1 defects. Clearly report any remaining blockers.

---

## 14. Definition of Done — V1

V1 is complete only when all applicable checks below are evidenced, not merely claimed.

### Product and workflows

- [ ] Single-coach model is consistent; Seif is the only admin/coach.
- [ ] No live online payment, checkout, subscription or automatic bank-verification flow is presented.
- [ ] Public and private events work with individual and group capacity rules.
- [ ] Registration, payment and attendance are separate, correct state machines.
- [ ] Free events bypass payment.
- [ ] Paid-event manual and bank-transfer workflows work end-to-end.
- [ ] Seif can confirm/reject evidence and record in-person payments.
- [ ] Admin calendar and event manager share the same records.
- [ ] Member and admin messaging work with secure synchronization.
- [ ] Notifications and automated messages are idempotent.
- [ ] Seif can manage public content, About blocks, FAQs and legal document versions.
- [ ] Member dashboards use real data only.
- [ ] Attendance-based badges and financially controlled rewards work.
- [ ] Reports reconcile with source records.

### Security and data integrity

- [ ] Server-side authorization and RLS tested for anonymous, member and admin.
- [ ] IDOR tests pass for messages, registrations, payment proofs, notifications and private events.
- [ ] Private Storage access is verified.
- [ ] Role escalation is prevented.
- [ ] Capacity, payment, attendance and reward operations are atomic/idempotent where required.
- [ ] Audit trail exists for sensitive admin decisions.
- [ ] No secrets or privileged credentials are exposed.
- [ ] No unresolved critical data-integrity or security defects.

### Quality and UX

- [ ] TypeScript, lint, tests and production build pass.
- [ ] Public, admin and member journeys pass E2E tests.
- [ ] Mobile, tablet and desktop layouts are verified.
- [ ] Keyboard accessibility, focus states and reduced-motion behavior are verified.
- [ ] Loading, empty, error, success and permission states are implemented.
- [ ] No fake metrics, placeholder CRUD or dead primary actions remain.
- [ ] Performance and query behavior are reviewed with realistic data volume.

### Release and handoff

- [ ] Local/remote migration state is documented and reconciled.
- [ ] No remote migration or destructive operation was run without approval.
- [ ] Environment and deployment requirements are documented.
- [ ] Backup/rollback and smoke-test plan is documented.
- [ ] Final report lists changed files, migrations, tests, results, limitations and outstanding owner decisions.

---

## 15. Required AI-agent execution protocol

The coding agent must follow this protocol throughout the task:

1. **Read first:** `AGENTS.md`, this document, existing `roadmap.md`, relevant docs, migrations, generated types and repository conventions.
2. **Audit actual state:** never assume the V0 description or this document matches the current code exactly.
3. **Map requirements:** create a requirement-to-implementation matrix with existing / incomplete / missing / conflicting status.
4. **Identify blockers:** distinguish code, schema, deployment, credentials, external configuration and unresolved business-policy decisions.
5. **Plan:** provide phases, dependencies, migration impact, risks and test strategy.
6. **Implement:** proceed through the approved scope; do not stop after superficial scaffolding or UI-only mockups.
7. **Verify continuously:** run focused tests after each domain and full quality gates at the end.
8. **Protect production:** no destructive actions, remote migration pushes, production data edits or secret changes without explicit approval.
9. **Document:** update project docs and roadmap with actual completion state, not optimistic claims.
10. **Report honestly:** list completed, partially completed and blocked requirements separately.

### Business decisions that must not be guessed

The agent should inspect any existing prototype notes/configuration first. If still unresolved, surface these as explicit owner decisions and implement safe configurable behavior rather than inventing a policy:

- Whether a pending paid registration reserves a seat, and for how long.
- Whether events require admin approval before a registration is confirmed.
- Whether a waitlist is enabled by default or per event.
- Cancellation deadline and refund/credit policy (do not invent refunds).
- Whether a member may register multiple people for one event or only themselves.
- Exact bank-transfer instructions / beneficiary details (Seif supplies these; never fabricate them).
- Whether private events are invitation-only, member-group restricted or individually assigned.
- Reward values, expiry, eligible event types, total budget/liability and approval policy.
- Legal wording and applicable local requirements; owner/legal review is required.
- Exact contact details, public statistics, testimonials, photos and social links.

If these decisions block a safe implementation, continue with the rest of the platform and make the affected policy configurable or clearly marked as awaiting owner input. Do not invent data.

---

## Final instruction

Build Fight Zone V1 as a complete, reliable, secure and polished operating platform for Coach Seif Dridi. The outcome must be a real integrated product: public content, event operations, manual payment review, member management, private messaging, notifications, attendance, gamification and reporting must all work together against the verified backend. Prioritize correctness, maintainability, security and member experience over adding unnecessary features or visual effects. Never claim a feature is complete until its end-to-end workflow and authorization have been tested.
