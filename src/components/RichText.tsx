// Renders HTML stored by the rich text editor. Falls back gracefully for
// plain-text values (no tags) — they render as a single <p>.
export function RichText({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  const isHtml = /<[a-z][\s\S]*>/i.test(html);
  if (!isHtml) return <span className={className}>{html}</span>;

  return (
    <div
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
