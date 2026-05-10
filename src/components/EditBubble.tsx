import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, PenLine, Loader2, Save, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EditRequest {
  id: string;
  content: string;
  page_url: string | null;
  created_at: string;
}

const DRAFT_KEY = "pg_edit_bubble_draft";

const EditBubble = () => {
  const { isAdmin, user } = useAuth();
  const myAuthor = user?.email?.includes("aopie") ? "opie" : "kristin";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => localStorage.getItem(DRAFT_KEY) ?? "");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data: notes } = useQuery<EditRequest[]>({
    queryKey: ["client-edit-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_edit_requests" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EditRequest[];
    },
    enabled: isAdmin && open,
  });

  const handleDraftChange = (val: string) => {
    setDraft(val);
    localStorage.setItem(DRAFT_KEY, val);
  };

  const handleSave = async () => {
    if (!draft.trim()) return;
    setSaving(true);

    const pageUrl = window.location.pathname;

    const { error } = await (supabase.from("client_edit_requests" as never) as ReturnType<typeof supabase.from>).insert({
      content: draft.trim(),
      page_url: pageUrl,
      author: myAuthor,
    });

    if (error) {
      toast.error("Failed to save note");
      setSaving(false);
      return;
    }

    // Fire-and-forget email — don't block the save UX on it
    supabase.functions.invoke("send-notification", {
      body: {
        templateKey: "client_edit_request",
        recipient: "kmitch2087@gmail.com",
        relatedKind: "client_edit_request",
        variables: {
          page_url: pageUrl,
          content: draft.trim(),
          created_at: new Date().toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric",
            hour: "numeric", minute: "2-digit",
          }),
        },
      },
    });

    setDraft("");
    localStorage.removeItem(DRAFT_KEY);
    qc.invalidateQueries({ queryKey: ["client-edit-requests"] });
    toast.success("Note saved — Kristin has been notified!");
    setSaving(false);
  };

  if (!isAdmin) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, width: open ? 340 : "auto" }}
      className="select-none"
    >
      <div className="rounded-sm shadow-2xl border border-black/20 overflow-hidden">
        {/* Header / drag handle */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#fde047] cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-black/40 shrink-0" />
          <PenLine className="h-4 w-4 text-black shrink-0" />
          {open && (
            <span className="text-black font-bold text-sm tracking-wide flex-1">
              Edit Notes
            </span>
          )}
          {!open && (
            <span className="text-black font-bold text-sm tracking-wide">Notes</span>
          )}
          <button
            className="text-black/60 hover:text-black transition ml-auto"
            onClick={() => setOpen((v) => !v)}
            title={open ? "Shrink" : "Expand"}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {/* Content — stopPropagation so clicking here doesn't drag */}
        {open && (
          <div
            className="bg-white border-t border-black/10 p-3 space-y-3"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Textarea
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              placeholder="Add your thoughts/edits/questions/critiques here"
              rows={4}
              className="text-sm resize-none focus-visible:ring-[#fde047]"
            />

            <Button
              onClick={handleSave}
              disabled={!draft.trim() || saving}
              className="w-full bg-black text-white hover:bg-black/80 text-xs h-8 gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Note
                </>
              )}
            </Button>

            {notes && notes.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-0 mt-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Previous notes
                </p>
                {notes.map((note, i) => (
                  <div key={note.id}>
                    <div className="py-2">
                      <div className="flex gap-2 text-[10px] text-muted-foreground mb-1 flex-wrap">
                        <span>{format(new Date(note.created_at), "MMM d, yyyy h:mm a")}</span>
                        {note.page_url && (
                          <span className="text-[#fde047] font-medium">{note.page_url}</span>
                        )}
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                    {i < notes.length - 1 && (
                      <hr className="border-dashed border-black/15" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default EditBubble;
