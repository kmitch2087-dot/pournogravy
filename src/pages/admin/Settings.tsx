import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Printer, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── File format options shown to the printer ─────────────────
const FILE_FORMAT_OPTIONS = [
  { id: "transparent_png", label: "Transparent PNG",   hint: "Raster, no background — most common for DTG" },
  { id: "svg",             label: "SVG",               hint: "Vector — scalable, preferred for vinyl/cut" },
  { id: "pdf",             label: "PDF",               hint: "Print-ready vector PDF" },
  { id: "ai",              label: "Adobe Illustrator (.ai)", hint: "Native AI file — editable vector" },
  { id: "eps",             label: "EPS",               hint: "Encapsulated PostScript — legacy vector" },
  { id: "vector_generic",  label: "Vector (any)",      hint: "Accepts any vector format" },
];

const DPI_OPTIONS = ["72", "150", "300", "600"];

const Settings = () => {
  const qc = useQueryClient();
  const [activeTpl, setActiveTpl] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["admin-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("key");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    // Business
    business_name: "",
    from_name: "",
    from_email: "",
    support_email: "",
    // Fulfillment routing (global default)
    fulfillment_provider: "local_printer",
    // Local printer contact
    printer_email: "",
    printer_name: "",
    // Print spec requirements
    printer_print_size: "",
    printer_dpi: "300",
    printer_dpi_custom: "",
    printer_file_formats: [] as string[],
    printer_notes: "",
  });

  useEffect(() => {
    if (!settings) return;
    const rawFormats: string[] = Array.isArray(settings.printer_file_formats)
      ? settings.printer_file_formats
      : [];
    const dpiVal: string = settings.printer_dpi ?? "300";
    const knownDpi = DPI_OPTIONS.includes(dpiVal);
    setForm({
      business_name:       settings.business_name     ?? "",
      from_name:           settings.from_name         ?? "",
      from_email:          settings.from_email        ?? "",
      support_email:       settings.support_email     ?? "",
      fulfillment_provider: settings.fulfillment_provider ?? "local_printer",
      printer_email:       settings.printer_email     ?? "",
      printer_name:        settings.printer_name      ?? "",
      printer_print_size:  settings.printer_print_size ?? "",
      printer_dpi:         knownDpi ? dpiVal : "custom",
      printer_dpi_custom:  knownDpi ? "" : dpiVal,
      printer_file_formats: rawFormats,
      printer_notes:       settings.printer_notes     ?? "",
    });
  }, [settings]);

  useEffect(() => {
    if (templates && templates.length > 0 && !activeTpl) setActiveTpl(templates[0].key);
  }, [templates, activeTpl]);

  const toggleFormat = (id: string) =>
    setForm((f) => ({
      ...f,
      printer_file_formats: f.printer_file_formats.includes(id)
        ? f.printer_file_formats.filter((x) => x !== id)
        : [...f.printer_file_formats, id],
    }));

  const saveSettings = async () => {
    const resolvedDpi = form.printer_dpi === "custom"
      ? form.printer_dpi_custom.trim()
      : form.printer_dpi;

    const { error } = await supabase
      .from("settings")
      .update({
        business_name:        form.business_name,
        from_name:            form.from_name,
        from_email:           form.from_email,
        support_email:        form.support_email,
        fulfillment_provider: form.fulfillment_provider,
        printer_email:        form.printer_email || null,
        printer_name:         form.printer_name  || null,
        printer_print_size:   form.printer_print_size || null,
        printer_dpi:          resolvedDpi || null,
        printer_file_formats: form.printer_file_formats.length > 0
          ? form.printer_file_formats
          : null,
        printer_notes:        form.printer_notes || null,
      })
      .eq("id", 1);

    if (error) toast.error(error.message);
    else {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    }
  };

  const tpl = templates?.find((t) => t.key === activeTpl);
  const [tplForm, setTplForm] = useState({ subject: "", body_html: "", body_text: "" });
  useEffect(() => {
    if (tpl) setTplForm({ subject: tpl.subject, body_html: tpl.body_html, body_text: tpl.body_text });
  }, [tpl]);

  const saveTemplate = async () => {
    if (!tpl) return;
    const { error } = await supabase.from("email_templates").update(tplForm).eq("key", tpl.key);
    if (error) toast.error(error.message);
    else {
      toast.success("Template saved");
      qc.invalidateQueries({ queryKey: ["admin-email-templates"] });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="business" className="space-y-6">
      <TabsList>
        <TabsTrigger value="business">Business</TabsTrigger>
        <TabsTrigger value="fulfillment">Fulfillment</TabsTrigger>
        <TabsTrigger value="emails">Email Templates</TabsTrigger>
      </TabsList>

      {/* ── Business ── */}
      <TabsContent value="business">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="font-display tracking-widest">BUSINESS DETAILS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Business name"  value={form.business_name}  onChange={(v) => setForm({ ...form, business_name: v })} />
            <Field label="From name"      value={form.from_name}      onChange={(v) => setForm({ ...form, from_name: v })} />
            <Field label="From email"     value={form.from_email}     onChange={(v) => setForm({ ...form, from_email: v })} type="email" />
            <Field label="Support email"  value={form.support_email}  onChange={(v) => setForm({ ...form, support_email: v })} type="email" />
            <SaveBtn onClick={saveSettings} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Fulfillment ── */}
      <TabsContent value="fulfillment">
        <div className="max-w-2xl space-y-6">

          {/* Global default routing */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest">DEFAULT FULFILLMENT ROUTE</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Sets the default for new products. Individual products can override this in their own settings.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Default provider</Label>
                <Select
                  value={form.fulfillment_provider}
                  onValueChange={(v) => setForm({ ...form, fulfillment_provider: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local_printer">🖨️ Local Printer — email-based, t-shirts only</SelectItem>
                    <SelectItem value="printful">Printful — premium, embroidery-capable</SelectItem>
                    <SelectItem value="printify">Printify — low-cost, large catalog</SelectItem>
                    <SelectItem value="manual">Manual / Self-fulfill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Local printer contact */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="font-display tracking-widest">LOCAL PRINTER</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                When an order routes to <strong>Local Printer</strong>, a notification email goes to this address with the order details and your print spec requirements below.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Printer / shop name" value={form.printer_name} onChange={(v) => setForm({ ...form, printer_name: v })} placeholder="e.g. Bob's Custom Tees" />
              <Field label="Printer email" value={form.printer_email} onChange={(v) => setForm({ ...form, printer_email: v })} type="email" placeholder="printer@example.com" />
            </CardContent>
          </Card>

          {/* Print spec requirements */}
          <Card className="border-[#fde047]/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#fde047]" />
                <CardTitle className="font-display tracking-widest text-[#fde047]">PRINT SPEC REQUIREMENTS</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                These specs are included in every order notification sent to your local printer so they know exactly what file format and resolution to ask for — and you never have to say it twice.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Print area size */}
              <div className="space-y-1.5">
                <Label>Print area size</Label>
                <Input
                  value={form.printer_print_size}
                  onChange={(e) => setForm({ ...form, printer_print_size: e.target.value })}
                  placeholder='e.g. 12" × 16" — front chest'
                />
                <p className="text-xs text-muted-foreground">Tells the printer the exact printable area dimensions.</p>
              </div>

              {/* DPI */}
              <div className="space-y-2">
                <Label>Required DPI (resolution)</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.printer_dpi}
                    onValueChange={(v) => setForm({ ...form, printer_dpi: v, printer_dpi_custom: "" })}
                  >
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DPI_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d}>{d} DPI</SelectItem>
                      ))}
                      <SelectItem value="custom">Custom…</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.printer_dpi === "custom" && (
                    <Input
                      value={form.printer_dpi_custom}
                      onChange={(e) => setForm({ ...form, printer_dpi_custom: e.target.value })}
                      placeholder="e.g. 240"
                      className="w-28"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  300 DPI is the industry standard for DTG and screen printing. 72 DPI is screen-only.
                </p>
              </div>

              {/* File format checkboxes */}
              <div className="space-y-2.5">
                <Label>Accepted file formats</Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  Check every format your printer can work with. If they prefer vectors, check SVG/AI/EPS. If they run DTG, Transparent PNG is usually all they need.
                </p>
                <div className="space-y-2 pt-1">
                  {FILE_FORMAT_OPTIONS.map(({ id, label, hint }) => {
                    const checked = form.printer_file_formats.includes(id);
                    return (
                      <div
                        key={id}
                        onClick={() => toggleFormat(id)}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-md border cursor-pointer transition select-none",
                          checked
                            ? "border-[#fde047]/40 bg-[#fde047]/5"
                            : "border-border bg-muted/20 hover:bg-muted/40"
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleFormat(id)}
                          className="mt-0.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <p className={cn("text-sm font-medium", checked && "text-[#fde047]")}>{label}</p>
                          <p className="text-xs text-muted-foreground">{hint}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Additional notes for printer</Label>
                <Textarea
                  value={form.printer_notes}
                  onChange={(e) => setForm({ ...form, printer_notes: e.target.value })}
                  rows={3}
                  placeholder="e.g. All artwork must have 0.25&quot; bleed. No CMYK conversion — submit RGB only."
                />
                <p className="text-xs text-muted-foreground">Appended verbatim to every printer order email.</p>
              </div>

              {/* Spec preview */}
              {(form.printer_print_size || form.printer_dpi || form.printer_file_formats.length > 0) && (
                <div className="p-4 rounded-md bg-zinc-900 border border-zinc-700 space-y-2">
                  <p className="text-[10px] font-marker tracking-widest uppercase text-muted-foreground">Preview — included in printer email</p>
                  <div className="text-xs space-y-1 font-mono text-zinc-300">
                    {form.printer_print_size && <p>📐 Print area: <span className="text-white">{form.printer_print_size}</span></p>}
                    {(form.printer_dpi !== "custom" ? form.printer_dpi : form.printer_dpi_custom) && (
                      <p>🖼️ Resolution: <span className="text-white">{form.printer_dpi === "custom" ? form.printer_dpi_custom : form.printer_dpi} DPI</span></p>
                    )}
                    {form.printer_file_formats.length > 0 && (
                      <p>📁 Accepted formats: <span className="text-white">
                        {form.printer_file_formats.map(id => FILE_FORMAT_OPTIONS.find(f => f.id === id)?.label ?? id).join(", ")}
                      </span></p>
                    )}
                    {form.printer_notes && <p>📝 Notes: <span className="text-white">{form.printer_notes}</span></p>}
                  </div>
                </div>
              )}

              <SaveBtn onClick={saveSettings} />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ── Email Templates ── */}
      <TabsContent value="emails">
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          <div className="space-y-1">
            {templates?.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTpl(t.key)}
                className={`w-full text-left px-3 py-2 text-sm rounded-sm border transition ${
                  activeTpl === t.key
                    ? "border-[#fde047] bg-[#fde047]/10 text-[#fde047]"
                    : "border-transparent hover:bg-muted/50"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
          {tpl && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display tracking-widest">{tpl.name.toUpperCase()}</CardTitle>
                <p className="text-xs text-muted-foreground">{tpl.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Variables: {tpl.variables.map((v: string) => `{{${v}}}`).join(", ")}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Subject" value={tplForm.subject} onChange={(v) => setTplForm({ ...tplForm, subject: v })} />
                <div className="space-y-1.5">
                  <Label>HTML body</Label>
                  <Textarea
                    value={tplForm.body_html}
                    onChange={(e) => setTplForm({ ...tplForm, body_html: e.target.value })}
                    rows={12}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Plain text body</Label>
                  <Textarea
                    value={tplForm.body_text}
                    onChange={(e) => setTplForm({ ...tplForm, body_text: e.target.value })}
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>
                <SaveBtn onClick={saveTemplate} label="SAVE TEMPLATE" />
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

// ── Helpers ──────────────────────────────────────────────────
const Field = ({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

const SaveBtn = ({ onClick, label = "SAVE" }: { onClick: () => void; label?: string }) => (
  <Button onClick={onClick} className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest">
    <Save className="h-4 w-4 mr-1.5" /> {label}
  </Button>
);

export default Settings;
