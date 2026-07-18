# Product page: Heading Note + Style-switcher improvements — Design

**Date:** 2026-07-18
**Author:** Kristin Mitchell (with Claude)
**Status:** Draft — awaiting review

## Overview

Four related changes to the product experience, all in the admin product editor
(`ProductEdit.tsx`) and the public product page (`ProductDetail.tsx`):

- **A. Heading Note** — a new optional rich-text block rendered directly under the
  product title, for messages like *"Multiple designs available below."* Default off.
- **B. Paragraph-break display fix** — pressing Enter in the rich-text editors already
  creates real `<p>` paragraphs, but they collapse together on the live page. Fix the
  display so paragraph breaks are visible everywhere rich text is shown.
- **C. Style-button labels** — products in a style group currently derive their switcher
  labels by stripping a common name prefix, which produces messy/empty labels. Add an
  explicit per-product **Style Label** field.
- **D. Mobile style-compare** — on mobile, comparing styles in a group is tedious because
  the image is not sticky (desktop already is). Collapse the copy on mobile and stop the
  jump-to-top on within-group style switches, so the image stays near the style buttons.

Scope note: only DB-backed products are affected (the static `src/data/products.ts` seed
is untouched — it is already shadowed by the DB for these fields).

---

## A. Heading Note

### Behavior (public page)
A new optional rich-text block rendered on `ProductDetail.tsx` in this order:

```
<h1> product name
Heading Note        ← NEW (only if toggled on AND has content)
⭐ rating / reviews
yellow subheading (humor)
description …
```

- Default **off**. Renders only when its visibility flag is on **and** it has content.
- Fully manual — no auto-detection of female/alternate variants. Opie toggles it on per
  product and types the message (e.g. "Multiple designs available below").
- Rich text (bold/italic/lists), same editor as the other copy fields.

### Admin editor
A dedicated, **non-draggable** block pinned at the **top of the "COPY" card**, above the
reorderable sections, so it visually mirrors "right under the heading." It has:
- Label: **"Heading Note"** with a one-line helper ("Optional line shown directly under
  the product title — e.g. 'Multiple designs available below.'").
- The same on/off toggle style used by the existing `DraggableSection` visibility toggles,
  **defaulting to off**.
- A `RichTextEditor` (existing Tiptap component).

### Storage
- **New column** `products.heading_note text` (stores HTML).
- **Visibility** reuses the existing `products.section_visibility jsonb` map with a new key
  `headingNote`. Because this field defaults **off**, the render check is
  `section_visibility.headingNote === true` (opt-in), unlike the other sections which are
  `!== false` (opt-out).

Rejected alternatives:
- Reusing the existing unused `subheading` column — rejected; the public page already uses
  `subheading || humor` to drive the yellow italic line, so overloading it would collide.
- Adding it to the reorderable `sectionOrder` COPY list — rejected; it must be pinned
  directly under the heading, not draggable, and default-off.

---

## B. Paragraph-break display fix

### Root cause
Tiptap's `StarterKit` already inserts a real `<p>` on Enter (verified). The problem is the
**live page**: `description`, `longDescription`, and `badAdvice` are rendered through a bare
`dangerouslySetInnerHTML` div that is **not** wrapped in the `.rich-text` class. Tailwind's
preflight reset zeroes `<p>` margins there, so consecutive paragraphs render with no gap and
visually collapse into one block. `src/index.css` already defines `.rich-text p { margin-bottom: 0.5em }`.

### Fix
Wrap every raw-HTML render on the product page in the `.rich-text` class (or route it through
the existing `RichText` component, which already applies that class). This fixes:
- the new **Heading Note** (A),
- and retroactively fixes the existing **description**, **long description**, and **bad
  advice** sections — so every Enter now shows a visible paragraph break on the live site.

No change to the editor keymap or to Tiptap config.

---

## C. Style-button labels

### Problem
`ProductDetail.tsx` derives switcher labels via `shortLabel()`, which strips the longest
common prefix across the group's product names. When names don't share a clean prefix (or one
name fully contains another), this yields inconsistent or empty labels.

### Fix
- **New column** `products.style_label text` (nullable) — a short admin-entered label such as
  `Men's`, `Women's`, `V-Neck`.
- **Admin:** add a "Style Label" input to the existing **STYLE GROUP** card in `ProductEdit.tsx`
  (short text input, e.g. `maxLength` ~24, with helper text explaining it names this product's
  button in the on-page style switcher).
- **Public:** the style switcher uses `style_label` when present, falling back to the current
  `shortLabel(name)` derivation when it's blank (so nothing regresses for existing groups until
  labels are filled in).
- The group-members query (`ProductDetail.tsx:117`) must also `select` `style_label`, and the
  `GroupMember` interface gains `style_label: string | null`.

---

## D. Mobile style-compare (collapse copy + no jump-to-top)

Desktop is already fine (`ProductDetail.tsx:377` — `md:sticky md:top-24` keeps the image in
view). This section is **mobile-only** (`< md`).

### D1. Collapse copy on mobile (grouped products only)
- Wrap the copy sections block (`ProductDetail.tsx:496–537`, the `sectionOrder.map`) in a
  collapsible container.
- On mobile, when the product **is part of a style group** (`groupMembers.length > 0`), the copy
  is **collapsed by default** behind a "Show product details ⌄ / Hide details ⌃" toggle, so the
  image, style buttons, and checkout sit close together.
- On desktop, and for non-grouped products on mobile, the copy renders expanded as today (no
  collapse UI, no regression).
- Content stays in the DOM (collapsed via state/CSS), so SEO and share previews are unaffected.

### D2. Suppress jump-to-top on within-group style switch
Two forced scroll-to-tops fire on every product switch and must be suppressed **only** for a
within-group style switch:
1. Global `ScrollToTop` — `App.tsx:93` (`window.scrollTo(0,0)` on `pathname` change).
2. Local reset effect — `ProductDetail.tsx:151-157` (`window.scrollTo({top:0})` on `id` change).

Mechanism:
- The style-switch button calls `navigate(\`/product/\${m.slug}\`, { state: { styleSwitch: true } })`.
- `App.tsx ScrollToTop` reads `useLocation().state`; if `state?.styleSwitch` is true, skip the
  scroll.
- `ProductDetail.tsx` reset effect reads `location.state?.styleSwitch`; if true, skip the
  `window.scrollTo` (still reset `selectedSize`, `activeImage`, etc.).
- Normal navigation (from shop grid, breadcrumb, etc.) carries no such state, so scroll-to-top
  behaves exactly as before.

Net effect on mobile: with copy collapsed, tapping a style leaves the user right at the style
buttons and updates the image just above — no scroll-up/scroll-down dance. On desktop the sticky
image already shows the change; suppressing the top-jump also makes desktop switching feel
in-place.

---

## Data model changes

Single migration `supabase/migrations/2026071800000X_product_heading_note_style_label.sql`:

```sql
alter table public.products
  add column if not exists heading_note text,
  add column if not exists style_label  text;
```

`section_visibility` already exists (jsonb) — no schema change; the `headingNote` key is added
at write time by the admin form.

`src/lib/database.types.ts` — add `heading_note` and `style_label` to the `products`
Row / Insert / Update types.

---

## File-by-file changes

| File | Change |
|------|--------|
| `supabase/migrations/…_product_heading_note_style_label.sql` | Add `heading_note`, `style_label` columns |
| `src/lib/database.types.ts` | Add both columns to products Row/Insert/Update |
| `src/lib/productSource.ts` | Add `heading_note` + `style_label` to the DB row type; map to `headingNote` and `styleLabel` on the product object |
| `src/pages/admin/ProductEdit.tsx` | Form state (`headingNote`, `styleLabel`); load from product; save payload; new Heading Note editor block + toggle at top of COPY card; Style Label input in STYLE GROUP card. Store visibility in `section_visibility.headingNote` (default false). |
| `src/pages/ProductDetail.tsx` | Render Heading Note under `<h1>` (opt-in visibility). Wrap raw-HTML renders in `.rich-text`. Style switcher uses `style_label` fallback to `shortLabel`. Group query selects `style_label`; `GroupMember` type updated. Mobile collapsible copy for grouped products. Style-switch navigate passes `state.styleSwitch`; reset effect honors it. |
| `src/App.tsx` | `ScrollToTop` honors `location.state.styleSwitch` |

---

## Decisions / edge cases

- **Heading Note default off** → render guard is opt-in (`=== true`), all other sections stay
  opt-out (`!== false`).
- **Empty style label** → switcher falls back to the existing prefix-strip derivation, so
  current groups keep working before labels are entered.
- **Collapse scope** → only mobile + grouped products collapse by default. Single-style products
  and all desktop keep full copy visible (no reading regression).
- **`styleSwitch` state leakage** → only the in-group switcher passes it; every other entry point
  (shop grid, breadcrumb, direct link, back button to a fresh entry) does not, so global
  scroll-to-top is unchanged for normal navigation.
- **Preview mode** (`?preview=1`) → group query is disabled in preview (`enabled: … && !isPreview`),
  so the switcher/collapse simply don't appear in preview; Heading Note still renders from the
  preview payload if present.

---

## Out of scope

- No auto-detection of female/alternate variants (fully manual per user decision).
- No changes to the reorderable COPY section order or the existing fields' semantics.
- No modal/pop-up style quick-view (collapse approach chosen instead).
- No changes to the static `src/data/products.ts` seed.
- No change to desktop layout beyond the (beneficial) in-place feel from D2.

---

## Verification plan

1. **Migration** applies cleanly; both columns present on `products`.
2. **Admin:** Heading Note block appears at top of COPY, default toggled off; typing + toggling on
   + Save persists `heading_note` and `section_visibility.headingNote=true`. Style Label input in
   STYLE GROUP card persists `style_label`.
3. **Public — Heading Note:** with toggle on + content, renders under `<h1>`, above rating and
   yellow subheading; with toggle off, absent.
4. **Public — paragraph fix:** a description/heading-note with two paragraphs shows a visible gap
   between them on the live page (previously collapsed).
5. **Public — labels:** grouped products show the entered Style Label on each button; blank label
   falls back to derived label.
6. **Public — mobile (≤ md):** for a grouped product, copy is collapsed by default with a working
   Show/Hide toggle; tapping another style does **not** jump to the top, and the image updates just
   above the buttons. Desktop unchanged (sticky image, full copy).
7. **Regression:** navigating to a product from the shop grid / breadcrumb still scrolls to top as
   before.
