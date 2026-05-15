# Patch Instructions — Claude Desktop ↔ Claude Code

## What this folder is

These files are **working copies** for Claude Desktop to read and edit.  
The **real source** lives in `src/`. After Claude Desktop makes changes here,  
Claude Code (in the terminal tab) applies them to the actual codebase.

---

## File Map — shared copy → real source

| File in this folder | Real source location |
|---------------------|---------------------|
| `DropAnnouncementBar.tsx` | `src/components/DropAnnouncementBar.tsx` |
| `Index.tsx` | `src/pages/Index.tsx` |
| `Footer.tsx` | `src/components/Footer.tsx` |
| `Navbar.tsx` | `src/components/Navbar.tsx` |

---

## Component guide

### `DropAnnouncementBar.tsx`
Scrolling ticker bar rendered at the very top of every public page (above the navbar).  
Reads active merch drops from Supabase and scrolls their names/dates.  
Controlled by the `show_announcement_bar` flag on each drop in the admin.

### `Index.tsx` (Homepage)
Contains three things in one file:
- **Hero carousel** — full-screen rotating slides with intro image hold, glass card overlay, CTA buttons
- **Rotating quotes marquee** — scrolling bartender quotes below the hero
- **Featured products, email capture, etc.**

The marquee speed, quotes array, and intro hold duration are all constants near the top of the file.

### `Footer.tsx`
Standard site footer — nav links, social links, brand copy.

### `Navbar.tsx`
Top navigation bar. Also controls the **mobile offset** — the `pt-` / `top-` values  
here determine how much space pages need to clear the fixed navbar on mobile.  
If page content is hiding under the nav on mobile, this is the file to adjust.

---

## Workflow

### Claude Desktop → Claude Code patch

1. Claude Desktop edits a file in this folder
2. Paste the updated file content into Claude Code with:

```
Here's the updated [filename] from Claude Desktop — apply it to the real source:

[paste file contents]
```

Claude Code will write it to the correct `src/` path, run `npx tsc --noEmit`, and commit.

### Claude Code → Claude Desktop sync

If Claude Code changes one of these source files during a session, it will  
update the copy in `.claude/shared/` to keep them in sync.  
(Or just re-copy at the start of a Desktop session — they're cheap to duplicate.)

---

## Tech stack reminder for Claude Desktop

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** for all styling (utility classes only — no custom CSS files)
- **Framer Motion** for animations (`motion.div`, `AnimatePresence`)
- **shadcn/ui** for UI primitives (Button, Sheet, etc.)
- **lucide-react** for icons
- Brand colors: `#fde047` (yellow), `#ff1744` (red), dark background
- Brand fonts: `font-display` (headings), `font-marker` (labels/tags), `font-mono` (code/codes)

Do **not** add new npm packages — use what's already imported.  
Do **not** add inline `style=` attributes — use Tailwind classes.  
Do **not** change the Supabase client import path — always `@/integrations/supabase/client`.
