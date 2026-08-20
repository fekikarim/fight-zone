# Content Engine & CMS Platform — Prompt #9

## Overview

Centralized content management system for Fight Zone's public-facing content:
news articles, media library (photos/videos/documents), and achievements/palmares
records. All admin content actions use `requireRole(["ADMIN"])` as the trust boundary.

## Architecture

No new tables. Uses existing tables from `20260815000300_content.sql`:
- `news` — articles with title, slug, content, cover image, publish status
- `media` — uploaded files with URL, type, visibility
- `achievements` — championships, certifications, awards with type, date, image

Storage: `fightzone-public` bucket with public read, staff write policies.

Content is plain text, split on `\n\n` for paragraph rendering. No markdown dependency.

## File Structure

```
lib/types/content.ts                  # Domain types + labels
lib/validations/content.ts            # Zod schemas (create/update/delete × 3)
lib/actions/content.ts                # CRUD server actions
lib/supabase/queries.ts              # Admin queries (getAdminNews, getAdminMedia, getAdminAchievements)

app/admin/content/page.tsx            # Hub — links to 3 sub-sections
app/admin/content/news/page.tsx       # News list
app/admin/content/news/new/page.tsx   # Create article
app/admin/content/news/[id]/page.tsx  # Edit article
app/admin/content/media/page.tsx      # Media library (upload + list)
app/admin/content/achievements/page.tsx # Achievements (create + list)

components/content/news-create-form.tsx
components/content/news-edit-form.tsx
components/content/media-upload-zone.tsx  # Client-side upload to Supabase Storage
components/content/media-manager.tsx      # Grid with visibility toggle + delete
components/content/achievement-manager.tsx # Create form + list with actions
```

## Admin Routes

| Route | Description |
|-------|-------------|
| `/admin/content` | Hub with counts for each section |
| `/admin/content/news` | List all articles (drafts + published) |
| `/admin/content/news/new` | Create new article form |
| `/admin/content/news/[id]` | Edit article + delete |
| `/admin/content/media` | Upload zone + media grid |
| `/admin/content/achievements` | Create achievement + list manager |

## Media Upload Flow

1. User selects file in `MediaUploadZone` (client component)
2. File uploads directly to `fightzone-public` bucket via `@supabase/ssr` browser client
3. On success, public URL is captured
4. User adds optional title/description
5. Form submits to `createMediaRecord` server action
6. Server action creates DB row with URL, type, visibility

## Server Actions

| Action | Purpose |
|--------|---------|
| `createNews` | Create article (sets `created_by` + `published_at`) |
| `updateNews` | Update article fields |
| `deleteNews` | Delete article |
| `createMediaRecord` | Save media metadata after client upload |
| `updateMedia` | Toggle visibility / edit title |
| `deleteMedia` | Delete media record |
| `createAchievement` | Create achievement record |
| `updateAchievement` | Update achievement fields |
| `deleteAchievement` | Delete achievement |

All actions validate via Zod and return `{ ok, message, id? }`.

## Loading States

Every admin route has a `loading.tsx` with animated pulse skeletons.

## Key Decisions

- **Client-side upload**: Media uploads go directly from browser to Supabase Storage.
  Server actions only create the DB metadata row. This avoids passing large files
  through server actions.
- **No markdown**: Content is plain text split on `\n\n`. Uses Tailwind `prose` classes
  for typography. Keeping it simple avoids a dependency and matches the design system.
- **Achievement types**: TITLE, TROPHY, MEDAL, CERTIFICATE, RANKING — mapped to labels
  via `achievementTypeLabel` in `lib/types/content.ts`.
