# Member Reviews, Transformations & Social Proof Platform — Prompt #11

## Overview

Builds social proof and community engagement through verified member reviews and Before/After transformation stories. Includes billing hardening fixes for Prompt #10.

## Architecture

Two new database tables (no external services):

- `reviews` — Member-submitted reviews with rating (1–5), targeting coaches, sessions, or the club. Moderated by staff.
- `transformation_stories` — Before/After transformation showcases with weight metrics, discipline, and timeframe.

All reviews default to `PENDING` and require staff approval before appearing publicly. Staff (ADMIN/COACH) can feature reviews on the home page.

## Review Lifecycle

```
Member submits → PENDING → Admin approves → APPROVED → visible publicly
                        → Admin rejects → REJECTED → hidden
                        → Admin features → is_featured = true → shown on home
```

## Transformation Lifecycle

```
Member/Admin submits → is_published = false → Admin publishes → is_published = true
                                                    → Admin features → is_featured = true
```

## Security Model

### Reviews
| Policy | Rule |
|--------|------|
| `reviews_public_read_approved` | SELECT: approved OR owner OR staff |
| `reviews_owner_insert` | INSERT: member_id = auth.uid() OR admin |
| `reviews_owner_update` | UPDATE: member_id = auth.uid() OR admin |
| `reviews_staff_manage` | ALL: admin or coach |

### Transformations
| Policy | Rule |
|--------|------|
| `transformations_public_read_published` | SELECT: published OR staff |
| `transformations_staff_manage` | ALL: admin or coach |

## Server Actions

| Action | Auth | Purpose |
|--------|------|---------|
| `submitReview` | Member | Submit review (defaults to PENDING) |
| `moderateReview` | Admin/Coach | Approve, reject, or feature review |
| `toggleReviewFeatured` | Admin/Coach | Pin/unpin review on home page |
| `deleteReview` | Owner/Admin | Delete review |
| `submitTransformation` | Member/Admin | Submit transformation story |
| `moderateTransformation` | Admin/Coach | Publish/unpublish, feature/unfeature |

## File Structure

```
supabase/migrations/20260825000000_billing_hardening.sql    # RLS fix for Prompt #10
supabase/migrations/20260826000000_reviews_and_transformations.sql
supabase/tests/reviews_rls.sql

lib/types/reviews.ts                          # Domain types, labels, helpers
lib/validations/reviews.ts                    # Zod schemas (5 schemas)
lib/actions/reviews.ts                        # 6 server actions
lib/supabase/queries.ts                       # 8 new review queries

components/reviews/review-form-modal.tsx       # Interactive star rating + form
components/reviews/moderate-review-form.tsx     # Admin approve/reject/feature
components/reviews/moderate-transformation-form.tsx  # Admin publish/feature

app/member/reviews/page.tsx                   # Member review list
app/member/reviews/loading.tsx                # Skeleton
app/admin/reviews/page.tsx                    # Admin moderation queue
app/admin/reviews/loading.tsx                 # Skeleton
app/admin/reviews/transformations/page.tsx    # Transformation management
app/admin/reviews/transformations/loading.tsx # Skeleton

components/marketing/sections/testimonials-section.tsx     # Dynamic testimonials
components/marketing/sections/transformations-preview.tsx  # Before/After cards
```

## UI Integration Points

| Page | Section Added |
|------|--------------|
| Home (`/`) | TestimonialsSection + TransformationsPreview |
| About (`/about`) | TestimonialsSection |
| Coach Profile (`/coaches/[id]`) | Coach-specific reviews |
| Service Detail (`/services/[id]`) | Session-specific reviews |
| Member Dashboard (`/member`) | "My Reviews" nav link |
| Admin Dashboard (`/admin`) | "Reviews" nav link |

## Billing Hardening (Phase 1)

The corrective migration `20260825000000_billing_hardening.sql` adds:
- `member_subscriptions_owner_insert` — allows authenticated members to self-subscribe
- `payments_owner_insert` — allows authenticated members to create payment records

Additionally, all `.select("*")` calls in `queries.ts` have been replaced with explicit column lists.
