/** Convert array-of-objects to CSV string */
export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

/** Trigger a CSV download in the browser */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Format cents to dollar string for CSV */
export function centsToStr(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Open a print window with the provided HTML content */
export function printHTML(html: string, title: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head>
    <title>${title}</title>
    <style>
      body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; max-width: 720px; margin: 40px auto; }
      h1 { font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
      h2 { font-size: 14px; margin-top: 24px; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th { background: #f0f0f0; text-align: left; padding: 6px 8px; border-bottom: 1px solid #ccc; font-size: 11px; }
      td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
      .right { text-align: right; }
      .total { font-weight: bold; background: #f9f9f9; }
      .note { background: #fffbe6; border-left: 3px solid #f0c040; padding: 8px 12px; margin: 8px 0; font-size: 11px; }
      footer { margin-top: 40px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
      @media print { body { margin: 20px; } }
    </style>
  </head><body>${html}<script>window.onload=()=>{ setTimeout(()=>{ window.print(); window.close(); }, 200); }<\/script></body></html>`);
  w.document.close();
}
