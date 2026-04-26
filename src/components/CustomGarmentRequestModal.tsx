import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CustomGarmentRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which design they're asking about — snapshot id + name so the owner knows context. */
  designId?: string;
  designName?: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  garment: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  garment: "",
  notes: "",
};

// Lightweight client-side email check. The DB has a stricter regex as backup.
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const CustomGarmentRequestModal = ({
  open,
  onOpenChange,
  designId,
  designName,
}: CustomGarmentRequestModalProps) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset whenever the dialog closes so reopening starts fresh.
  useEffect(() => {
    if (!open) {
      // Slight delay so the closing animation doesn't flash empty state.
      const t = setTimeout(() => {
        setForm(EMPTY_FORM);
        setSubmitted(false);
        setError(null);
        setSubmitting(false);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  const update = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const canSubmit =
    form.name.trim().length > 0 &&
    isEmail(form.email) &&
    form.garment.trim().length > 0 &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("custom_requests")
      .insert({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        garment: form.garment.trim(),
        notes: form.notes.trim() || null,
        design_id: designId ?? null,
        design_name: designName ?? null,
      });

    setSubmitting(false);

    if (insertError) {
      // Log the real reason for dev — user-facing copy stays friendly.
      console.error("[custom_requests insert failed]", insertError);
      // Keep the user's input in place so they don't have to retype.
      setError(insertError.message ?? "unknown error");
      return;
    }

    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border border-[#fde047]/20 p-0 overflow-hidden">
        {/* Neon top rail to match site style */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, #fde047 50%, transparent)",
            boxShadow: "0 0 12px rgba(253,224,71,0.5)",
          }}
        />

        <div className="px-6 pt-6 pb-5">
          {submitted ? (
            <div className="text-center space-y-4 py-6">
              <div className="mx-auto h-14 w-14 rounded-full bg-[#fde047]/10 flex items-center justify-center border border-[#fde047]/40">
                <Check className="h-6 w-6 text-[#fde047]" />
              </div>
              <DialogHeader className="space-y-2">
                <DialogTitle className="font-display text-2xl tracking-widest text-center">
                  REQUEST IN
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  We'll get back to you soon to send you a quote and mockup for
                  your request if it's available.
                </DialogDescription>
              </DialogHeader>
              <Button
                onClick={() => onOpenChange(false)}
                className="h-11 px-8 mt-2 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90"
              >
                NICE
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader className="space-y-2 mb-5">
                <DialogTitle className="font-display text-2xl tracking-widest">
                  CUSTOM REQUEST
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Want this design on something else? Tell us what you're
                  thinking — hoodie, tank, speedo, whatever — and we'll send a
                  quote and mockup if we can swing it.
                </DialogDescription>
                {designName && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Design:{" "}
                    <span className="font-display tracking-wider text-foreground">
                      {designName}
                    </span>
                  </p>
                )}
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cgr-name"
                    className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground"
                  >
                    Name *
                  </Label>
                  <Input
                    id="cgr-name"
                    value={form.name}
                    onChange={update("name")}
                    autoComplete="name"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="cgr-email"
                    className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground"
                  >
                    Email *
                  </Label>
                  <Input
                    id="cgr-email"
                    type="email"
                    inputMode="email"
                    value={form.email}
                    onChange={update("email")}
                    autoComplete="email"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="cgr-phone"
                    className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground"
                  >
                    Phone
                  </Label>
                  <Input
                    id="cgr-phone"
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={update("phone")}
                    autoComplete="tel"
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="cgr-garment"
                    className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground"
                  >
                    Garment *
                  </Label>
                  <Input
                    id="cgr-garment"
                    value={form.garment}
                    onChange={update("garment")}
                    placeholder="e.g. Hoodie, tank top, speedo…"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="cgr-notes"
                    className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground"
                  >
                    Notes
                  </Label>
                  <Textarea
                    id="cgr-notes"
                    value={form.notes}
                    onChange={update("notes")}
                    placeholder="Color, size, anything else we should know."
                    rows={3}
                    disabled={submitting}
                  />
                </div>

                {error && (
                  <div className="text-xs text-destructive space-y-1">
                    <p>Something went sideways submitting that.</p>
                    <p>
                      Try again in a sec, or email us at{" "}
                      <a
                        href="mailto:Opie@pournogravy.com"
                        className="underline underline-offset-4 hover:text-destructive/80"
                      >
                        Opie@pournogravy.com
                      </a>
                      .
                    </p>
                    <p className="text-muted-foreground font-mono text-[10px] pt-1 break-words">
                      ({error})
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full h-12 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90 disabled:opacity-40"
                  style={
                    canSubmit
                      ? { boxShadow: "0 0 20px rgba(253,224,71,0.25)" }
                      : undefined
                  }
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      SENDING…
                    </span>
                  ) : (
                    "SEND REQUEST"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomGarmentRequestModal;
