# Client Edit Requests

This folder is the designated home for Opie's edit notes and site feedback.

## How it works

Opie submits notes via the yellow floating **Edit Notes** bubble visible on every page
of the site when he is logged in as admin. Notes are permanently saved in Supabase
(`client_edit_requests` table) and Kristin receives an email notification on each save.

All notes are viewable in the admin panel under **Client Edit Requests**.

## Ground rules

- **Nothing in here gets acted on automatically.** Notes are logged only.
- Kristin reviews the notes and decides what to implement, ask about, or defer.
- When Kristin asks Claude to act on a specific note, that is when implementation begins.

## Exported snapshots (if any)

If Kristin ever exports a snapshot of the notes for planning or reference, those files
will live here. Snapshots are point-in-time — the live source of truth is always Supabase.
