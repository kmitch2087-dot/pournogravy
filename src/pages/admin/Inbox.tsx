import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Mail, MailOpen, Send, Loader2, RefreshCw, ArrowLeft, User,
  Inbox as InboxIcon, Clock, Trash2, PenLine, RotateCcw,
  AlertCircle, Users, Download, TrendingUp, CheckCircle, Archive,
  ArrowUpDown, Star, ShoppingBag,
} from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import EmailTemplates from "./EmailTemplates";
import { statusClass, REQUEST_STATUSES } from "@/lib/admin";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InboxMessage {
  id: string;
  created_at: string;
  from_email: string;
  from_name: string | null;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  message_id: string | null;
  in_reply_to: string | null;
  thread_id: string | null;
  parent_id: string | null;
  kind: "inbound" | "reply";
  status: "unread" | "read" | "replied";
  deleted_at: string | null;
}

interface Thread {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  latestAt: string;
  hasUnread: boolean;
  messages: InboxMessage[];
  inboundCount: number;
}

interface SentNotification {
  id: string;
  recipient: string;
  template_key: string | null;
  subject: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  error: string | null;
  body_html: string;
  body_text: string;
}

interface EmailTemplate {
  key: string;
  name: string;
  variables: string[];
}

type MailTab = "inbox" | "sent" | "trash" | "templates" | "custom-requests" | "subscribers";

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

const statusColor = (status: string) => {
  switch (status) {
    case "sent":              return "text-green-500 border-green-500/30";
    case "failed":            return "text-red-500 border-red-500/30";
    case "queued_no_sender":  return "text-amber-500 border-amber-500/30";
    default:                  return "text-muted-foreground";
  }
};

// ── MessageBubble ─────────────────────────────────────────────────────────────

const MessageBubble = ({ msg }: { msg: InboxMessage }) => {
  const isReply = msg.kind === "reply";
  return (
    <div className={`flex flex-col ${isReply ? "items-end" : "items-start"}`}>
      <div className={`max-w-[85%] rounded-sm p-3 text-sm leading-relaxed ${
        isReply
          ? "bg-[#fde047]/15 border border-[#fde047]/30 text-foreground"
          : "bg-muted/50 border border-border text-foreground"
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] font-marker tracking-[0.2em] uppercase ${isReply ? "text-[#fde047]" : "text-muted-foreground"}`}>
            {isReply ? "Opie — POURnogravy" : (msg.from_name || msg.from_email)}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {format(new Date(msg.created_at), "MMM d, h:mm a")}
          </span>
        </div>
        <p className="whitespace-pre-wrap">{msg.body_text || "(no content)"}</p>
      </div>
    </div>
  );
};

// ── InboxTab ──────────────────────────────────────────────────────────────────

const InboxTab = () => {
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  const { data: messages = [], isLoading, refetch } = useQuery<InboxMessage[]>({
    queryKey: ["inbox-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLastSynced(new Date());
      return (data ?? []) as InboxMessage[];
    },
  });

  // Auto-refresh every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refetch]);

  const threads = useMemo<Thread[]>(() => {
    const map = new Map<string, InboxMessage[]>();
    for (const msg of messages) {
      const tid = msg.thread_id ?? msg.id;
      if (!map.has(tid)) map.set(tid, []);
      map.get(tid)!.push(msg);
    }
    return [...map.entries()]
      .map(([tid, msgs]) => {
        const sorted = [...msgs].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        const inbound = sorted.filter((m) => m.kind === "inbound");
        const first = inbound[0] ?? sorted[0];
        const latest = sorted[sorted.length - 1];
        return {
          id: tid,
          subject: first.subject,
          fromEmail: first.from_email,
          fromName: first.from_name,
          latestAt: latest.created_at,
          hasUnread: msgs.some((m) => m.status === "unread" && m.kind === "inbound"),
          messages: sorted,
          inboundCount: inbound.length,
        };
      })
      .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
  }, [messages]);

  const allIds = useMemo(() => threads.map((t) => t.id), [threads]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const selectedThread = threads.find((t) => t.id === selectedThreadId) ?? null;

  const handleSelectThread = async (thread: Thread) => {
    setSelectedThreadId(thread.id);
    setShowThread(true);
    setReplyText("");
    const unreadIds = thread.messages
      .filter((m) => m.status === "unread" && m.kind === "inbound")
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      await supabase.from("inbox_messages").update({ status: "read" }).in("id", unreadIds);
      queryClient.invalidateQueries({ queryKey: ["inbox-unread-count"] });
      refetch();
    }
  };

  const softDeleteThread = async (thread: Thread) => {
    const ids = thread.messages.map((m) => m.id);
    const { error } = await supabase
      .from("inbox_messages")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);
    if (error) toast.error(error.message);
    else {
      if (selectedThreadId === thread.id) {
        setSelectedThreadId(null);
        setShowThread(false);
      }
      setSelectedIds((prev) => { const s = new Set(prev); s.delete(thread.id); return s; });
      refetch();
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    const threadsToDelete = threads.filter((t) => selectedIds.has(t.id));
    const ids = threadsToDelete.flatMap((t) => t.messages.map((m) => m.id));
    const { error } = await supabase
      .from("inbox_messages")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);
    setDeleting(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`${threadsToDelete.length} conversation(s) moved to Trash.`);
      if (selectedThreadId && selectedIds.has(selectedThreadId)) {
        setSelectedThreadId(null);
        setShowThread(false);
      }
      setSelectedIds(new Set());
      refetch();
    }
  };

  const handleReply = async () => {
    if (!selectedThread || !replyText.trim()) return;
    setSending(true);
    try {
      const latestInbound = [...selectedThread.messages].reverse().find((m) => m.kind === "inbound");
      if (!latestInbound) return;
      const { error } = await supabase.functions.invoke("send-reply", {
        body: {
          to: latestInbound.from_email,
          subject: selectedThread.subject.startsWith("Re:")
            ? selectedThread.subject
            : `Re: ${selectedThread.subject}`,
          body: replyText.trim(),
          threadId: selectedThread.id,
          parentId: latestInbound.id,
        },
      });
      if (error) throw error;
      toast.success("Reply sent.");
      setReplyText("");
      refetch();
    } catch {
      toast.error("Failed to send. Check that RESEND_API_KEY is configured.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Thread list */}
      <div className={`flex flex-col border-r border-border bg-card w-full md:w-72 lg:w-80 shrink-0 ${showThread ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border h-11 gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => {
                if (checked) setSelectedIds(new Set(allIds));
                else setSelectedIds(new Set());
              }}
            />
            {someSelected && (
              <span className="text-[10px] text-muted-foreground">{selectedIds.size} selected</span>
            )}
          </label>
          <div className="flex items-center gap-1 ml-auto">
            {someSelected && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                onClick={handleDeleteSelected}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => refetch()}
              title={`Last synced: ${formatDistanceToNow(lastSynced, { addSuffix: true })}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        {/* Last synced indicator */}
        <div className="px-4 py-1 border-b border-border/50 bg-muted/20 shrink-0">
          <span className="text-[10px] text-muted-foreground">
            Last synced: {formatDistanceToNow(lastSynced, { addSuffix: true })}
          </span>
        </div>

        {/* Thread rows */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <InboxIcon className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-display tracking-widest text-sm mb-1">INBOX EMPTY</p>
              <p className="text-xs max-w-xs">When customers email opie@pournogravy.com, their messages will appear here.</p>
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                className={`group relative flex items-start gap-2 border-b border-border/50 hover:bg-muted/30 transition-colors ${
                  selectedThreadId === thread.id ? "bg-muted/50 border-l-2 border-l-[#fde047]" : ""
                } ${selectedIds.has(thread.id) ? "bg-[#fde047]/5" : ""}`}
              >
                {/* Checkbox */}
                <div className="pl-3 pt-3.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(thread.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds((prev) => {
                        const s = new Set(prev);
                        if (checked) s.add(thread.id);
                        else s.delete(thread.id);
                        return s;
                      });
                    }}
                  />
                </div>

                {/* Thread summary */}
                <button
                  className="flex-1 text-left px-2 py-3 min-w-0"
                  onClick={() => handleSelectThread(thread)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {thread.hasUnread
                        ? <Mail className="h-3.5 w-3.5 text-[#fde047] shrink-0" />
                        : <MailOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      <span className={`text-xs truncate ${thread.hasUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {thread.fromName || thread.fromEmail}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{formatDate(thread.latestAt)}</span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${thread.hasUnread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {thread.subject}
                  </p>
                  {thread.inboundCount > 1 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{thread.inboundCount} messages</p>
                  )}
                </button>

                {/* Trash icon */}
                <button
                  className="shrink-0 mt-3 pr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Move to Trash"
                  onClick={(e) => { e.stopPropagation(); softDeleteThread(thread); }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Thread view */}
      <div className={`flex-1 flex flex-col min-w-0 ${showThread ? "flex" : "hidden md:flex"}`}>
        {selectedThread ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border h-12 shrink-0">
              <Button variant="ghost" size="icon" className="md:hidden h-7 w-7" onClick={() => setShowThread(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedThread.subject}</p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedThread.fromName
                    ? `${selectedThread.fromName} · ${selectedThread.fromEmail}`
                    : selectedThread.fromEmail}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] shrink-0 ${selectedThread.hasUnread ? "border-[#fde047]/40 text-[#fde047]" : "text-muted-foreground"}`}
              >
                {selectedThread.messages[selectedThread.messages.length - 1].status}
              </Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedThread.messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
            </div>
            <Separator />
            <div className="p-4 bg-card shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Replying as <strong>opie@pournogravy.com</strong></span>
              </div>
              <Textarea
                placeholder="Type your reply…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="resize-y text-sm mb-2 min-h-[120px] max-h-[400px] overflow-y-auto"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply();
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">⌘ + Enter to send</span>
                <Button
                  onClick={handleReply}
                  disabled={!replyText.trim() || sending}
                  className="bg-[#fde047] text-black hover:bg-[#fde047]/80 font-medium gap-2 h-8 text-xs"
                >
                  {sending
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                    : <><Send className="h-3.5 w-3.5" /> Send Reply</>}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Clock className="h-10 w-10 opacity-20" />
            <p className="text-sm">Select a message to read</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── SentTab ───────────────────────────────────────────────────────────────────

const SentTab = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data: sent = [], isLoading, refetch } = useQuery<SentNotification[]>({
    queryKey: ["sent-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, recipient, template_key, subject, status, created_at, sent_at, error, body_html, body_text")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SentNotification[];
    },
  });

  const selected = sent.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* List panel */}
      <div className={`flex flex-col border-r border-border bg-card w-full md:w-72 lg:w-80 shrink-0 ${showDetail ? "hidden md:flex" : "flex"}`}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-border h-11 shrink-0">
          <span className="font-display tracking-widest text-xs text-muted-foreground">SENT</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sent.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <Send className="h-10 w-10 opacity-20" />
              <p className="text-sm">No sent messages yet.</p>
            </div>
          ) : (
            sent.map((n) => (
              <button
                key={n.id}
                className={`w-full text-left flex flex-col gap-0.5 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors ${
                  selectedId === n.id ? "bg-muted/50 border-l-2 border-l-[#fde047]" : ""
                }`}
                onClick={() => { setSelectedId(n.id); setShowDetail(true); }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate text-foreground">{n.recipient}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(n.created_at)}</span>
                </div>
                <p className="text-xs truncate text-muted-foreground">{n.subject || "(no subject)"}</p>
                <Badge variant="outline" className={`text-[10px] w-fit mt-0.5 ${statusColor(n.status)}`}>
                  {n.status}
                </Badge>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className={`flex-1 flex flex-col min-w-0 ${showDetail ? "flex" : "hidden md:flex"}`}>
        {selected ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border h-12 shrink-0">
              <Button variant="ghost" size="icon" className="md:hidden h-7 w-7" onClick={() => setShowDetail(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selected.subject || "(no subject)"}</p>
                <p className="text-[10px] text-muted-foreground">To: {selected.recipient}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColor(selected.status)}`}>
                {selected.status}
              </Badge>
            </div>

            {/* Meta */}
            <div className="px-4 py-3 border-b border-border bg-muted/20 text-xs space-y-1 shrink-0">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-16 shrink-0">From:</span>
                <span>opie@pournogravy.com</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-16 shrink-0">To:</span>
                <span>{selected.recipient}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-16 shrink-0">Date:</span>
                <span>{format(new Date(selected.sent_at ?? selected.created_at), "MMMM d, yyyy h:mm a")}</span>
              </div>
              {selected.template_key && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">Template:</span>
                  <span className="font-mono">{selected.template_key}</span>
                </div>
              )}
            </div>

            {/* Error banner */}
            {selected.error && (
              <div className="mx-4 mt-3 flex items-start gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2 text-xs shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{selected.error}</p>
              </div>
            )}

            {/* Body — render HTML in sandboxed iframe, fallback to plain text */}
            <div className="flex-1 overflow-hidden p-4">
              {selected.body_html ? (
                <iframe
                  srcDoc={selected.body_html}
                  title="Email preview"
                  className="w-full h-full border-0 rounded bg-white"
                  sandbox="allow-same-origin"
                />
              ) : selected.body_text ? (
                <pre className="text-sm whitespace-pre-wrap leading-relaxed font-sans text-foreground/90">
                  {selected.body_text}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground italic">(No message body)</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Send className="h-10 w-10 opacity-20" />
            <p className="text-sm">Select a message to read</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── TrashTab ──────────────────────────────────────────────────────────────────

const TrashTab = () => {
  const queryClient = useQueryClient();
  const [purging, setPurging] = useState<string | null>(null);

  const { data: deleted = [], isLoading, refetch } = useQuery<InboxMessage[]>({
    queryKey: ["inbox-trash"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InboxMessage[];
    },
  });

  const trashedThreads = useMemo<Thread[]>(() => {
    const map = new Map<string, InboxMessage[]>();
    for (const msg of deleted) {
      const tid = msg.thread_id ?? msg.id;
      if (!map.has(tid)) map.set(tid, []);
      map.get(tid)!.push(msg);
    }
    return [...map.entries()]
      .map(([tid, msgs]) => {
        const sorted = [...msgs].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        const inbound = sorted.filter((m) => m.kind === "inbound");
        const first = inbound[0] ?? sorted[0];
        const latest = sorted[sorted.length - 1];
        return {
          id: tid,
          subject: first.subject,
          fromEmail: first.from_email,
          fromName: first.from_name,
          latestAt: latest.created_at,
          hasUnread: false,
          messages: sorted,
          inboundCount: inbound.length,
        };
      })
      .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
  }, [deleted]);

  const restore = async (thread: Thread) => {
    const ids = thread.messages.map((m) => m.id);
    const { error } = await supabase.from("inbox_messages").update({ deleted_at: null }).in("id", ids);
    if (error) toast.error(error.message);
    else {
      toast.success("Conversation restored.");
      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] });
      refetch();
    }
  };

  const purge = async (thread: Thread) => {
    setPurging(thread.id);
    const ids = thread.messages.map((m) => m.id);
    const { error } = await supabase.from("inbox_messages").delete().in("id", ids);
    setPurging(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Permanently deleted.");
      refetch();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border h-11 shrink-0">
        <span className="font-display tracking-widest text-xs text-muted-foreground">TRASH</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()}>
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : trashedThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Trash2 className="h-10 w-10 opacity-20" />
            <p className="text-sm">Trash is empty.</p>
          </div>
        ) : (
          trashedThreads.map((thread) => (
            <div key={thread.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/20">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-muted-foreground">{thread.fromName || thread.fromEmail}</p>
                <p className="text-xs truncate text-muted-foreground/70">{thread.subject}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">{formatDate(thread.latestAt)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => restore(thread)}
                >
                  <RotateCcw className="h-3 w-3" /> Restore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => purge(thread)}
                  disabled={purging === thread.id}
                >
                  {purging === thread.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Trash2 className="h-3 w-3" />}
                  Delete Forever
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ── ComposeDialog ─────────────────────────────────────────────────────────────

// Extract the real error message from a Supabase FunctionsHttpError.
// The raw error.message is just "Edge Function returned a non-2xx status code".
// The actual detail lives in the response body JSON.
async function extractFnErrorMsg(error: unknown): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = await (error as any).context?.json?.();
    if (body?.error) return body.error;
    if (body?.message) return body.message;
  } catch { /* ignore */ }
  return error instanceof Error ? error.message : "Send failed";
}

async function extractFnError(error: unknown): Promise<Error> {
  return new Error(await extractFnErrorMsg(error));
}

const HARDCODED_EMAILS = ["kmitch2087@gmail.com", "aopie91@gmail.com"];

const ComposeDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [to, setTo]                               = useState("");
  const [suggestions, setSuggestions]             = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions]     = useState(false);
  const [subject, setSubject]                     = useState("");
  const [templateKey, setTemplateKey]             = useState("");
  const [body, setBody]                           = useState("");
  const [sending, setSending]                     = useState(false);
  const [everyoneMode, setEveryoneMode]           = useState(false);
  const [everyoneCount, setEveryoneCount]         = useState<number | null>(null);
  const [loadingCount, setLoadingCount]           = useState(false);
  const [blastResult, setBlastResult]             = useState<{ sent: number; failed: number } | null>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["admin-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("key, name, variables").order("name");
      if (error) throw error;
      return (data ?? []) as EmailTemplate[];
    },
  });

  const selectedTpl = templates.find((t) => t.key === templateKey) ?? null;

  // When template changes, pre-fill body with template text
  useEffect(() => {
    if (!selectedTpl) { setBody(""); return; }
    supabase
      .from("email_templates")
      .select("body_text, subject")
      .eq("key", selectedTpl.key)
      .single()
      .then(({ data }) => {
        if (data) {
          setBody(data.body_text ?? "");
          if (!subject) setSubject(data.subject ?? "");
        }
      });
  }, [templateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced To: autocomplete — searches only the last comma-separated token
  useEffect(() => {
    const lastToken = to.split(",").pop()?.trim().toLowerCase() ?? "";
    if (!lastToken || lastToken.startsWith("@")) { setSuggestions([]); setShowSuggestions(false); return; }

    const q = lastToken;
    const timer = setTimeout(async () => {
      const matched: string[] = HARDCODED_EMAILS.filter((e) => e.includes(q));

      const [orders, custom, subs] = await Promise.all([
        supabase.from("orders").select("email").ilike("email", `%${q}%`).limit(5),
        supabase.from("custom_requests").select("email").ilike("email", `%${q}%`).limit(5),
        supabase.from("email_subscribers").select("email").ilike("email", `%${q}%`).limit(5),
      ]);

      const all = new Set([
        ...matched,
        ...((orders.data ?? []).map((o: { email: string }) => o.email).filter(Boolean)),
        ...((custom.data ?? []).map((c: { email: string }) => c.email).filter(Boolean)),
        ...((subs.data ?? []).map((s: { email: string }) => s.email).filter(Boolean)),
      ]);

      const list = [...all].slice(0, 10);
      setSuggestions(list);
      setShowSuggestions(list.length > 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [to]);

  // @everyone detection
  useEffect(() => {
    if (to.trim() === "@everyone") {
      setEveryoneMode(true);
      setLoadingCount(true);
      supabase
        .from("email_subscribers")
        .select("email", { count: "exact", head: true })
        .then(({ count }) => {
          setEveryoneCount(count ?? 0);
          setLoadingCount(false);
        });
    } else {
      setEveryoneMode(false);
      setEveryoneCount(null);
    }
  }, [to]);

  const reset = () => {
    setTo(""); setSubject(""); setTemplateKey(""); setBody("");
    setSuggestions([]); setShowSuggestions(false);
    setEveryoneMode(false); setEveryoneCount(null);
    setBlastResult(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSend = async () => {
    if (!everyoneMode && !to.trim()) return toast.error("Enter a recipient.");
    if (!subject.trim()) return toast.error("Enter a subject.");
    if (!body.trim() && !templateKey) return toast.error("Enter a message or select a template.");

    setSending(true);
    setBlastResult(null);
    try {
      if (everyoneMode) {
        if (!templateKey) {
          toast.error("Select a template for blast sends.");
          return;
        }
        if (!confirm(`Send to all ${everyoneCount ?? "?"} subscribers? This can't be undone.`)) {
          return;
        }
        const { data, error } = await supabase.functions.invoke("blast-email", {
          body: { templateKey, subject: subject.trim() || undefined, variables: {} },
        });
        if (error) throw await extractFnError(error);
        setBlastResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
        toast.success(`Blast sent: ${data.sent} delivered, ${data.failed} failed.`);
      } else {
        // Parse comma-separated recipients — send to each individually
        const recipients = to.trim().split(",").map(e => e.trim()).filter(Boolean);
        if (recipients.length === 0) { toast.error("Enter at least one recipient."); return; }

        const basePayload: Record<string, unknown> = {
          subject: subject.trim(),
          variables: {},
        };
        if (templateKey) {
          basePayload.templateKey = templateKey;
        } else {
          const htmlBody = body.trim()
            .split(/\n\n+/)
            .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
            .join("\n");
          basePayload.bodyHtml = htmlBody;
          basePayload.bodyText = body.trim();
        }

        let queued = false;
        const failures: string[] = [];
        for (const recipient of recipients) {
          const { data: sendData, error } = await supabase.functions.invoke("send-notification", {
            body: { ...basePayload, recipient },
          });
          if (error) {
            failures.push(`${recipient}: ${await extractFnErrorMsg(error)}`);
          } else if (sendData?.queued) {
            queued = true;
          }
        }

        if (failures.length > 0 && failures.length === recipients.length) {
          throw new Error(failures.join("\n"));
        } else if (failures.length > 0) {
          toast.warning(`Sent to ${recipients.length - failures.length}/${recipients.length}. Failed: ${failures.join(", ")}`);
        } else if (queued) {
          toast.warning("Email queued — Resend sender not configured yet.");
        } else {
          const label = recipients.length === 1 ? recipients[0] : `${recipients.length} recipients`;
          toast.success(`Email sent to ${label}.`);
        }
        handleClose();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest">COMPOSE</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* To: */}
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <div className="relative">
              <Input
                ref={toInputRef}
                value={to}
                onChange={(e) => { setTo(e.target.value); setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder='Email address, multiple separated by commas, or @everyone'
                className="h-8 text-xs"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((email) => (
                    <button
                      key={email}
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted/40 transition-colors"
                      onMouseDown={() => {
                      // Append selected email to the end of the comma-separated list
                      const parts = to.split(",").map(p => p.trim()).filter(Boolean);
                      parts[parts.length > 0 ? parts.length - 1 : 0] = email;
                      setTo(parts.join(", ") + ", ");
                      setShowSuggestions(false);
                    }}
                    >
                      {email}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {everyoneMode && (
              <div className="flex items-center gap-2 text-xs text-amber-500">
                <Users className="h-3.5 w-3.5" />
                {loadingCount
                  ? "Counting subscribers…"
                  : `Will send to ${everyoneCount ?? 0} subscribers`}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject…"
              className="h-8 text-xs"
            />
          </div>

          {/* Template (optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Template <span className="text-muted-foreground">(optional — or write free-form below)</span>
            </Label>
            <Select value={templateKey} onValueChange={(v) => setTemplateKey(v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="No template — write your own" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs text-muted-foreground">
                  — No template —
                </SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.key} value={t.key} className="text-xs">
                    {t.name} <span className="text-muted-foreground font-mono ml-1">({t.key})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              {templateKey ? "Body (template preview — editable)" : "Message"}
            </Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={templateKey ? "Loading template…" : "Write your message here…"}
              className="min-h-[200px] max-h-[400px] overflow-y-auto resize-y text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            {!templateKey && (
              <p className="text-[10px] text-muted-foreground">
                Plain text — blank lines become paragraphs. The Pournogravy logo header is added automatically.
              </p>
            )}
          </div>

          {blastResult && (
            <div className="text-xs rounded border border-border bg-muted/30 px-3 py-2 space-y-0.5">
              <p className="text-green-500">✓ {blastResult.sent} sent</p>
              {blastResult.failed > 0 && (
                <p className="text-destructive">✗ {blastResult.failed} failed</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
          <Button
            size="sm"
            className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest gap-1.5"
            onClick={handleSend}
            disabled={sending || (!everyoneMode && !to.trim()) || !subject.trim()}
          >
            {sending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
              : everyoneMode
                ? <><Users className="h-3.5 w-3.5" /> BLAST</>
                : <><Send className="h-3.5 w-3.5" /> SEND</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── CustomRequestsTab ─────────────────────────────────────────────────────────

type CRTab = "active" | "done" | "archived";

const crStatusClass = (status: string) =>
  statusClass ? statusClass(status) : "text-xs text-muted-foreground";

const CustomRequestsTab = () => {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("cr_id");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const [crTab, setCrTab] = useState<CRTab>("active");

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

  const displayed = crTab === "active" ? active : crTab === "done" ? done : archived;
  const detail = requests?.find((r) => r.id === selectedId);

  const markDone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_requests").update({ status: "completed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marked as done"); qc.invalidateQueries({ queryKey: ["admin-requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveReq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_requests").update({ archived_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Archived"); qc.invalidateQueries({ queryKey: ["admin-requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const unarchiveReq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_requests").update({ archived_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Unarchived"); qc.invalidateQueries({ queryKey: ["admin-requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRequest = async (patch: { status?: string; internal_notes?: string | null }) => {
    if (!selectedId) return;
    const { error } = await supabase.from("custom_requests").update(patch).eq("id", selectedId);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-requests"] }); }
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
        variables: { customer_name: detail.name, garment: detail.garment, message: reply },
      },
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Reply queued");
    await updateRequest({ status: "contacted" });
    setReply("");
  };

  const tabClass = (t: CRTab) =>
    `px-4 py-2 text-xs font-display tracking-widest uppercase border-b-2 transition-colors ${
      crTab === t ? "border-[#fde047] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-4">
        {/* Sub-tab bar */}
        <div className="flex items-center gap-0 border-b border-border">
          <button className={tabClass("active")} onClick={() => setCrTab("active")}>
            Active
            {active.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-sm">{active.length}</span>
            )}
          </button>
          <button className={tabClass("done")} onClick={() => setCrTab("done")}>
            Done
            {done.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-sm">{done.length}</span>
            )}
          </button>
          <button className={tabClass("archived")} onClick={() => setCrTab("archived")}>
            Archived
            {archived.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm">{archived.length}</span>
            )}
          </button>
          <div className="ml-auto flex items-center gap-2 pb-2">
            <Button variant="outline" size="sm" onClick={() => setSortAsc((v) => !v)} className="gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortAsc ? "Oldest first" : "Newest first"}
            </Button>
            <span className="text-xs text-muted-foreground">{displayed.length} request{displayed.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              {crTab === "active" && "No active requests."}
              {crTab === "done" && "Nothing marked done yet."}
              {crTab === "archived" && "Archive is empty."}
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
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.set("cr_id", r.id);
                      setParams(next);
                    }}
                  >
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.garment}</TableCell>
                    <TableCell>
                      <span className={crStatusClass(r.status)}>{r.status}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 justify-end">
                        {crTab !== "done" && r.status !== "completed" && (
                          <Button
                            size="sm" variant="outline"
                            className="text-xs h-7 gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                            disabled={markDone.isPending}
                            onClick={() => markDone.mutate(r.id)}
                          >
                            <CheckCircle className="h-3 w-3" /> Done
                          </Button>
                        )}
                        {crTab !== "archived" && (
                          <Button
                            size="sm" variant="outline"
                            className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                            disabled={archiveReq.isPending}
                            onClick={() => archiveReq.mutate(r.id)}
                          >
                            <Archive className="h-3 w-3" /> Archive
                          </Button>
                        )}
                        {crTab === "archived" && (
                          <Button
                            size="sm" variant="outline"
                            className="text-xs h-7 gap-1"
                            disabled={unarchiveReq.isPending}
                            onClick={() => unarchiveReq.mutate(r.id)}
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
      </div>

      <Sheet
        open={!!selectedId}
        onOpenChange={(o) => {
          if (!o) { const next = new URLSearchParams(params); next.delete("cr_id"); setParams(next); }
        }}
      >
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display tracking-widest">CUSTOM REQUEST</SheetTitle>
          </SheetHeader>
          {detail && (
            <div className="space-y-6 mt-6">
              <div className="space-y-2 text-sm">
                {[
                  ["Name",        detail.name],
                  ["Email",       detail.email],
                  detail.phone        ? ["Phone",       detail.phone]       : null,
                  ["Garment",     detail.garment],
                  detail.design_id    ? ["Design ID",   detail.design_id]   : null,
                  detail.design_name  ? ["Design name", detail.design_name] : null,
                ]
                  .filter(Boolean)
                  .map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-right">{value}</span>
                    </div>
                  ))}
              </div>
              {detail.notes && (
                <div>
                  <p className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Notes from customer</p>
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
                    {REQUEST_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-1">
                {detail.status !== "completed" && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={() => { markDone.mutate(detail.id); const next = new URLSearchParams(params); next.delete("cr_id"); setParams(next); }}>
                    <CheckCircle className="h-3.5 w-3.5" /> Mark Done
                  </Button>
                )}
                {!detail.archived_at ? (
                  <Button size="sm" variant="outline" className="gap-1.5"
                    onClick={() => { archiveReq.mutate(detail.id); const next = new URLSearchParams(params); next.delete("cr_id"); setParams(next); }}>
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1.5"
                    onClick={() => { unarchiveReq.mutate(detail.id); const next = new URLSearchParams(params); next.delete("cr_id"); setParams(next); }}>
                    <RotateCcw className="h-3.5 w-3.5" /> Unarchive
                  </Button>
                )}
              </div>
              <div className="space-y-2 border-t border-border pt-4">
                <Label>Send reply to customer</Label>
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={5} placeholder="Type your reply…" />
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

// ── SubscribersTab ────────────────────────────────────────────────────────────

interface Subscriber {
  id: string;
  email: string;
  source: string;
  created_at: string;
}

const SubscriberDetailDialog = ({
  subscriber,
  onClose,
}: {
  subscriber: Subscriber | null;
  onClose: () => void;
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ["subscriber-detail", subscriber?.email],
    enabled: !!subscriber,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!subscriber) return null;
      const [profileRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name, created_at").eq("email", subscriber.email).maybeSingle(),
        supabase.from("orders").select("id, total_cents, status, created_at").eq("email", subscriber.email).order("created_at", { ascending: false }),
      ]);
      let loyaltyPoints: number | null = null;
      if (profileRes.data?.id) {
        const { data: loyalty } = await supabase.from("loyalty_accounts").select("points_balance").eq("user_id", profileRes.data.id).maybeSingle();
        loyaltyPoints = loyalty?.points_balance ?? null;
      }
      return { profile: profileRes.data ?? null, orders: ordersRes.data ?? [], loyaltyPoints };
    },
  });

  const fmtMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <Dialog open={!!subscriber} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest text-base uppercase">Subscriber Detail</DialogTitle>
        </DialogHeader>
        {!subscriber ? null : (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#fde047]" />
                <p className="text-sm font-medium">{subscriber.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-marker tracking-widest uppercase text-[10px]">Source</span>
                  <p className="mt-0.5"><Badge variant="outline" className="text-[10px]">{subscriber.source}</Badge></p>
                </div>
                <div>
                  <span className="font-marker tracking-widest uppercase text-[10px]">Subscribed</span>
                  <p className="mt-0.5">{format(new Date(subscriber.created_at), "MMM d, yyyy")}</p>
                </div>
              </div>
            </div>
            {isLoading ? (
              <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {data?.profile ? (
                  <div className="border border-border rounded p-3 space-y-1">
                    <div className="flex items-center gap-1.5 mb-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-marker tracking-widest uppercase text-muted-foreground">Has Account</span>
                    </div>
                    {data.profile.display_name && <p className="text-sm">{data.profile.display_name}</p>}
                    {data.loyaltyPoints !== null && (
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-[#fde047]" />
                        <span className="text-sm">
                          <span className="font-display tracking-wider text-[#fde047]">{data.loyaltyPoints.toLocaleString()}</span>{" "}
                          <span className="text-xs text-muted-foreground">Pour Points</span>
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No account — subscriber only.</p>
                )}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-marker tracking-widest uppercase text-muted-foreground">Orders ({data?.orders.length ?? 0})</span>
                  </div>
                  {data?.orders.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No orders yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {data?.orders.map((o) => (
                        <div key={o.id} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
                          <span className="text-muted-foreground">{format(new Date(o.created_at), "MMM d, yyyy")}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">{o.status}</Badge>
                            <span className="font-display tracking-wider">{fmtMoney(o.total_cents)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const SubscribersTab = () => {
  const [selected, setSelected] = useState<Subscriber | null>(null);
  const [search, setSearch] = useState("");

  const { data: subscribers = [], isLoading } = useQuery<Subscriber[]>({
    queryKey: ["email-subscribers"],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_subscribers")
        .select("id, email, source, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = search.trim()
    ? subscribers.filter((s) => s.email.toLowerCase().includes(search.trim().toLowerCase()))
    : subscribers;

  const exportCSV = () => {
    const rows = [
      ["Email", "Source", "Subscribed"],
      ...filtered.map((s) => [s.email, s.source, new Date(s.created_at).toLocaleDateString()]),
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

  const recentCount = subscribers.filter(
    (s) => Date.now() - new Date(s.created_at).getTime() < 30 * 24 * 60 * 60 * 1000
  ).length;

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

  return (
    <div className="p-4 md:p-6 space-y-6 h-full overflow-y-auto">
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

      {/* List with search + export */}
      <div className="border border-border bg-card">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
          <Mail className="h-4 w-4 text-[#fde047]" />
          <h2 className="font-display tracking-widest text-sm flex-1">EMAIL SUBSCRIBERS</h2>
          <Input
            placeholder="Search by email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs w-48"
          />
          {subscribers.length > 0 && (
            <Button variant="outline" size="sm" className="h-7 text-xs font-display tracking-widest gap-1.5" onClick={exportCSV}>
              <Download className="h-3 w-3" /> Export CSV
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-marker text-muted-foreground italic">{search ? "No matches found." : "No subscribers yet."}</p>
            {!search && <p className="text-xs text-muted-foreground mt-2">Email signups from the homepage will appear here.</p>}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="px-5 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setSelected(s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelected(s)}
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

      <SubscriberDetailDialog subscriber={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

// ── Main InboxPage ────────────────────────────────────────────────────────────

const TAB_LABELS: { id: MailTab; label: string }[] = [
  { id: "inbox",            label: "MESSAGES"        },
  { id: "custom-requests",  label: "CUSTOM REQUESTS" },
  { id: "subscribers",      label: "SUBSCRIBERS"     },
  { id: "sent",             label: "SENT"            },
  { id: "trash",            label: "TRASH"           },
  { id: "templates",        label: "TEMPLATES"       },
];

const InboxPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as MailTab) ?? "inbox";
  const setActiveTab = useCallback(
    (tab: MailTab) => setSearchParams({ tab }, { replace: true }),
    [setSearchParams],
  );
  const [composeOpen, setComposeOpen] = useState(false);

  // Unread badge from inbox
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["inbox-unread-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("inbox_messages")
        .select("*", { count: "exact", head: true })
        .eq("status", "unread")
        .eq("kind", "inbound")
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border bg-card shrink-0 px-1 gap-0.5">
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`relative px-4 py-2.5 text-xs font-display tracking-widest border-b-2 transition-colors ${
              activeTab === id
                ? "border-[#fde047] text-[#fde047]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {id === "inbox" && unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-[#fde047] text-black text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto pr-3">
          <Button
            size="sm"
            className="h-7 bg-[#fde047] text-black hover:bg-[#fde047]/80 font-display tracking-widest text-xs gap-1.5"
            onClick={() => setComposeOpen(true)}
          >
            <PenLine className="h-3.5 w-3.5" /> Compose
          </Button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "inbox"           && <InboxTab />}
        {activeTab === "custom-requests" && <CustomRequestsTab />}
        {activeTab === "subscribers"     && <SubscribersTab />}
        {activeTab === "sent"            && <SentTab />}
        {activeTab === "trash"           && <TrashTab />}
        {activeTab === "templates"       && (
          <div className="p-4 md:p-6 h-full overflow-hidden flex">
            <EmailTemplates />
          </div>
        )}
      </div>

      <ComposeDialog open={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  );
};

export default InboxPage;
