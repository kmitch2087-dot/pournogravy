import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  CheckCheck,
  ChevronDown,
  ExternalLink,
  Loader2,
  MessageSquare,
  Archive,
  ChevronRight,
  Plus,
  Send,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────
interface EditRequest {
  id: string;
  content: string;
  page_url: string | null;
  created_at: string;
  author: string;
  done: boolean;
  archived: boolean;
}

interface Reply {
  id: string;
  request_id: string;
  author: string;
  content: string;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const authorLabel = (author: string) =>
  author === "opie" ? "Opie" : "Kristin";

const authorColor = (author: string) =>
  author === "opie"
    ? "bg-blue-500/15 text-blue-300 border-blue-500/20"
    : "bg-[#fde047]/15 text-[#fde047] border-[#fde047]/20";

// ── Reply thread ────────────────────────────────────────────────────────────
function ReplyThread({
  requestId,
  replies,
  refetch,
  myAuthor,
}: {
  requestId: string;
  replies: Reply[];
  refetch: () => void;
  myAuthor: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!draft.trim()) return;
    setSending(true);
    const { error } = await (supabase.from("edit_request_replies" as never) as ReturnType<typeof supabase.from>).insert({
      request_id: requestId,
      author: myAuthor,
      content: draft.trim(),
    });
    if (error) { toast.error("Failed to send reply"); setSending(false); return; }
    setDraft("");
    refetch();
    setSending(false);
    toast.success("Reply sent");
  };

  return (
    <div className="mt-2 border-t border-border/40 pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare className="h-3 w-3" />
        {replies.length > 0 ? `${replies.length} repl${replies.length === 1 ? "y" : "ies"}` : "Reply"}
        {replies.length > 0 && (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-2">
              {replies.map((r) => (
                <div
                  key={r.id}
                  className={`rounded px-3 py-2 text-xs border ${
                    r.author === "opie"
                      ? "border-blue-500/20 bg-blue-500/5"
                      : "border-[#fde047]/20 bg-[#fde047]/5"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{authorLabel(r.author)}</span>
                    <span>{format(new Date(r.created_at), "MMM d, h:mm a")}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{r.content}</p>
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Reply as ${authorLabel(myAuthor)}…`}
                  rows={2}
                  className="text-xs resize-none flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="bg-[#fde047] text-black hover:bg-yellow-300 self-end h-8 px-3"
                >
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">⌘↵ to send</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Note card ───────────────────────────────────────────────────────────────
function NoteCard({
  note,
  replies,
  onMarkDone,
  onArchive,
  refetchReplies,
  myAuthor,
}: {
  note: EditRequest;
  replies: Reply[];
  onMarkDone: (id: string, done: boolean) => void;
  onArchive: (id: string) => void;
  refetchReplies: () => void;
  myAuthor: string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: note.done ? 0.55 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={`rounded-sm border bg-card p-3 space-y-2 ${
        note.done ? "border-border/40" : "border-border"
      }`}
    >
      {/* Meta row */}
      <div className="flex items-start gap-2 justify-between flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
          <Badge className={`text-[9px] px-1.5 py-0 ${authorColor(note.author)}`}>
            {authorLabel(note.author)}
          </Badge>
          <span>{format(new Date(note.created_at), "MMM d, yyyy · h:mm a")}</span>
          {note.page_url && (
            <a
              href={note.page_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-0.5 text-[#fde047] hover:underline"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              {note.page_url}
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {note.done ? (
            <>
              <button
                onClick={() => onMarkDone(note.id, false)}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Undo
              </button>
              <button
                onClick={() => onArchive(note.id)}
                title="Archive"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onMarkDone(note.id, true)}
              title="Mark done"
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[#fde047] transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Done
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${note.done ? "line-through text-muted-foreground" : ""}`}>
        {note.content}
      </p>

      {/* Reply thread */}
      <ReplyThread
        requestId={note.id}
        replies={replies}
        refetch={refetchReplies}
        myAuthor={myAuthor}
      />
    </motion.div>
  );
}

// ── New note form ────────────────────────────────────────────────────────────
function NewNoteForm({ author, onSaved }: { author: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    const { error } = await (supabase.from("client_edit_requests" as never) as ReturnType<typeof supabase.from>).insert({
      content: content.trim(),
      page_url: window.location.pathname,
      author,
    });
    if (error) { toast.error("Failed to save note"); setSaving(false); return; }
    setContent("");
    setOpen(false);
    onSaved();
    toast.success("Note added");
    setSaving(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#fde047] transition-colors border border-dashed border-border/50 rounded-sm px-3 py-2 w-full"
      >
        <Plus className="h-3.5 w-3.5" />
        Add a note
      </button>
    );
  }

  return (
    <div className="border border-[#fde047]/30 rounded-sm p-3 space-y-2 bg-[#fde047]/5">
      <Textarea
        autoFocus
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What needs changing?"
        rows={3}
        className="text-sm resize-none"
      />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => { setOpen(false); setContent(""); }}>Cancel</Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="bg-[#fde047] text-black hover:bg-yellow-300 font-semibold"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Note"}
        </Button>
      </div>
    </div>
  );
}

// ── Column ───────────────────────────────────────────────────────────────────
function NoteColumn({
  title,
  authorFilter,
  notes,
  replies,
  onMarkDone,
  onArchive,
  refetchAll,
  myAuthor,
  showNewNote,
}: {
  title: string;
  authorFilter: string;
  notes: EditRequest[];
  replies: Reply[];
  onMarkDone: (id: string, done: boolean) => void;
  onArchive: (id: string) => void;
  refetchAll: () => void;
  myAuthor: string;
  showNewNote: boolean;
}) {
  const [showArchive, setShowArchive] = useState(false);

  const active   = notes.filter((n) => n.author === authorFilter && !n.archived);
  const archived = notes.filter((n) => n.author === authorFilter && n.archived);
  const open_    = active.filter((n) => !n.done);
  const done_    = active.filter((n) =>  n.done);

  const repliesFor = (id: string) => replies.filter((r) => r.request_id === id);

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {/* Column header */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-widest uppercase">{title}</h2>
          <Badge className={`text-[10px] ${authorFilter === "opie" ? "bg-blue-500/15 text-blue-300 border-blue-500/20" : "bg-[#fde047]/15 text-[#fde047] border-[#fde047]/20"}`}>
            {open_.length} open
          </Badge>
        </div>
      </div>

      {/* New note */}
      {showNewNote && (
        <NewNoteForm author={myAuthor} onSaved={refetchAll} />
      )}

      {/* Open notes */}
      {open_.length === 0 && !showNewNote && (
        <p className="text-xs text-muted-foreground py-4 text-center">No open notes</p>
      )}
      <div className="space-y-2">
        <AnimatePresence>
          {open_.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              replies={repliesFor(note.id)}
              onMarkDone={onMarkDone}
              onArchive={onArchive}
              refetchReplies={refetchAll}
              myAuthor={myAuthor}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Done (not yet archived) */}
      {done_.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Done — click archive to move out
          </p>
          <AnimatePresence>
            {done_.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                replies={repliesFor(note.id)}
                onMarkDone={onMarkDone}
                onArchive={onArchive}
                refetchReplies={refetchAll}
                myAuthor={myAuthor}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Archive */}
      {archived.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest w-full"
          >
            <Archive className="h-3 w-3" />
            Archive ({archived.length})
            {showArchive ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
          </button>
          <AnimatePresence initial={false}>
            {showArchive && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 mt-2 opacity-50">
                  {archived.map((note) => (
                    <div key={note.id} className="rounded-sm border border-border/30 bg-card p-3">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                        <Archive className="h-3 w-3" />
                        <span>{format(new Date(note.created_at), "MMM d, yyyy")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-through leading-relaxed">{note.content}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
const EditRequests = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Determine who's logged in — drives which column gets "New Note" + reply attribution
  const myAuthor =
    user?.email?.includes("aopie") ? "opie" : "kristin";

  const { data: notes = [], isLoading: notesLoading } = useQuery<EditRequest[]>({
    queryKey: ["client-edit-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("client_edit_requests" as never) as ReturnType<typeof supabase.from>)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EditRequest[];
    },
  });

  const { data: replies = [], isLoading: repliesLoading } = useQuery<Reply[]>({
    queryKey: ["edit-request-replies"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("edit_request_replies" as never) as ReturnType<typeof supabase.from>)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reply[];
    },
  });

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ["client-edit-requests"] });
    qc.invalidateQueries({ queryKey: ["edit-request-replies"] });
  };

  const markDone = async (id: string, done: boolean) => {
    await (supabase
      .from("client_edit_requests" as never) as ReturnType<typeof supabase.from>)
      .update({ done })
      .eq("id", id);
    refetchAll();
    toast.success(done ? "Marked done ✓" : "Reopened");
  };

  const archive = async (id: string) => {
    await (supabase
      .from("client_edit_requests" as never) as ReturnType<typeof supabase.from>)
      .update({ archived: true, done: true })
      .eq("id", id);
    refetchAll();
    toast.success("Archived");
  };

  const isLoading = notesLoading || repliesLoading;

  const openOpie     = notes.filter((n) => n.author === "opie"    && !n.archived && !n.done).length;
  const openKristin  = notes.filter((n) => n.author === "kristin" && !n.archived && !n.done).length;

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl tracking-widest">CLIENT NOTES</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Notes from Opie and Kristin, side-by-side. Mark done → archive. Reply inline.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            Opie — {openOpie} open
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#fde047]" />
            Kristin — {openKristin} open
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <NoteColumn
            title="Opie's Notes"
            authorFilter="opie"
            notes={notes}
            replies={replies}
            onMarkDone={markDone}
            onArchive={archive}
            refetchAll={refetchAll}
            myAuthor={myAuthor}
            showNewNote={myAuthor === "opie"}
          />
          <NoteColumn
            title="Kristin's Notes"
            authorFilter="kristin"
            notes={notes}
            replies={replies}
            onMarkDone={markDone}
            onArchive={archive}
            refetchAll={refetchAll}
            myAuthor={myAuthor}
            showNewNote={myAuthor === "kristin"}
          />
        </div>
      )}
    </div>
  );
};

export default EditRequests;
