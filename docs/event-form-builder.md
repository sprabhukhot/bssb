# Event form builder, image captions, and analytics

## Image captions (poster & donation)

On **Edit event**, each image upload has optional **heading** and **body** fields:

| Column | UI |
| --- | --- |
| `poster_heading` / `poster_body` | Shown under the event poster on `/e/[slug]` |
| `donation_heading` / `donation_body` | Shown under the donation/QR image |

Public posters and donation images use the full content width (large on desktop, responsive on mobile) and keep aspect ratio (`object-fit: contain` — no stretch).

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

## Entries, CSV, and Excel

On `/admin/events/[id]` under **Entries**:

- Click a table row (or mobile card) to open a **detail view** of every answer.
- **Export CSV** → `/admin/events/[id]/export`
- **Export Excel** → `/admin/events/[id]/export.xlsx` (`.xlsx` via ExcelJS)

Choice ids resolve to labels (and emoji for avatars). Multi-select answers export as `; `-joined labels.

## Analytics (no SaaS)

Lightweight SVG charts — no paid analytics product.

| Where | What |
| --- | --- |
| `/admin/events/[id]` — **Analytics** | Forms, headcount, registrations trend chart, choice/avatar breakdowns |
| `/admin/analytics` — nav **Analytics** | Year selector, monthly trend, events-by-registrations chart, rollup table |

Aggregated in `src/lib/analytics.ts` from Supabase `registrations` / `events`.

## SQL to run

In the Supabase SQL editor, run:

`supabase/migrations/008_image_captions_choice_fields.sql`

This adds poster/donation text columns and refreshes `register_attendee` so multi-select arrays and choice ids validate correctly.

## Registration confirmation email

After a successful registration the server sends a confirmation via **Resend** (not Supabase Auth SMTP). Set Netlify `RESEND_API_KEY`. Default From `beth.t@example.com` can only reach the Resend account owner. To email any registrant, verify `bssb.cz` or `events.bssb.cz` in Resend and set `RESEND_FROM=BSSB Events <noreply@events.bssb.cz>`. If the key is missing or send fails, registration still succeeds.
