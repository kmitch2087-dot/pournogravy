import { useState, useMemo } from "react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay,
  isToday, parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAllDrops } from "@/hooks/useActiveDrops";
import { MerchDropBuilder } from "@/components/admin/MerchDropBuilder";
import type { MerchDrop } from "@/hooks/useActiveDrops";

const STATUS_COLOR: Record<string, string> = {
  draft:     "bg-zinc-700 text-zinc-200",
  scheduled: "bg-blue-900/70 text-blue-300",
  active:    "bg-green-900/70 text-green-400",
  ended:     "bg-zinc-800 text-zinc-500",
};

const STATUS_DOT: Record<string, string> = {
  draft:     "bg-zinc-500",
  scheduled: "bg-blue-400",
  active:    "bg-green-400",
  ended:     "bg-zinc-600",
};

export default function MerchDrops() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingDrop, setEditingDrop] = useState<MerchDrop | null>(null);
  const [detailDrop, setDetailDrop] = useState<MerchDrop | null>(null);
  const [processing, setProcessing] = useState(false);

  const { data: drops = [], isLoading } = useAllDrops();
  const qc = useQueryClient();

  // ── Calendar grid ────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end   = endOfWeek(endOfMonth(currentMonth));
    const days: Date[] = [];
    let d = start;
    while (d <= end) { days.push(d); d = addDays(d, 1); }
    return days;
  }, [currentMonth]);

  const dropsOnDay = (day: Date) =>
    drops.filter((drop) => isSameDay(parseISO(drop.scheduled_drop_at), day));

  // ── Process scheduled drops manually ────────────────────
  const handleProcessDrops = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("process-merch-drops");
      if (error) throw error;
      toast.success("Scheduler ran — drops and emails processed.");
      qc.invalidateQueries({ queryKey: ["all-merch-drops"] });
      qc.invalidateQueries({ queryKey: ["active-merch-drops"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Scheduler failed");
    } finally {
      setProcessing(false);
    }
  };

  // ── Delete drop ─────────────────────────────────────────
  const handleDelete = async (drop: MerchDrop) => {
    if (!confirm(`Delete "${drop.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("merch_drops").delete().eq("id", drop.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Drop deleted");
    qc.invalidateQueries({ queryKey: ["all-merch-drops"] });
    setDetailDrop(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-widest">MERCH DROP CALENDAR</h1>
          <p className="text-xs text-muted-foreground mt-1">Schedule drops, wire ads, blast the list.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleProcessDrops}
            disabled={processing}
            className="text-xs gap-1.5"
            title="Manually run the scheduler — auto-publishes drops and sends emails that are due."
          >
            {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Run Scheduler
          </Button>
          <Button
            onClick={() => { setEditingDrop(null); setBuilderOpen(true); }}
            className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest gap-1.5"
          >
            <Plus className="h-4 w-4" /> BUILD A DROP
          </Button>
        </div>
      </div>

      {/* Summary strips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["draft","scheduled","active","ended"] as const).map((s) => (
          <div key={s} className="rounded-md border border-border p-3 bg-muted/20">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[s])} />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-marker">{s}</span>
            </div>
            <span className="font-display text-2xl">{drops.filter(d => d.status === s).length}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="rounded-md border border-border overflow-hidden bg-card">
        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-display tracking-widest text-base">{format(currentMonth, "MMMM yyyy").toUpperCase()}</span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-center py-2 text-[10px] uppercase tracking-widest text-muted-foreground font-marker">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayDrops = dropsOnDay(day);
              const inMonth  = isSameMonth(day, currentMonth);
              const today    = isToday(day);
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[90px] p-1.5 border-b border-r border-border relative",
                    !inMonth && "opacity-30",
                    today && "bg-[#fde047]/5"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium block mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                    today
                      ? "bg-[#fde047] text-black font-bold"
                      : "text-muted-foreground"
                  )}>
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5">
                    {dayDrops.map((drop) => (
                      <button
                        key={drop.id}
                        onClick={() => setDetailDrop(drop)}
                        className={cn(
                          "w-full text-left px-1.5 py-0.5 rounded-sm text-[10px] font-medium truncate flex items-center gap-1 transition hover:opacity-80",
                          STATUS_COLOR[drop.status]
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[drop.status])} />
                        {drop.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming drops list */}
      <div>
        <h2 className="font-display tracking-widest text-sm mb-3">ALL DROPS</h2>
        <div className="space-y-2">
          {drops.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground text-center py-8">No drops yet. Build your first one above.</p>
          )}
          {drops.map((drop) => (
            <button
              key={drop.id}
              onClick={() => setDetailDrop(drop)}
              className="w-full flex items-center gap-4 p-3 rounded-md border border-border bg-muted/20 hover:bg-muted/40 transition text-left"
            >
              {drop.flyer_url && (
                <img src={drop.flyer_url} alt="" className="h-10 w-10 object-cover rounded-sm shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{drop.name}</p>
                <p className="text-xs text-muted-foreground">
                  🔥 Drop: {format(parseISO(drop.scheduled_drop_at), "MMM d, yyyy h:mm a")}
                  {drop.ad_launch_at && ` · 📣 Ads: ${format(parseISO(drop.ad_launch_at), "MMM d")}`}
                </p>
              </div>
              <Badge className={cn("text-[10px] font-marker tracking-wider shrink-0", STATUS_COLOR[drop.status])}>
                {drop.status}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* ── Detail popup ── */}
      <Dialog open={!!detailDrop} onOpenChange={(v) => !v && setDetailDrop(null)}>
        {detailDrop && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="font-display tracking-widest text-lg truncate">
                    {detailDrop.name.toUpperCase()}
                  </DialogTitle>
                  <Badge className={cn("mt-1.5 text-[10px] font-marker tracking-wider", STATUS_COLOR[detailDrop.status])}>
                    {detailDrop.status}
                  </Badge>
                </div>
                {detailDrop.flyer_url && (
                  <img src={detailDrop.flyer_url} alt="Flyer" className="h-16 w-16 object-cover rounded-md shrink-0" />
                )}
              </div>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              {detailDrop.description && (
                <p className="text-muted-foreground text-xs">{detailDrop.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <InfoBlock label="🔥 Drop Date" value={format(parseISO(detailDrop.scheduled_drop_at), "MMM d, yyyy h:mm a")} />
                <InfoBlock label="📣 Ad Launch" value={detailDrop.ad_launch_at ? format(parseISO(detailDrop.ad_launch_at), "MMM d, yyyy h:mm a") : "Same as drop"} />
              </div>

              {detailDrop.teaser_blurb && (
                <div className="p-3 rounded-md bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground font-marker tracking-wider uppercase mb-1">Teaser</p>
                  <p className="text-sm">{detailDrop.teaser_blurb}</p>
                </div>
              )}

              {/* Ads */}
              <div className="space-y-1.5">
                <p className="text-xs font-marker tracking-wider uppercase text-muted-foreground">Ad Placements</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "show_announcement_bar",  label: "Announcement Bar" },
                    { key: "show_hero_banner",        label: "Hero Banner" },
                    { key: "show_featured_section",   label: "Featured Section" },
                    { key: "show_shop_banner",        label: "Shop Banner" },
                  ].map(({ key, label }) => (
                    <span
                      key={key}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border font-marker tracking-wider",
                        (detailDrop as Record<string, unknown>)[key]
                          ? "border-green-700 text-green-400 bg-green-900/20"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {(detailDrop as Record<string, unknown>)[key] ? "✓" : "✗"} {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tag */}
              {detailDrop.tag_type !== "none" && (
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground font-marker tracking-wider uppercase">Tag:</p>
                  {detailDrop.tag_type === "stamp" ? (
                    <div className="bg-[#fde047] text-black px-3 py-1 text-sm font-marker tracking-wider stamp-rotate inline-block">
                      {detailDrop.tag_text || "HOT DROP"}
                    </div>
                  ) : (
                    <span className="font-marker text-xl text-[#ff1744] drop-shadow-[0_0_8px_rgba(255,23,68,0.7)]">
                      {detailDrop.tag_text || "NEW DROP"}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>📧 Email {detailDrop.email_sent ? "✅ Sent" : "⏳ Pending"}</span>
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(detailDrop)}
                className="text-xs"
              >
                Delete
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => setDetailDrop(null)}>Close</Button>
              <Button
                size="sm"
                className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest"
                onClick={() => {
                  setEditingDrop(detailDrop);
                  setDetailDrop(null);
                  setBuilderOpen(true);
                }}
              >
                EDIT DROP
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Builder ── */}
      <MerchDropBuilder
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditingDrop(null); }}
        editingDrop={editingDrop}
      />
    </div>
  );
}

const InfoBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] text-muted-foreground font-marker tracking-wider uppercase">{label}</p>
    <p className="text-xs font-medium">{value}</p>
  </div>
);
