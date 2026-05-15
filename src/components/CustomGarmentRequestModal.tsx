import { useEffect, useRef, useState } from "react";
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
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

// Lightweight client-side email syntax check. Server re-validates and also
// checks for disposable domains, typos, and MX records.
const isEmailShape = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Phone counts as "valid" if it has at least 10 digits (US-friendly default).
const digitCount = (v: string) => v.replace(/\D/g, "").length;
const isPhoneShape = (v: string) => {
  const d = digitCount(v);
  return d >= 10 && d <= 15;
};

// Format US-style as the user types: (555) 123-4567. Internationals (starting
// with + or with >10 digits) are passed through with light cleanup so we
// don't mangle them.
const formatPhone = (v: string): string => {
  const trimmed = v.trim();
  if (trimmed.startsWith("+")) {
    return "+" + trimmed.slice(1).replace(/[^\d\s\-()]/g, "");
  }
  const d = trimmed.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

type EmailStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok" }
  | { kind: "syntax" }
  | { kind: "disposable" }
  | { kind: "no_mx" }
  | { kind: "typo"; suggestion: string }
  | { kind: "rate_limited" };

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

  const [emailStatus, setEmailStatus] = useState<EmailStatus>({ kind: "idle" });
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  // Tracks the last email value we verified, so we don't keep re-hitting the
  // edge function while the user re-focuses the field without changes.
  const lastVerifiedRef = useRef<string>("");

  // Reset whenever the dialog closes so reopening starts fresh.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setForm(EMPTY_FORM);
        setSubmitted(false);
        setError(null);
        setSubmitting(false);
        setEmailStatus({ kind: "idle" });
        setEmailTouched(false);
        setPhoneTouched(false);
        lastVerifiedRef.current = "";
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  const update = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "email") {
      // Any edit invalidates the previous deliverability result.
      setEmailStatus({ kind: "idle" });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }));
  };

  const verifyEmail = async (value: string): Promise<EmailStatus> => {
    const trimmed = value.trim().toLowerCase();
    if (!isEmailShape(trimmed)) return { kind: "syntax" };
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "verify-email",
        { body: { email: trimmed } },
      );
      if (fnError) {
        // Network/server hiccup — fail open so we don't block real users.
        console.warn("[verify-email] invoke failed", fnError);
        return { kind: "ok" };
      }
      if (data?.ok) return { kind: "ok" };
      const reason = data?.reason as string | undefined;
      if (reason === "typo" && data?.suggestion) {
        return { kind: "typo", suggestion: data.suggestion as string };
      }
      if (reason === "disposable") return { kind: "disposable" };
      if (reason === "no_mx") return { kind: "no_mx" };
      if (reason === "rate_limited") return { kind: "rate_limited" };
      return { kind: "syntax" };
    } catch (err) {
      console.warn("[verify-email] threw", err);
      return { kind: "ok" };
    }
  };

  const handleEmailBlur = async () => {
    setEmailTouched(true);
    const value = form.email.trim().toLowerCase();
    if (!value) return;
    if (!isEmailShape(value)) {
      setEmailStatus({ kind: "syntax" });
      return;
    }
    if (value === lastVerifiedRef.current && emailStatus.kind === "ok") return;
    setEmailStatus({ kind: "checking" });
    const result = await verifyEmail(value);
    lastVerifiedRef.current = value;
    setEmailStatus(result);
  };

  const acceptSuggestion = (suggestion: string) => {
    setForm((f) => ({ ...f, email: suggestion }));
    setEmailStatus({ kind: "idle" });
    lastVerifiedRef.current = "";
  };

  const emailLooksOk =
    isEmailShape(form.email) &&
    emailStatus.kind !== "syntax" &&
    emailStatus.kind !== "disposable" &&
    emailStatus.kind !== "no_mx" &&
    emailStatus.kind !== "typo";

  const phoneLooksOk = isPhoneShape(form.phone);

  const canSubmit =
    form.name.trim().length > 0 &&
    emailLooksOk &&
    phoneLooksOk &&
    form.garment.trim().length > 0 &&
    emailStatus.kind !== "checking" &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    // Final pre-flight verification — catches the case where the user never
    // blurred the email field before hitting submit.
    const trimmedEmail = form.email.trim().toLowerCase();
    if (trimmedEmail !== lastVerifiedRef.current) {
      setEmailStatus({ kind: "checking" });
      const result = await verifyEmail(trimmedEmail);
      lastVerifiedRef.current = trimmedEmail;
      setEmailStatus(result);
      if (result.kind !== "ok") {
        setSubmitting(false);
        setEmailTouched(true);
        return;
      }
    }

    const { error: insertError } = await supabase
      .from("custom_requests")
      .insert({
        name: form.name.trim(),
        email: trimmedEmail,
        phone: form.phone.trim(),
        garment: form.garment.trim(),
        notes: form.notes.trim() || null,
        design_id: designId ?? null,
        design_name: designName ?? null,
      });

    setSubmitting(false);

    if (insertError) {
      console.error("[custom_requests insert failed]", insertError);
      setError(insertError.message ?? "unknown error");
      return;
    }

    setSubmitted(true);
  };

  const renderEmailFeedback = () => {
    if (!emailTouched) return null;
    if (emailStatus.kind === "checking") {
      return (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking that this address actually receives mail…
        </p>
      );
    }
    if (emailStatus.kind === "ok") {
      return (
        <p className="text-[11px] text-[#fde047] flex items-center gap-1.5">
          <Check className="h-3 w-3" />
          Looks good.
        </p>
      );
    }
    if (emailStatus.kind === "syntax" && form.email.length > 0) {
      return (
        <p className="text-[11px] text-destructive flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          That doesn't look like a valid email address.
        </p>
      );
    }
    if (emailStatus.kind === "disposable") {
      return (
        <p className="text-[11px] text-destructive flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          Please use a real email — temporary inboxes won't work.
        </p>
      );
    }
    if (emailStatus.kind === "no_mx") {
      return (
        <p className="text-[11px] text-destructive flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          We can't reach that domain. Please add a real working email.
        </p>
      );
    }
    if (emailStatus.kind === "typo") {
      return (
        <p className="text-[11px] text-destructive flex items-center gap-1.5 flex-wrap">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Did you mean{" "}
          <button
            type="button"
            onClick={() => acceptSuggestion(emailStatus.suggestion)}
            className="underline underline-offset-2 font-medium text-foreground hover:text-[#fde047]"
          >
            {emailStatus.suggestion}
          </button>
          ?
        </p>
      );
    }
    if (emailStatus.kind === "rate_limited") {
      return (
        <p className="text-[11px] text-destructive">
          Too many checks — wait a few seconds and try again.
        </p>
      );
    }
    return null;
  };

  const renderPhoneFeedback = () => {
    if (!phoneTouched || form.phone.length === 0) return null;
    if (!phoneLooksOk) {
      return (
        <p className="text-[11px] text-destructive flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          Please enter a real phone number (at least 10 digits).
        </p>
      );
    }
    return null;
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
                    onBlur={handleEmailBlur}
                    autoComplete="email"
                    required
                    disabled={submitting}
                    aria-invalid={
                      emailTouched &&
                      emailStatus.kind !== "ok" &&
                      emailStatus.kind !== "checking" &&
                      emailStatus.kind !== "idle"
                    }
                  />
                  {renderEmailFeedback()}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="cgr-phone"
                    className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground"
                  >
                    Phone *
                  </Label>
                  <Input
                    id="cgr-phone"
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={handlePhoneChange}
                    onBlur={() => setPhoneTouched(true)}
                    placeholder="(555) 123-4567"
                    autoComplete="tel"
                    required
                    disabled={submitting}
                    aria-invalid={phoneTouched && !phoneLooksOk && form.phone.length > 0}
                  />
                  {renderPhoneFeedback()}
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
