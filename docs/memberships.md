# Membership Plans, Subscriptions & Billing Platform — Prompt #10

## Overview

Core monetization layer for Fight Zone. Manages membership plans, member subscriptions, and payment tracking. This is the financial backbone of the gym.

## Architecture

Uses three database tables (two new, one altered):

- `membership_plans` (NEW) — Pricing catalog with tiers, intervals, features, and credits
- `member_subscriptions` (NEW) — Active subscriptions linking members to plans with expiry tracking
- `payments` (ALTERED) — Extended from booking-only to support membership payments alongside booking payments

No external payment gateways in this prompt. Payments are a clean internal state machine (PENDING → COMPLETED) supporting CASH, BANK_TRANSFER, CARD, and ONLINE methods.

## Subscription Lifecycle

```
subscribeToPlan → ACTIVE → ends_at reached → EXPIRED
                                    ↓
                             cancelSubscription → CANCELLED
                                    ↓
                         admin can grant → ACTIVE (new subscription)
```

## Pricing Tiers

| Tier | Target | Features |
|------|--------|----------|
| ADULT | Adult members | Group sessions, open gym |
| STUDENT | Students (ID required) | Discounted group sessions |
| KIDS | Children 8-15 | Age-appropriate boxing classes |
| FAMILY | Families | Group family access |
| PRO_FIGHTER | Competitive fighters | Private sessions, competition prep |
| UNLIMITED | VIP members | All-access, guest passes, coach sessions |

## Billing Intervals

| Interval | Savings | Example |
|----------|---------|---------|
| MONTHLY | 0% | 120 TND/mo |
| QUARTERLY | ~10% | 324 TND/3mo |
| ANNUAL | ~20% | 1,152 TND/yr |
| CUSTOM | Variable | Special arrangements |

## File Structure

```
supabase/migrations/20260824000000_memberships_and_billing.sql
supabase/tests/memberships_rls.sql

lib/types/memberships.ts                   # Domain types + helpers
lib/validations/memberships.ts             # Zod schemas
lib/actions/memberships.ts                 # Server actions
lib/supabase/queries.ts                    # 10 new queries

app/(marketing)/pricing/page.tsx           # Public pricing page
components/memberships/pricing-card.tsx     # Pricing card
components/memberships/pricing-toggle.tsx   # Interval toggle
components/memberships/plan-create-form.tsx  # Admin create form
components/memberships/plan-edit-form.tsx    # Admin edit form

app/member/subscription/page.tsx           # Member subscription view
app/member/payments/page.tsx               # Member payment history
app/admin/memberships/page.tsx             # Admin plan catalog
app/admin/memberships/new/page.tsx         # Create plan
app/admin/memberships/[id]/page.tsx        # Edit plan
app/admin/memberships/subscriptions/page.tsx # Subscription management
app/admin/memberships/payments/page.tsx     # Payment management
```

## Server Actions

| Action | Auth | Purpose |
|--------|------|---------|
| `subscribeToPlan` | Member/Admin | Subscribe to a plan, create payment record |
| `cancelSubscription` | Member/Admin | Cancel active subscription |
| `createMembershipPlan` | Admin | Create pricing plan |
| `updateMembershipPlan` | Admin | Update plan details |
| `toggleMembershipPlanActive` | Admin | Activate/deactivate plan visibility |
| `recordPayment` | Admin | Record manual cash/bank/card payment |
| `grantMemberSubscription` | Admin | Manually assign plan to member |

## Migration: payments table ALTER

The existing `payments` table (from `20260815000200_coaching.sql`) was altered:

1. `method` column renamed to `payment_method` (data migrated)
2. `payment_method` enum extended: added `CARD`
3. `payment_status` enum extended: added `COMPLETED`
4. `booking_id` made nullable (was NOT NULL)
5. `unique(booking_id)` constraint dropped
6. `currency` changed from CHAR(3) to TEXT
7. Added `member_id` (FK → member_profiles)
8. Added `subscription_id` (FK → member_subscriptions)
9. Added CHECK: `member_id IS NOT NULL OR booking_id IS NOT NULL`

## RLS Policies

| Table | Policy | Rule |
|-------|--------|------|
| membership_plans | public_read | Active plans OR staff |
| membership_plans | staff_manage | Admin only |
| member_subscriptions | owner_select | Member sees own OR staff |
| member_subscriptions | staff_insert | Admin only |
| member_subscriptions | owner_update | Member own OR admin |
| member_subscriptions | staff_delete | Admin only |
| payments | owner_select | Member sees own OR staff |
| payments | staff_insert | Admin only |
| payments | staff_update | Admin only |
| payments | staff_delete | Admin only |

## Security Notes

- Members can only view their own subscriptions and payments (IDOR protection via RLS)
- Members cannot insert payments directly (blocked by RLS)
- Admins can manage all plans, subscriptions, and payments
- `member_id` is always derived server-side from `auth.uid()`, never from client input
- Subscription creation uses server-side `computeEndsAt()` — client cannot forge expiry dates
