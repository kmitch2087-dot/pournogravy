// Renders the `format:"json"` shape returned by the `generate-report` edge
// function: { title, period:{start,end}, columns, rows, totals, notes }.
// Styling matches the SectionCard/table look used across the Finances tabs
// (see src/pages/admin/Financials.tsx).

export interface ReportData {
  title: string;
  period: { start: string; end: string };
  columns: string[];
  rows: string[][];
  totals: Record<string, string>;
  notes: string[];
}

/** Simple per-cell heuristic: does this look like a number/currency value? */
function isNumericCell(value: string): boolean {
  const v = value.trim();
  if (!v || v === "—") return false;
  return /^\(?-?\$?[\d,]+(\.\d+)?%?\)?$/.test(v);
}

/** A column is right-aligned if every non-empty cell in it looks numeric. */
function columnIsNumeric(rows: string[][], colIndex: number): boolean {
  const cells = rows
    .map((r) => r[colIndex])
    .filter((c): c is string => c !== undefined && c.trim() !== "");
  if (cells.length === 0) return false;
  return cells.every(isNumericCell);
}

export function ReportTable({ data }: { data: ReportData }) {
  const { title, period, columns, rows, totals, notes } = data;
  const numericCols = columns.map((_, i) => columnIsNumeric(rows, i));
  const totalsEntries = Object.entries(totals ?? {});

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase mb-1">
        {title}
      </h2>
      <p className="text-xs text-muted-foreground mb-5">
        {period.start} – {period.end}
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No data for this period.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {columns.map((col, i) => (
                  <th
                    key={col + i}
                    className={`text-xs text-muted-foreground font-display tracking-widest uppercase pb-3 pr-4 last:pr-0 ${
                      numericCols[i] ? "text-right" : "text-left"
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-muted/30 transition-colors">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`py-2.5 pr-4 last:pr-0 ${
                        numericCols[ci]
                          ? "text-right font-mono tabular-nums"
                          : "text-left text-muted-foreground"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalsEntries.length > 0 && (
        <div className="mt-4 pt-4 border-t-2 border-border space-y-1.5">
          {totalsEntries.map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm font-semibold">
              <span>{label}</span>
              <span className="font-mono tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      )}

      {notes.length > 0 && (
        <div className="mt-4 space-y-1">
          {notes.map((note, i) => (
            <p key={i} className="text-xs text-muted-foreground/70">
              {note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReportTable;
