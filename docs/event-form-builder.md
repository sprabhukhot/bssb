# Event form builder, image captions, and analytics

## Image captions (poster & donation)

On **Edit event**, each image upload has optional **heading** and **body** fields:

| Column | UI |
| --- | --- |
| `poster_heading` / `poster_body` | Shown next to the event poster on `/e/[slug]` |
| `donation_heading` / `donation_body` | Shown next to the donation/QR image |

Apply migration `008_image_captions_choice_fields.sql` so these columns exist.

## Richer field types

Organizers configure fields under **Registration form** on the event editor.

| Type | Public UI | Answer shape |
| --- | --- | --- |
| `short_text` / `long_text` | text / textarea | string |
| `number` | quantity select | number |
| `phone` / `email` | tel / email | string |
| `checkbox` | single checkbox | boolean |
| `dropdown` | `<select>` | choice **id** (string) |
| `single_choice` | radio pills | choice **id** |
| `multi_choice` | checkbox pills | string[] of choice ids |
| `image_choice` | tap avatar/image grid | choice **id** |

### Image / avatar choice

1. Click **Add image / avatar choice** (or set a field type to **Image / avatar choice**).
2. For each option: set a label, then either
   - pick a **built-in avatar** (emoji set with light CSS motion), or
   - **upload** a small JPG/PNG/WebP (stored in Supabase Storage bucket `event-posters` under `choices/`).
3. Save the event. Guests tap one option on mobile or desktop.

Choice definitions live in `events.form_fields` JSON as:

```json
{
  "id": "team",
  "type": "image_choice",
  "label": "Pick your avatar",
  "required": true,
  "choices": [
    { "id": "abc", "label": "Lotus", "avatarId": "lotus" },
    { "id": "def", "label": "Custom", "imageUrl": "https://…/choices/….webp" }
  ]
}
```

Built-in avatar ids are defined in `src/lib/avatars.ts` (`lotus`, `diya`, `peacock`, …).

## Attendee table & CSV

`/admin/events/[id]` and `/admin/events/[id]/export` resolve choice ids to labels (and emoji for avatars). Multi-select answers export as `; `-joined labels.

## Analytics (no SaaS)

| Where | What |
| --- | --- |
| `/admin/events/[id]` — **Event analytics** panel | Forms, headcount, registrations-by-day bars, breakdowns for every choice/avatar field |
| `/admin/analytics` — nav **Analytics** | Year selector, annual totals (events, registrations, headcount), top events table |

All numbers come from Supabase `registrations` / `events` queries aggregated in `src/lib/analytics.ts`.

## SQL to run

In the Supabase SQL editor, run:

`supabase/migrations/008_image_captions_choice_fields.sql`

This adds poster/donation text columns and refreshes `register_attendee` so multi-select arrays and choice ids validate correctly.
