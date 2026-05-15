import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Subscriber {
  id: string;
  email: string;
  source: string;
  created_at: string;
}

const Subscribers = () => {
  const { data: subscribers = [], isLoading } = useQuery<Subscriber[]>({
    queryKey: ["email-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_subscribers")
        .select("id, email, source, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const exportCSV = () => {
    const rows = [
      ["Email", "Source", "Subscribed"],
      ...subscribers.map((s) => [
        s.email,
        s.source,
        new Date(s.created_at).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pournogravy-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group by week for sparkline data (last 8 weeks)
  const weeklyData = (() => {
    const weeks: Record<string, number> = {};
    const now = Date.now();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
      weeks[d.toISOString().slice(0, 10)] = 0;
    }
    for (const s of subscribers) {
      const week = new Date(
        Math.floor(new Date(s.created_at).getTime() / (7 * 24 * 60 * 60 * 1000)) * (7 * 24 * 60 * 60 * 1000)
      ).toISOString().slice(0, 10);
      if (week in weeks) weeks[week]++;
    }
    return Object.values(weeks);
  })();

  const maxWeek = Math.max(...weeklyData, 1);
  const recentCount = subscribers.filter(
    (s) => Date.now() - new Date(s.created_at).getTime() < 30 * 24 * 60 * 60 * 1000
  ).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-[#fde047]" />
            <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase">Total</p>
          </div>
          <p className="font-display text-3xl tracking-wider text-[#fde047]">{subscribers.length}</p>
        </div>
        <div className="border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase">Last 30 days</p>
          </div>
          <p className="font-display text-3xl tracking-wider text-green-400">{recentCount}</p>
        </div>
        {/* Sparkline */}
        <div className="border border-border bg-card p-5 col-span-2 md:col-span-1">
          <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase mb-3">8-week trend</p>
          <div className="flex items-end gap-1 h-10">
            {weeklyData.map((v, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${(v / maxWeek) * 100}%` }}
                transition={{ delay: i * 0.05 }}
                className="flex-1 bg-[#fde047]/60 rounded-sm min-h-[2px]"
              />
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="border border-border bg-card">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <Mail className="h-4 w-4 text-[#fde047]" />
          <h2 className="font-display tracking-widest text-sm flex-1">EMAIL SUBSCRIBERS</h2>
          {subscribers.length > 0 && (
            <Button variant="outline" size="sm" className="h-7 text-xs font-display tracking-widest gap-1.5" onClick={exportCSV}>
              <Download className="h-3 w-3" />Export CSV
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : subscribers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-marker text-muted-foreground italic">No subscribers yet.</p>
            <p className="text-xs text-muted-foreground mt-2">Email signups from the homepage will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {subscribers.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <p className="text-sm truncate">{s.email}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[10px] text-muted-foreground font-marker tracking-widest uppercase">{s.source}</span>
                  <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscribers;
