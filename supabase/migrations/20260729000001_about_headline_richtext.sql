-- ─── About hero headline → rich text (so any word can get the red glow) ────────
-- The headline was a plain-text field. Convert it to html and seed the default
-- markup: "A BAR AT" keeps the red marker flourish on "2AM". Opie can now select
-- any word/phrase in the editor and toggle the glow (span.marker-flourish).

UPDATE site_content
SET value      = '<p>BORN BEHIND</p><p>A BAR AT <span class="marker-flourish">2AM</span></p>',
    value_type = 'html'
WHERE page = 'about' AND section = 'hero' AND key = 'headline';
