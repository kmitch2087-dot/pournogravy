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
import { ArrowUpDown, Loader2 } from "lucide-react";
import { statusClass, REQUEST_STATUSES } from "@/lib/admin";
import { toast } from "sonner";

const CustomRequests = () => {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const markContacted = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_requests")
        .update({ status: "contacted" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as contacted");
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (requests ?? [])
    .filter((r) => statusFilter === "all" || r.status === statusFilter)
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortAsc ? diff : -diff;
    });

  const detail = requests?.find((r) => r.id === selectedId);

  const updateRequest = async (patch: {
    status?: string;
    internal_notes?: string | null;
  }) => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {REQUEST_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortAsc((v) => !v)}
          className="gap-1.5"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortAsc ? "Oldest first" : "Newest first"}
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} request{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            {statusFilter === "all" ? "No custom requests yet." : `No requests with status "${statusFilter}".`}
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
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setParams({ id: r.id })}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.garment}</TableCell>
                  <TableCell><span className={statusClass(r.status)}>{r.status}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(r.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {r.status === "new" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        disabled={markContacted.isPending}
                        onClick={() => markContacted.mutate(r.id)}
                      >
                        Mark contacted
                      </Button>
                    )}
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
