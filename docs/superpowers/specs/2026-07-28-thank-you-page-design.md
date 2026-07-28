# Thank-You / Credits Page — Design Spec

**Date:** 2026-07-28
**Author:** Kristin Mitchell (Aethyx) with Claude
**Requested by:** Adam "Opie" Oppenheimer
**Status:** Approved design — ready for implementation plan

## Goal

A public page dedicated to thanking everyone who helped make Pournogravy
possible. Opie types his own copy through the existing admin rich-text editor
and can add links inside that copy. The page ships pre-filled with generated
copy (in Opie's voice) that he can freely edit.

Headline (seeded default, editable): **"The People Who Poured Into This"**

## Non-Goals

- No per-entry structured shout-out fields (name/blurb/link slots). The
  shout-out list is a single free-form rich-text block. (Explicitly decided.)
- No new admin dashboard screen. Editing happens through the existing floating
  "Edit Page" panel (`SiteEditor`), same as every other CMS page.
- No image uploads specific to this page beyond what the CMS already supports.

## Route & Page

- **Route:** `/thank-you` (public), added to `src/App.tsx`.
- **Page component:** `src/pages/Thanks.tsx`, modeled on `src/pages/About.tsx`:
  - Dark hero band with an eyebrow label + the headline.
  - A narrative body section: intro block, then a titled shout-outs section.
  - All copy read from the CMS via `useSiteContent().getValue("thanks", …)`
    and rendered through `<RichText html={…} />`.
  - `<SEO>` block (title "Thank You", description, canonical
    `https://pournogravy.com/thank-you`).

## Content Model (`site_content` rows)

Seeded via a new migration following the pattern of
`supabase/migrations/20260525000001_site_content_expanded.sql`.

Page key: `thanks`. Each section also gets a `visible` boolean row so it appears
as a toggleable group in the "Edit Page" panel.

| Section | Key        | value_type | Seeded default (summary) |
|---------|------------|------------|--------------------------|
| `hero`  | `eyebrow`  | text       | "A round on the house"   |
| `hero`  | `headline` | text       | "The People Who Poured Into This" |
| `hero`  | `visible`  | boolean    | true |
| `intro` | `body`     | html       | Generated intro paragraph in Opie's voice |
| `intro` | `visible`  | boolean    | true |
| `crew`  | `heading`  | text       | "The Crew Behind the Bar" |
| `crew`  | `body`     | html       | Generated shout-out list with sample names + placeholder links |
| `crew`  | `visible`  | boolean    | true |

`label`, `sort_order`, and `is_published` columns are set consistent with the
existing seed rows so the fields render in a sensible order in the editor.

### Shout-out list realization

The `crew.body` html block is where Opie builds his shout-out list as free-form
rich text — one person per line/paragraph, names bolded, blurbs written however
he likes, links added inline. The seed copy demonstrates the pattern (a few
example shout-outs with linked names) so he just edits and adds. This keeps the
structured *look* (distinct intro + a titled shout-outs section) while giving
total freedom over copy and links, and it fits the existing key-value CMS with
zero new editor infrastructure.

## Editor Change — Links in `RichTextInput`

`src/components/admin/RichTextInput.tsx` currently has no link control. This is
the one genuine addition.

1. **Dependency:** add `@tiptap/extension-link` pinned to `^3.27.1` (matches the
   already-installed TipTap v3 packages).
2. **Extension config:** register `Link` with `openOnClick: false`,
   `autolink: true`, and `HTMLAttributes: { rel: "noopener noreferrer nofollow",
   target: "_blank" }` so saved anchors are safe by construction.
3. **Toolbar button:** add a link button next to the existing formatting
   controls, opening a small URL-input popover built the same way as the
   existing `ColorPicker` popover (click-outside to close). Flow: select text →
   click link → type/paste URL → Set. Include a "Remove" action that runs
   `unsetLink`. Empty/whitespace URL is a no-op.
4. **Public styling:** add `.rich-text a` rules in `src/index.css` — brand
   yellow (`#fde047`), underline, hover state — so links read as links on the
   rendered page. `RichText` already renders stored HTML via
   `dangerouslySetInnerHTML`; content is admin-authored only (RLS restricts
   `site_content` writes), consistent with existing CMS pages.

Note: only `RichTextInput` (the editor used by `SiteEditor`) gets the link
control. The simpler `RichTextEditor.tsx` is out of scope.

## CMS Wiring

- Add `"/thank-you": "thanks"` to the `PATH_TO_PAGE` map in
  `src/components/admin/SiteEditor.tsx` so the "Edit Page" panel appears for
  admins on this route and surfaces the three sections.

## Navigation (both placements)

- **Footer** (`src/components/Footer.tsx`): add a "Thank Yous" link to the
  footer link list, matching existing link markup.
- **Main nav / About area** (`src/components/Navbar.tsx`): add a link near the
  About entry, matching existing nav item markup (desktop + mobile menu).

## Generated Seed Copy (Opie's voice)

Bartender-brand voice — irreverent, warm, boozy gratitude. Drafted during
implementation; must:
- Read as something Opie would actually say.
- Give the intro a clear "thanks for being part of this" throughline.
- Lay out the shout-out pattern with 3–4 example entries (bolded name + short
  blurb + one placeholder link each) so Opie sees exactly how to add his own.
- Use obvious placeholder names/links (e.g. "@somebody", `https://example.com`)
  so nothing false ships.

## Verification

1. `npm run build` passes.
2. Visit `/thank-you` unauthenticated → seeded headline + intro + shout-out
   list render, links styled and clickable, open in new tab.
3. As admin → floating "Edit Page" button appears; panel shows Hero / Intro /
   Crew sections.
4. Edit the intro, add a link via the new toolbar button, Save → change goes
   live; the `<a>` renders with `rel="noopener noreferrer nofollow"`
   `target="_blank"`.
5. Toggle a section's visibility → section hides/shows on the public page.
6. Footer + navbar links navigate to `/thank-you`.

## Files Touched

- `supabase/migrations/2026XXXXXXXXXX_thanks_page_content.sql` (new)
- `src/pages/Thanks.tsx` (new)
- `src/App.tsx` (route)
- `src/components/admin/SiteEditor.tsx` (`PATH_TO_PAGE`)
- `src/components/admin/RichTextInput.tsx` (link extension + toolbar)
- `src/index.css` (`.rich-text a` styles)
- `src/components/Footer.tsx` (footer link)
- `src/components/Navbar.tsx` (nav link)
- `package.json` / lockfile (`@tiptap/extension-link`)
