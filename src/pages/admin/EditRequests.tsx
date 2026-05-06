import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, ExternalLink } from "lucide-react";

interface EditRequest {
  id: string;
  content: string;
  page_url: string | null;
  created_at: string;
}

const EditRequests = () => {
  const { data: notes, isLoading } = useQuery<EditRequest[]>({
    queryKey: ["client-edit-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_edit_requests" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EditRequest[];
    },
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-muted-foreground border border-dashed border-border rounded-sm px-4 py-3">
        Notes and edit requests submitted by Opie via the floating edit bubble. These are read-only.
        Kristin will review and action them separately — nothing here is implemented automatically.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !notes || notes.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          No notes yet. Use the yellow Edit Notes bubble on any page to add one.
        </div>
      ) : (
        <Card className="overflow-hidden divide-y divide-dashed divide-border">
          {notes.map((note) => (
            <div key={note.id} className="p-4 space-y-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium text-foreground">
                  {format(new Date(note.created_at), "MMM d, yyyy · h:mm a")}
                </span>
                {note.page_url && (
                  <a
                    href={note.page_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[#fde047] hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {note.page_url}
                  </a>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
            </div>
          ))}
        </Card>
      )}

      {notes && notes.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {notes.length} note{notes.length !== 1 ? "s" : ""} total
        </p>
      )}
    </div>
  );
};

export default EditRequests;
