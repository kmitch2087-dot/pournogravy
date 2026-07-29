// Renders HTML stored by the rich text editor. Falls back gracefully for
// plain-text values (no tags).
export function RichText({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  const isHtml = /<[a-z][\s\S]*>/i.test(html);
  // Plain text (e.g. a textarea field) — preserve the author's line breaks.
  // Pressing Enter stores a "\n"; without `whitespace-pre-line` the browser
  // collapses it to a single space and the paragraph break is lost.
  if (!isHtml) return <span className={`whitespace-pre-line ${className}`}>{html}</span>;

  return (
    <div
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
