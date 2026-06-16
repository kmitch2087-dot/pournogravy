import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import {
  Mail, MailOpen, Send, Loader2, RefreshCw, ArrowLeft, User,
  Inbox as InboxIcon, Clock, Trash2, PenLine, RotateCcw,
  ChevronDown, ChevronRight, AlertCircle, Users,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import EmailTemplates from "./EmailTemplates";

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

type MailTab = "inbox" | "sent" | "trash" | "templates";

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

  const { data: messages = [], isLoading, refetch } = useQuery<InboxMessage[]>({
    queryKey: ["inbox-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InboxMessage[];
    },
  });

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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: sent = [], isLoading, refetch } = useQuery<SentNotification[]>({
    queryKey: ["sent-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, recipient, template_key, subject, status, created_at, sent_at, error, body_html, body_text")
        .in("status", ["sent", "queued_no_sender"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SentNotification[];
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-display tracking-widest">
                <th className="px-4 py-2 text-left">RECIPIENT</th>
                <th className="px-4 py-2 text-left hidden md:table-cell">TEMPLATE</th>
                <th className="px-4 py-2 text-left hidden lg:table-cell">DATE</th>
                <th className="px-4 py-2 text-left">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {sent.map((n) => (
                <>
                  <tr
                    key={n.id}
                    className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {expandedId === n.id
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <span className="truncate max-w-[200px]">{n.recipient}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground font-mono">
                      {n.template_key ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground">
                      {format(new Date(n.created_at), "MMM d, h:mm a")}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={`text-[10px] ${statusColor(n.status)}`}>
                        {n.status}
                      </Badge>
                    </td>
                  </tr>
                  {expandedId === n.id && (
                    <tr key={`${n.id}-detail`} className="bg-muted/10 border-b border-border">
                      <td colSpan={4} className="px-6 py-4">
                        <div className="space-y-3 max-w-2xl">
                          <div>
                            <p className="text-[10px] font-marker tracking-widest text-muted-foreground mb-0.5">SUBJECT</p>
                            <p className="text-sm">{n.subject}</p>
                          </div>
                          {n.error && (
                            <div className="flex items-start gap-2 text-destructive">
                              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                              <p className="text-xs">{n.error}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] font-marker tracking-widest text-muted-foreground mb-0.5">BODY</p>
                            <Textarea
                              value={n.body_text || n.body_html || ""}
                              readOnly
                              className="min-h-[200px] max-h-[400px] overflow-y-auto resize-y font-mono text-xs opacity-80"
                            />
                          </div>
                          {n.sent_at && (
                            <p className="text-[10px] text-muted-foreground">
                              Sent at {format(new Date(n.sent_at), "MMM d yyyy, h:mm:ss a")}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
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

  // Debounced To: autocomplete
  useEffect(() => {
    const q = to.trim().toLowerCase();
    if (!q || q.startsWith("@")) { setSuggestions([]); setShowSuggestions(false); return; }

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
    if (!templateKey) return toast.error("Select a template first.");
    if (!everyoneMode && !to.trim()) return toast.error("Enter a recipient.");

    setSending(true);
    setBlastResult(null);
    try {
      if (everyoneMode) {
        if (!confirm(`Send to all ${everyoneCount ?? "?"} subscribers? This can't be undone.`)) {
          setSending(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke("blast-email", {
          body: { templateKey, subject: subject.trim() || undefined, variables: {} },
        });
        if (error) throw error;
        setBlastResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
        toast.success(`Blast sent: ${data.sent} delivered, ${data.failed} failed.`);
      } else {
        const { data: sendData, error } = await supabase.functions.invoke("send-notification", {
          body: {
            templateKey,
            recipient: to.trim(),
            variables: {},
          },
        });
        if (error) throw error;
        if (sendData?.queued) {
          toast.warning("Email queued — Resend sender not configured yet. Check Settings → Resend API key.");
        } else {
          toast.success(`Email sent to ${to.trim()}.`);
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
                placeholder='Email address or @everyone'
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
                      onMouseDown={() => { setTo(email); setShowSuggestions(false); }}
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

          {/* Template */}
          <div className="space-y-1.5">
            <Label className="text-xs">Template</Label>
            <Select value={templateKey} onValueChange={setTemplateKey}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select a template…" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.key} value={t.key} className="text-xs">
                    {t.name} <span className="text-muted-foreground font-mono ml-1">({t.key})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Body preview */}
          <div className="space-y-1.5">
            <Label className="text-xs">Body <span className="text-muted-foreground">(template preview)</span></Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Select a template to preview…"
              className="min-h-[200px] max-h-[400px] overflow-y-auto resize-y font-mono text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  // Allow normal Enter for newlines — only Cmd/Ctrl+Enter submits
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
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
            disabled={sending || !templateKey || (!everyoneMode && !to.trim())}
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

// ── Main InboxPage ────────────────────────────────────────────────────────────

const TAB_LABELS: { id: MailTab; label: string }[] = [
  { id: "inbox",     label: "INBOX"     },
  { id: "sent",      label: "SENT"      },
  { id: "trash",     label: "TRASH"     },
  { id: "templates", label: "TEMPLATES" },
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
        {activeTab === "inbox"     && <InboxTab />}
        {activeTab === "sent"      && <SentTab />}
        {activeTab === "trash"     && <TrashTab />}
        {activeTab === "templates" && (
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
