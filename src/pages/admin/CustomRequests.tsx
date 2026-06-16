import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ArrowUpDown, Loader2, CheckCircle, Archive, RotateCcw } from "lucide-react";
import { statusClass, REQUEST_STATUSES } from "@/lib/admin";
import { toast } from "sonner";

type Tab = "active" | "done" | "archived";

const CustomRequests = () => {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const [tab, setTab] = useState<Tab>("active");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const sorted = (list: typeof requests) =>
    (list ?? []).slice().sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortAsc ? diff : -diff;
    });

  const active   = sorted((requests ?? []).filter((r) => !r.archived_at && r.status !== "completed"));
  const done     = sorted((requests ?? []).filter((r) => !r.archived_at && r.status === "completed"));
  const archived = sorted((requests ?? []).filter((r) => !!r.archived_at));

  const displayed = tab === "active" ? active : tab === "done" ? done : archived;
  const detail = requests?.find((r) => r.id === selectedId);

  const markDone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_requests")
        .update({ status: "completed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as done");
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_requests")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Archived");
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unarchiveRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_requests")
        .update({ archived_at: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Unarchived");
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRequest = async (patch: { status?: string; internal_notes?: string | null }) => {
    if (!selectedId) return;
    const { error } = await supabase.from("custom_requests").update(patch).eq("id", selectedId);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
    }
  };

  const sendReply = async () => {
    if (!detail || !reply.trim()) return;
    setSending(true);
    const { error } = await supabase.functions.invoke("send-notification", {
      body: {
        templateKey: "custom_request_reply",
        recipient: detail.email,
        relatedKind: "custom_request",
        relatedId: detail.id,
        variables: {
          customer_name: detail.name,
          garment: detail.garment,
          message: reply,
        },
      },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Reply queued");
    await updateRequest({ status: "contacted" });
    setReply("");
  };

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-xs font-display tracking-widest uppercase border-b-2 transition-colors ${
      tab === t
        ? "border-[#fde047] text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border">
        <button className={tabClass("active")} onClick={() => setTab("active")}>
          Active
          {active.length > 0 && (
            <span className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-sm">
              {active.length}
            </span>
          )}
        </button>
        <button className={tabClass("done")} onClick={() => setTab("done")}>
          Done
          {done.length > 0 && (
            <span className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-sm">
              {done.length}
            </span>
          )}
        </button>
        <button className={tabClass("archived")} onClick={() => setTab("archived")}>
          Archived
          {archived.length > 0 && (
            <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm">
              {archived.length}
            </span>
          )}
        </button>

        <div className="ml-auto flex items-center gap-2 pb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortAsc((v) => !v)}
            className="gap-1.5"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortAsc ? "Oldest first" : "Newest first"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {displayed.length} request{displayed.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            {tab === "active" && "No active requests."}
            {tab === "done" && "Nothing marked done yet."}
            {tab === "archived" && "Archive is empty."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Garment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setParams({ id: r.id })}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.garment}</TableCell>
                  <TableCell>
                    <span className={statusClass(r.status)}>{r.status}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(r.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 justify-end">
                      {tab !== "done" && r.status !== "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                          disabled={markDone.isPending}
                          onClick={() => markDone.mutate(r.id)}
                          title="Mark done"
                        >
                          <CheckCircle className="h-3 w-3" /> Done
                        </Button>
                      )}
                      {tab !== "archived" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                          disabled={archiveRequest.isPending}
                          onClick={() => archiveRequest.mutate(r.id)}
                          title="Archive"
                        >
                          <Archive className="h-3 w-3" /> Archive
                        </Button>
                      )}
                      {tab === "archived" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1"
                          disabled={unarchiveRequest.isPending}
                          onClick={() => unarchiveRequest.mutate(r.id)}
                          title="Unarchive"
                        >
                          <RotateCcw className="h-3 w-3" /> Unarchive
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setParams({})}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display tracking-widest">CUSTOM REQUEST</SheetTitle>
          </SheetHeader>

          {detail && (
            <div className="space-y-6 mt-6">
              <div className="space-y-2 text-sm">
                <Row label="Name" value={detail.name} />
                <Row label="Email" value={detail.email} />
                {detail.phone && <Row label="Phone" value={detail.phone} />}
                <Row label="Garment" value={detail.garment} />
                {detail.design_id && <Row label="Design ID" value={detail.design_id} />}
                {detail.design_name && <Row label="Design name" value={detail.design_name} />}
              </div>

              {detail.notes && (
                <div>
                  <h4 className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Notes from customer</h4>
                  <p className="text-sm bg-muted/30 border border-border p-3 rounded-sm whitespace-pre-wrap">{detail.notes}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Internal notes</Label>
                <Textarea
                  defaultValue={detail.internal_notes ?? ""}
                  onBlur={(e) =>
                    e.target.value !== (detail.internal_notes ?? "") &&
                    updateRequest({ internal_notes: e.target.value || null })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={detail.status} onValueChange={(v) => updateRequest({ status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REQUEST_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-1">
                {detail.status !== "completed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={() => { markDone.mutate(detail.id); setParams({}); }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Mark Done
                  </Button>
                )}
                {!detail.archived_at ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => { archiveRequest.mutate(detail.id); setParams({}); }}
                  >
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => { unarchiveRequest.mutate(detail.id); setParams({}); }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Unarchive
                  </Button>
                )}
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <Label>Send reply to customer</Label>
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={5}
                  placeholder="Type your reply…"
                />
                <Button
                  onClick={sendReply}
                  disabled={!reply.trim() || sending}
                  className="w-full bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "SEND REPLY"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right">{value}</span>
  </div>
);

export default CustomRequests;
