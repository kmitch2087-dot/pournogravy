import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, Mail } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ContactKristinModal = ({ open, onClose }: Props) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const location = useLocation();

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("admin-contact", {
        body: { message: message.trim(), fromPage: location.pathname },
      });
      if (error) throw error;
      toast.success("Message sent! Kristin will be in touch shortly.");
      setMessage("");
      onClose();
    } catch {
      toast.error("Couldn't send. Email kristinmitchell@aethyx.space directly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#fde047]" />
            CONTACT KRISTIN
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Describe what's happening. Your current admin page will be included
            automatically. Kristin usually responds within minutes.
          </p>

          <div className="space-y-2">
            <Label
              htmlFor="help-message"
              className="font-marker text-[10px] tracking-[0.3em] uppercase text-muted-foreground"
            >
              What do you need help with?
            </Label>
            <Textarea
              id="help-message"
              placeholder="Something isn't working… / I need help with… / I want to add…"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className="bg-[#fde047] text-black hover:bg-[#fde047]/80 font-medium gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send to Kristin
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
