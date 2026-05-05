import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Mail, MailOpen, Send, Loader2, RefreshCw, ArrowLeft, User,
  Inbox as InboxIcon, Clock,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

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

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d))     return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

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

const EmptyInbox = () => (
  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
    <InboxIcon className="h-12 w-12 mb-4 opacity-20" />
    <p className="font-display tracking-widest text-sm mb-1">INBOX EMPTY</p>
    <p className="text-xs max-w-xs">
      When customers email opie@pournogravy.com, their messages will appear here.
    </p>
  </div>
);

const Inbox = () => {
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText]   = useState("");
  const [sending, setSending]       = useState(false);
  const [showThread, setShowThread] = useState(false); // mobile: list vs thread

  const { data: messages = [], isLoading, refetch } = useQuery<InboxMessage[]>({
    queryKey: ["inbox-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("*")
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
        const first   = inbound[0] ?? sorted[0];
        const latest  = sorted[sorted.length - 1];
        return {
          id:           tid,
          subject:      first.subject,
          fromEmail:    first.from_email,
          fromName:     first.from_name,
          latestAt:     latest.created_at,
          hasUnread:    msgs.some((m) => m.status === "unread" && m.kind === "inbound"),
          messages:     sorted,
          inboundCount: inbound.length,
        };
      })
      .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
  }, [messages]);

  const selectedThread = threads.find((t) => t.id === selectedThreadId) ?? null;

  const handleSelectThread = async (thread: Thread) => {
    setSelectedThreadId(thread.id);
    setShowThread(true);
    setReplyText("");

    const unreadIds = thread.messages
      .filter((m) => m.status === "unread" && m.kind === "inbound")
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from("inbox_messages")
        .update({ status: "read" })
        .in("id", unreadIds);
      queryClient.invalidateQueries({ queryKey: ["inbox-unread-count"] });
      refetch();
    }
  };

  const handleReply = async () => {
    if (!selectedThread || !replyText.trim()) return;
    setSending(true);
    try {
      const latestInbound = [...selectedThread.messages]
        .reverse()
        .find((m) => m.kind === "inbound");
      if (!latestInbound) return;

      const { error } = await supabase.functions.invoke("send-reply", {
        body: {
          to:       latestInbound.from_email,
          subject:  selectedThread.subject.startsWith("Re:")
            ? selectedThread.subject
            : `Re: ${selectedThread.subject}`,
          body:     replyText.trim(),
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
    <div className="flex h-full -m-4 md:-m-6 overflow-hidden">

      {/* ── Thread list ─────────────────────────────────────── */}
      <div className={`
        flex flex-col border-r border-border bg-card
        w-full md:w-72 lg:w-80 shrink-0
        ${showThread ? "hidden md:flex" : "flex"}
      `}>
        {/* List header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border h-12">
          <span className="font-display tracking-widest text-sm">INBOX</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => refetch()}
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : threads.length === 0 ? (
            <EmptyInbox />
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => handleSelectThread(thread)}
                className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors ${
                  selectedThreadId === thread.id ? "bg-muted/50 border-l-2 border-l-[#fde047]" : ""
                }`}
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
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {formatDate(thread.latestAt)}
                  </span>
                </div>
                <p className={`text-xs truncate mt-0.5 ${thread.hasUnread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {thread.subject}
                </p>
                {thread.inboundCount > 1 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {thread.inboundCount} messages
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Thread view ─────────────────────────────────────── */}
      <div className={`
        flex-1 flex flex-col min-w-0
        ${showThread ? "flex" : "hidden md:flex"}
      `}>
        {selectedThread ? (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border h-12 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-7 w-7"
                onClick={() => setShowThread(false)}
              >
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
                className={`text-[10px] shrink-0 ${
                  selectedThread.hasUnread
                    ? "border-[#fde047]/40 text-[#fde047]"
                    : "text-muted-foreground"
                }`}
              >
                {selectedThread.messages[selectedThread.messages.length - 1].status}
              </Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedThread.messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
            </div>

            <Separator />

            {/* Reply form */}
            <div className="p-4 bg-card shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Replying as <strong>opie@pournogravy.com</strong>
                </span>
              </div>
              <Textarea
                placeholder="Type your reply…"
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="resize-none text-sm mb-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply();
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  ⌘ + Enter to send
                </span>
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

export default Inbox;
