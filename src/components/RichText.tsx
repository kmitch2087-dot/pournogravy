// Renders HTML stored by the rich text editor. Falls back gracefully for
// plain-text values (no tags).
export function RichText({
  html,
  className = "",
  inline = false,
}: {
  html: string;
  className?: string;
  // Render inline (in a <span>, paragraphs flattened to <br>) so rich-text can
  // live inside phrasing-only containers like an <h1>.
  inline?: boolean;
}) {
  const isHtml = /<[a-z][\s\S]*>/i.test(html);
  // Plain text (e.g. a textarea field) — preserve the author's line breaks.
  // Pressing Enter stores a "\n"; without `whitespace-pre-line` the browser
  // collapses it to a single space and the paragraph break is lost.
  if (!isHtml) return <span className={`whitespace-pre-line ${className}`}>{html}</span>;

  if (inline) {
    const inlineHtml = html
      .replace(/<\/p>\s*<p>/gi, "<br>")
      .replace(/<\/?p>/gi, "");
    return (
      <span
        className={`rich-text ${className}`}
        dangerouslySetInnerHTML={{ __html: inlineHtml }}
      />
    );
  }

  return (
    <div
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
