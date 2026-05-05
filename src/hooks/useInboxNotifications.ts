import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface InboxMessage {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string;
  created_at: string;
}

export const useInboxNotifications = () => {
  const queryClient = useQueryClient();
  const navigate    = useNavigate();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["inbox-unread-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("inbox_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "unread")
        .eq("kind", "inbound");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000, // poll every 60s as fallback
  });

  useEffect(() => {
    const channel = supabase
      .channel("inbox-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inbox_messages", filter: "kind=eq.inbound" },
        (payload) => {
          const msg = payload.new as InboxMessage;
          const sender = msg.from_name || msg.from_email;

          toast(`New message from ${sender}`, {
            description: msg.subject,
            duration: 10_000,
            action: {
              label: "Open inbox",
              onClick: () => navigate("/admin/inbox"),
            },
          });

          queryClient.invalidateQueries({ queryKey: ["inbox-unread-count"] });
          queryClient.invalidateQueries({ queryKey: ["inbox-messages"] });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient, navigate]);

  return { unreadCount };
};
