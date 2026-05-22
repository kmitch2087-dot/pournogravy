import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  CheckSquare, Square, MessageSquare, ChevronDown, ChevronRight,
  Loader2, Send, Archive, CheckCheck,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────
interface CollabEntry {
  id: string; content: string; page_url: string | null; created_at: string;
  author: string; done: boolean; archived: boolean;
  type: string; checked: boolean; assigned_to: string | null;
}
interface Reply {
  id: string; request_id: string; author: string; content: string; created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const OPIE_STYLE    = "bg-blue-500/15 text-blue-300 border-blue-500/20";
const KRISTIN_STYLE = "bg-[#fde047]/15 text-[#fde047] border-[#fde047]/20";
const authorLabel   = (a: string) => a === "opie" ? "Opie" : "Kristin";
const authorStyle   = (a: string) => a === "opie" ? OPIE_STYLE : KRISTIN_STYLE;
const authorDot     = (a: string) => a === "opie" ? "bg-blue-400" : "bg-[#fde047]";

// ── Reply thread (collapsible) ────────────────────────────────────────────────
function ReplyThread({ entryId, replies, myAuthor, onSaved }: {
  entryId: string; replies: Reply[]; myAuthor: string; onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!draft.trim()) return;
    setSending(true);
    const { error } = await (supabase.from("edit_request_replies" as never) as ReturnType<typeof supabase.from>).insert({
      request_id: entryId, author: myAuthor, content: draft.trim(),
    });
    if (error) { toast.error("Failed"); setSending(false); return; }
    setDraft(""); onSaved(); setSending(false);
  };

  return (
    <div className="mt-2 border-t border-border/30 pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare className="h-3 w-3" />
        {replies.length > 0 ? `${replies.length} repl${replies.length === 1 ? "y" : "ies"}` : "Reply"}
        {replies.length > 0 && (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-2">
              {replies.map((r) => (
                <div key={r.id} className={`rounded px-3 py-2 text-xs border ${r.author === "opie" ? "border-blue-500/20 bg-blue-500/5" : "border-[#fde047]/20 bg-[#fde047]/5"}`}>
                  <div className="flex items-center gap-2 mb-1 text-[10px] text-muted-foreground">
                    <span className={`font-semibold ${r.author === "opie" ? "text-blue-300" : "text-[#fde047]"}`}>{authorLabel(r.author)}</span>
                    <span>{format(new Date(r.created_at), "MMM d · h:mm a")}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{r.content}</p>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Reply as ${authorLabel(myAuthor)}…`}
                  rows={2} className="text-xs resize-none flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
                />
                <Button size="sm" onClick={send} disabled={sending || !draft.trim()}
                  className="bg-[#fde047] text-black hover:bg-yellow-300 self-end h-8 px-3">
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Cmd+Enter / Ctrl+Enter to send</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────
function EntryCard({ entry, replies, myAuthor, onUpdate, onArchive, onSaved }: {
  entry: CollabEntry; replies: Reply[]; myAuthor: string;
  onUpdate: (id: string, patch: Partial<CollabEntry>) => void;
  onArchive: (id: string) => void;
  onSaved: () => void;
}) {
  const isTodo = entry.type === "todo";
  return (
    <motion.div
      layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: entry.archived ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }}
      className={`rounded-sm border bg-card p-3 space-y-2 ${entry.done || entry.checked ? "border-border/40" : "border-border"}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`h-2 w-2 rounded-full flex-shrink-0 mt-0.5 ${authorDot(entry.author)}`} />
          <Badge className={`text-[9px] px-1.5 py-0 ${authorStyle(entry.author)}`}>{authorLabel(entry.author)}</Badge>
          {isTodo && (
            <Badge className="text-[9px] px-1.5 py-0 bg-violet-500/15 text-violet-300 border-violet-500/20">TODO</Badge>
          )}
          {entry.assigned_to && (
            <span className="text-[10px] text-muted-foreground">to {authorLabel(entry.assigned_to)}</span>
          )}
          <span className="text-[10px] text-muted-foreground">{format(new Date(entry.created_at), "MMM d, yyyy · h:mm a")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isTodo ? (
            <button
              onClick={() => onUpdate(entry.id, { checked: !entry.checked })}
              className="text-muted-foreground hover:text-[#fde047] transition"
              title={entry.checked ? "Uncheck" : "Check off"}
            >
              {entry.checked
                ? <CheckSquare className="h-4 w-4 text-[#fde047]" />
                : <Square className="h-4 w-4" />}
            </button>
          ) : (
            !entry.done && (
              <button onClick={() => onUpdate(entry.id, { done: true })}
                className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-[#fde047] transition">
                <CheckCheck className="h-3.5 w-3.5" /> Done
              </button>
            )
          )}
          {(entry.done || entry.checked) && !entry.archived && (
            <button onClick={() => onArchive(entry.id)} title="Archive" className="text-muted-foreground hover:text-foreground transition">
              <Archive className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${(entry.done || (isTodo && entry.checked)) ? "line-through text-muted-foreground" : ""}`}>
        {entry.content}
      </p>

      {/* Replies */}
      <ReplyThread entryId={entry.id} replies={replies} myAuthor={myAuthor} onSaved={onSaved} />
    </motion.div>
  );
}

// ── Compose form ──────────────────────────────────────────────────────────────
function ComposeForm({ myAuthor, onSaved }: { myAuthor: string; onSaved: () => void }) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<"message" | "todo">("message");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!content.trim()) return;
    setSending(true);
    const { error } = await (supabase.from("client_edit_requests" as never) as ReturnType<typeof supabase.from>).insert({
      content: content.trim(), author: myAuthor, type,
      assigned_to: type === "todo" ? assignedTo : null,
      page_url: null,
    });
    if (error) { toast.error("Failed to send"); setSending(false); return; }
    setContent(""); setSending(false); onSaved();
    toast.success(type === "todo" ? "Todo added" : "Message sent");
  };

  const otherAuthor = myAuthor === "opie" ? "kristin" : "opie";

  return (
    <div className="border border-[#fde047]/30 rounded-sm p-3 space-y-3 bg-[#fde047]/5">
      {/* Type toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setType("message")}
          className={`text-xs px-3 py-1 rounded-sm border transition ${type === "message" ? "border-[#fde047] text-[#fde047] bg-[#fde047]/10" : "border-border text-muted-foreground"}`}
        >
          <MessageSquare className="inline h-3 w-3 mr-1" /> Message
        </button>
        <button
          onClick={() => setType("todo")}
          className={`text-xs px-3 py-1 rounded-sm border transition ${type === "todo" ? "border-violet-400 text-violet-300 bg-violet-400/10" : "border-border text-muted-foreground"}`}
        >
          <CheckSquare className="inline h-3 w-3 mr-1" /> To-Do
        </button>
        {type === "todo" && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Assign to:</span>
            <button
              onClick={() => setAssignedTo(assignedTo === otherAuthor ? null : otherAuthor)}
              className={`px-2 py-0.5 rounded border text-xs transition ${assignedTo === otherAuthor ? (otherAuthor === "opie" ? "border-blue-400/60 text-blue-300 bg-blue-400/10" : "border-[#fde047]/60 text-[#fde047] bg-[#fde047]/10") : "border-border text-muted-foreground"}`}
            >
              {authorLabel(otherAuthor)}
            </button>
          </div>
        )}
      </div>

      <Textarea
        autoFocus
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={type === "todo" ? "What needs to be done?" : "What's on your mind?"}
        rows={3}
        className="text-sm resize-none"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
      />
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">Cmd+Enter / Ctrl+Enter to send</p>
        <Button size="sm" onClick={send} disabled={sending || !content.trim()}
          className="bg-[#fde047] text-black hover:bg-yellow-300 font-semibold">
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
            <><Send className="h-3.5 w-3.5 mr-1" /> {type === "todo" ? "Add Todo" : "Send"}</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const EditRequests = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const myAuthor = user?.email?.includes("aopie") ? "opie" : "kristin";
  const [showArchive, setShowArchive] = useState(false);

  const { data: entries = [], isLoading } = useQuery<CollabEntry[]>({
    queryKey: ["collab-entries"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("client_edit_requests" as never) as ReturnType<typeof supabase.from>)
        .select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CollabEntry[];
    },
  });

  const { data: replies = [] } = useQuery<Reply[]>({
    queryKey: ["collab-replies"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("edit_request_replies" as never) as ReturnType<typeof supabase.from>)
        .select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reply[];
    },
  });

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["collab-entries"] });
    qc.invalidateQueries({ queryKey: ["collab-replies"] });
  };

  const updateEntry = async (id: string, patch: Partial<CollabEntry>) => {
    await (supabase.from("client_edit_requests" as never) as ReturnType<typeof supabase.from>).update(patch).eq("id", id);
    refetch();
  };

  const archiveEntry = async (id: string) => {
    await (supabase.from("client_edit_requests" as never) as ReturnType<typeof supabase.from>).update({ archived: true, done: true }).eq("id", id);
    refetch();
    toast.success("Archived");
  };

  const active   = entries.filter((e) => !e.archived);
  const archived = entries.filter((e) =>  e.archived);
  const openTodos = active.filter((e) => e.type === "todo" && !e.checked).length;

  const repliesFor = (id: string) => replies.filter((r) => r.request_id === id);

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl tracking-widest">CLIENT NOTES</h1>
          <p className="text-xs text-muted-foreground mt-1">
            One thread — Opie &amp; Kristin. Messages, to-dos, back-and-forth.
          </p>
        </div>
        {openTodos > 0 && (
          <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/20">
            {openTodos} open todo{openTodos !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {active.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border/40 rounded-sm">
              No messages yet. Start the conversation below.
            </p>
          )}
          <AnimatePresence>
            {active.map((entry) => (
              <EntryCard
                key={entry.id} entry={entry} replies={repliesFor(entry.id)}
                myAuthor={myAuthor} onUpdate={updateEntry} onArchive={archiveEntry} onSaved={refetch}
              />
            ))}
          </AnimatePresence>

          {/* Compose */}
          <ComposeForm myAuthor={myAuthor} onSaved={refetch} />

          {/* Archive */}
          {archived.length > 0 && (
            <div>
              <button
                onClick={() => setShowArchive(!showArchive)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition uppercase tracking-widest w-full py-2"
              >
                <Archive className="h-3 w-3" />
                Archive ({archived.length})
                {showArchive ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
              </button>
              <AnimatePresence initial={false}>
                {showArchive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 mt-2 opacity-50">
                      {archived.map((e) => (
                        <EntryCard
                          key={e.id} entry={e} replies={repliesFor(e.id)}
                          myAuthor={myAuthor} onUpdate={updateEntry} onArchive={archiveEntry} onSaved={refetch}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EditRequests;
