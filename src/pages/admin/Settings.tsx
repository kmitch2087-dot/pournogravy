import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Printer, Info, Truck, ExternalLink, Plus, Building2, CheckCircle2, MapPin, Pencil, X } from "lucide-react";
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

const VENDOR_SERVICES = [
  { id: "dtg",          label: "DTG Printing" },
  { id: "screen",       label: "Screen Printing" },
  { id: "embroidery",   label: "Embroidery" },
  { id: "fulfillment",  label: "Fulfillment/Shipping" },
];

const VENDOR_FILE_FORMATS = [
  { id: "png", label: "PNG" },
  { id: "pdf", label: "PDF" },
  { id: "ai",  label: "AI" },
  { id: "psd", label: "PSD" },
];

const TURNAROUND_OPTIONS = [
  { value: "1-3 days", label: "1–3 days" },
  { value: "3-5 days", label: "3–5 days" },
  { value: "5-7 days", label: "5–7 days" },
  { value: "2 weeks",  label: "2 weeks" },
];

const EMPTY_VENDOR_FORM = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  services: [] as string[],
  turnaround: "",
  min_order_qty: "",
  notes: "",
  file_formats: [] as string[],
};

type VendorRow = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  services: string[] | null;
  turnaround: string | null;
  min_order_qty: number | null;
  notes: string | null;
  file_formats: string[] | null;
  active: boolean;
  created_at: string;
};

const Settings = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeTpl, setActiveTpl] = useState<string | null>(null);
  const [vendorSheetOpen, setVendorSheetOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState({ ...EMPTY_VENDOR_FORM });
  const [addingVendor, setAddingVendor] = useState(false);

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

  const { data: shippingZones = [], refetch: refetchZones } = useQuery<{
    id: string; zone_name: string; description: string | null;
    price_cents: number; states: string[] | null; sort_order: number; updated_at: string;
  }[]>({
    queryKey: ["shipping-zones"],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_zones").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const { data: marketRates = [] } = useQuery<{
    id: string; carrier: string; service: string; zone_label: string;
    weight_label: string; rate_cents: number; effective_date: string; last_updated: string;
  }[]>({
    queryKey: ["shipping-market-rates"],
    staleTime: 60 * 60_000, // 1 hour — these don't change frequently
    queryFn: async () => {
      const { data } = await supabase
        .from("shipping_market_rates")
        .select("*")
        .order("carrier")
        .order("zone_label");
      return data ?? [];
    },
  });

  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [zonePrice, setZonePrice] = useState("");
  const [savingZone, setSavingZone] = useState(false);

  const saveZonePrice = async (zoneId: string) => {
    const cents = Math.round(parseFloat(zonePrice || "0") * 100);
    if (isNaN(cents) || cents <= 0) return;
    setSavingZone(true);
    const { error } = await supabase
      .from("shipping_zones")
      .update({ price_cents: cents, updated_at: new Date().toISOString() })
      .eq("id", zoneId);
    if (error) toast.error(error.message);
    else { toast.success("Zone price updated"); refetchZones(); }
    setEditingZone(null);
    setZonePrice("");
    setSavingZone(false);
  };

  const { data: vendors, refetch: refetchVendors } = useQuery({
    queryKey: ["fulfillment-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fulfillment_vendors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VendorRow[];
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
    // Shipping
    shipping_fee: "5.99",
    shipping_standard: "7.99",
    shipping_express: "14.99",
    free_shipping_threshold: "",
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
      shipping_fee:        settings.shipping_fee_cents != null ? (settings.shipping_fee_cents / 100).toFixed(2) : "5.99",
      shipping_standard:   (settings as any).shipping_standard_cents != null ? ((settings as any).shipping_standard_cents / 100).toFixed(2) : "7.99",
      shipping_express:    (settings as any).shipping_express_cents  != null ? ((settings as any).shipping_express_cents  / 100).toFixed(2) : "14.99",
      free_shipping_threshold: settings.free_shipping_threshold_cents != null
        ? (settings.free_shipping_threshold_cents / 100).toFixed(0)
        : "",
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

  const toggleVendorService = (id: string) =>
    setVendorForm((f) => ({
      ...f,
      services: f.services.includes(id)
        ? f.services.filter((x) => x !== id)
        : [...f.services, id],
    }));

  const toggleVendorFormat = (id: string) =>
    setVendorForm((f) => ({
      ...f,
      file_formats: f.file_formats.includes(id)
        ? f.file_formats.filter((x) => x !== id)
        : [...f.file_formats, id],
    }));

  const setVendorAsActive = async (vendor: VendorRow) => {
    const { error } = await supabase
      .from("settings")
      .update({
        fulfillment_provider: "local_printer",
        printer_email: vendor.email,
        printer_name: vendor.company_name,
      })
      .eq("id", 1);
    if (error) toast.error(error.message);
    else {
      toast.success(`${vendor.company_name} set as active printer`);
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    }
  };

  const submitAddVendor = async () => {
    if (!vendorForm.company_name.trim()) return toast.error("Company name is required");
    if (!vendorForm.email.trim())        return toast.error("Email is required");
    setAddingVendor(true);
    try {
      const { error } = await supabase.functions.invoke("add-fulfillment-vendor", {
        body: {
          company_name:   vendorForm.company_name.trim(),
          contact_name:   vendorForm.contact_name.trim() || null,
          email:          vendorForm.email.trim(),
          phone:          vendorForm.phone.trim() || null,
          services:       vendorForm.services,
          turnaround:     vendorForm.turnaround || null,
          min_order_qty:  vendorForm.min_order_qty ? parseInt(vendorForm.min_order_qty) : null,
          notes:          vendorForm.notes.trim() || null,
          file_formats:   vendorForm.file_formats,
        },
      });
      if (error) throw error;
      toast.success(`${vendorForm.company_name} added to vendor network`);
      setVendorForm({ ...EMPTY_VENDOR_FORM });
      setVendorSheetOpen(false);
      refetchVendors();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add vendor");
    } finally {
      setAddingVendor(false);
    }
  };

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
        shipping_fee_cents:   Math.round(parseFloat(form.shipping_fee || "5.99") * 100),
        shipping_standard_cents: Math.round(parseFloat(form.shipping_standard || "7.99") * 100),
        shipping_express_cents:  Math.round(parseFloat(form.shipping_express  || "14.99") * 100),
        free_shipping_threshold_cents: form.free_shipping_threshold
          ? Math.round(parseFloat(form.free_shipping_threshold) * 100)
          : null,
      })
      .eq("id", 1);

    if (error) toast.error(error.message);
    else {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    }
  };

  const [tplForm, setTplForm] = useState<{
    subject: string; body_html: string; body_text: string;
    to_email: string; variables: Record<string, string>;
  }>({ subject: "", body_html: "", body_text: "", to_email: "", variables: {} });
  const [sendingTest, setSendingTest] = useState(false);

  const tpl = templates?.find((t) => t.key === activeTpl);

  useEffect(() => {
    if (tpl) {
      const vars: Record<string, string> = {};
      (tpl.variables ?? []).forEach((v: string) => { vars[v] = ""; });
      setTplForm((f) => ({ subject: tpl.subject, body_html: tpl.body_html, body_text: tpl.body_text, to_email: f.to_email, variables: vars }));
    }
  }, [tpl]);

  const saveTemplate = async () => {
    if (!tpl) return;
    const { error } = await supabase.from("email_templates").update({
      subject: tplForm.subject, body_html: tplForm.body_html, body_text: tplForm.body_text,
    }).eq("key", tpl.key);
    if (error) toast.error(error.message);
    else {
      toast.success("Template saved");
      qc.invalidateQueries({ queryKey: ["admin-email-templates"] });
    }
  };

  const sendTestEmail = async () => {
    if (!tpl || !tplForm.to_email) return toast.error("Enter a To email first");
    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke("send-notification", {
        body: { templateKey: tpl.key, recipient: tplForm.to_email, variables: tplForm.variables },
      });
      if (error) throw error;
      toast.success(`Test email sent to ${tplForm.to_email}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeVendorEmail = settings?.printer_email ?? "";

  return (
    <>
      <Tabs defaultValue="business" className="space-y-6">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
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

        {/* ── Shipping ── */}
        <TabsContent value="shipping">
          <Card className="max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="font-display tracking-widest">SHIPPING</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Flat rate applied to every order at checkout. Set a free shipping threshold once you're ready to run that promotion.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>Flat shipping fee ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.shipping_fee}
                  onChange={(e) => setForm({ ...form, shipping_fee: e.target.value })}
                  placeholder="5.99"
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">Charged on every order unless the free shipping threshold is met.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Free shipping threshold ($) — optional</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.free_shipping_threshold}
                  onChange={(e) => setForm({ ...form, free_shipping_threshold: e.target.value })}
                  placeholder="Leave blank to always charge shipping"
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Orders at or above this amount get free shipping. Leave blank to disable.
                </p>
              </div>
              {form.free_shipping_threshold && (
                <div className="p-3 bg-[#fde047]/5 border border-[#fde047]/20 rounded-sm text-xs text-muted-foreground">
                  Orders under <strong className="text-foreground">${form.free_shipping_threshold}</strong> → ship for <strong className="text-foreground">${parseFloat(form.shipping_fee || "0").toFixed(2)}</strong>.
                  Orders <strong className="text-foreground">${form.free_shipping_threshold}+</strong> → free shipping.
                </div>
              )}
              <SaveBtn onClick={saveSettings} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Fulfillment ── */}
        <TabsContent value="fulfillment">
          <div className="max-w-3xl space-y-6">

            {/* ── Fulfillment Partners ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="font-display tracking-widest">FULFILLMENT PARTNERS</CardTitle>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setVendorSheetOpen(true)}
                    className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest gap-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    ADD NEW VENDOR
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Manage your printer/fulfillment contacts. "Set as Active" wires their email into the order notification pipeline.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Active partner callout */}
                {activeVendorEmail && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-[#fde047]/5 border border-[#fde047]/20 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-[#fde047] shrink-0" />
                    <span>
                      <span className="text-muted-foreground">Active printer: </span>
                      <span className="font-medium text-foreground">{settings?.printer_name || activeVendorEmail}</span>
                      {settings?.printer_name && (
                        <span className="text-muted-foreground ml-1">({activeVendorEmail})</span>
                      )}
                    </span>
                  </div>
                )}

                {/* Vendors table */}
                {(!vendors || vendors.length === 0) ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No vendors added yet. Click "Add New Vendor" to add your first fulfillment partner.
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Services</TableHead>
                          <TableHead>Turnaround</TableHead>
                          <TableHead className="w-28"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendors.map((v) => {
                          const isActive = v.email === activeVendorEmail && activeVendorEmail !== "";
                          return (
                            <TableRow key={v.id} className={isActive ? "bg-[#fde047]/5" : ""}>
                              <TableCell>
                                <div className="font-medium text-sm">{v.company_name}</div>
                                <div className="text-xs text-muted-foreground">{v.email}</div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {v.contact_name ?? "—"}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {(v.services ?? []).map((s) => (
                                    <Badge key={s} variant="secondary" className="text-xs">
                                      {VENDOR_SERVICES.find((vs) => vs.id === s)?.label ?? s}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {v.turnaround ?? "—"}
                              </TableCell>
                              <TableCell>
                                {isActive ? (
                                  <Badge className="bg-[#fde047] text-black text-xs font-display">ACTIVE</Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7"
                                    onClick={() => setVendorAsActive(v)}
                                  >
                                    Set as Active
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

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

            {/* ── Shipping Zones ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="font-display tracking-widest">SHIPPING ZONES</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  What you charge customers per zone. Click a price to edit it inline. Market rates (USPS/UPS/FedEx)
                  shown alongside so you can see at a glance if you're over or under.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {shippingZones.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No zones found — apply migration 20260616000012_shipping_zones.sql to seed default zones.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {shippingZones.map((zone) => {
                      const competitors = marketRates.filter(
                        (r) => r.zone_label === zone.zone_name,
                      );
                      const lowestMarket = competitors.length
                        ? Math.min(...competitors.map((r) => r.rate_cents))
                        : null;
                      const isEditing = editingZone === zone.id;
                      const diff = lowestMarket != null ? zone.price_cents - lowestMarket : null;

                      return (
                        <div key={zone.id} className="border border-border rounded-md overflow-hidden">
                          {/* Zone header row */}
                          <div className="flex items-center gap-3 px-4 py-3 bg-muted/20">
                            <div className="flex-1 min-w-0">
                              <p className="font-display tracking-widest text-sm">{zone.zone_name}</p>
                              {zone.description && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">{zone.description}</p>
                              )}
                              {zone.states && zone.states.length > 0 && (
                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                  {zone.states.join(", ")}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm text-muted-foreground">$</span>
                                  <Input
                                    value={zonePrice}
                                    onChange={(e) => setZonePrice(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveZonePrice(zone.id);
                                      if (e.key === "Escape") { setEditingZone(null); setZonePrice(""); }
                                    }}
                                    className="h-7 w-20 text-sm"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 bg-[#fde047] text-black hover:bg-[#fde047]/90"
                                    onClick={() => saveZonePrice(zone.id)}
                                    disabled={savingZone}
                                  >
                                    {savingZone ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2"
                                    onClick={() => { setEditingZone(null); setZonePrice(""); }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingZone(zone.id);
                                    setZonePrice((zone.price_cents / 100).toFixed(2));
                                  }}
                                  className="flex items-center gap-1.5 group"
                                >
                                  <span className="font-display text-lg tracking-wider text-[#fde047]">
                                    ${(zone.price_cents / 100).toFixed(2)}
                                  </span>
                                  <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              )}
                              {diff != null && (
                                <span className={cn(
                                  "text-[9px] font-marker tracking-wider px-1.5 py-0.5 rounded",
                                  diff > 0
                                    ? "bg-red-500/10 text-red-400"
                                    : diff < 0
                                    ? "bg-green-500/10 text-green-400"
                                    : "bg-muted text-muted-foreground",
                                )}>
                                  {diff > 0 ? `+$${(diff / 100).toFixed(2)} vs market` : diff < 0 ? `-$${(Math.abs(diff) / 100).toFixed(2)} vs market` : "at market"}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Market rate comparison */}
                          {competitors.length > 0 && (
                            <div className="px-4 py-2 bg-muted/5 border-t border-border">
                              <p className="text-[9px] font-marker tracking-widest text-muted-foreground uppercase mb-1.5">
                                Market rates ({competitors[0].weight_label})
                              </p>
                              <div className="flex flex-wrap gap-3">
                                {competitors.map((r) => (
                                  <div key={r.id} className="flex items-baseline gap-1">
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                      {r.carrier} {r.service}:
                                    </span>
                                    <span className={cn(
                                      "text-[10px] font-display tracking-wider",
                                      r.rate_cents < zone.price_cents ? "text-green-400" : r.rate_cents > zone.price_cents ? "text-red-400" : "text-foreground",
                                    )}>
                                      ${(r.rate_cents / 100).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <p className="text-[8px] text-muted-foreground/50 mt-1">
                                As of {new Date(competitors[0].effective_date).toLocaleDateString()} · {competitors[0].source_note ?? ""}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <p className="text-[9px] text-muted-foreground/60">
                      Tip: green = you're under market (you could charge more); red = you're over market (customer may shop elsewhere).
                      Market rates shown are approximate commercial base rates for a 1 lb parcel.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* ── Email Templates ── moved to dedicated page ── */}
        <TabsContent value="emails">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="font-display tracking-widest">EMAIL TEMPLATES</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Templates have been moved to their own full-featured editor page — rich visual editing,
                live preview, variable palette, and test sends, all in one place.
              </p>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate("/admin/email-templates")}
                className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                OPEN EMAIL TEMPLATES
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Add New Vendor Sheet ── */}
      <Sheet open={vendorSheetOpen} onOpenChange={setVendorSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="font-display tracking-widest">ADD FULFILLMENT VENDOR</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <Field
              label="Company Name *"
              value={vendorForm.company_name}
              onChange={(v) => setVendorForm({ ...vendorForm, company_name: v })}
              placeholder="e.g. Bob's Custom Tees"
            />
            <Field
              label="Contact Name"
              value={vendorForm.contact_name}
              onChange={(v) => setVendorForm({ ...vendorForm, contact_name: v })}
              placeholder="e.g. Bob Smith"
            />
            <Field
              label="Email *"
              value={vendorForm.email}
              onChange={(v) => setVendorForm({ ...vendorForm, email: v })}
              type="email"
              placeholder="orders@vendor.com"
            />
            <Field
              label="Phone"
              value={vendorForm.phone}
              onChange={(v) => setVendorForm({ ...vendorForm, phone: v })}
              placeholder="(555) 555-5555"
            />

            {/* Services */}
            <div className="space-y-2">
              <Label>Services Offered</Label>
              <div className="grid grid-cols-2 gap-2">
                {VENDOR_SERVICES.map(({ id, label }) => {
                  const checked = vendorForm.services.includes(id);
                  return (
                    <div
                      key={id}
                      onClick={() => toggleVendorService(id)}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition select-none text-sm",
                        checked
                          ? "border-[#fde047]/40 bg-[#fde047]/5 text-foreground"
                          : "border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleVendorService(id)}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      />
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Turnaround */}
            <div className="space-y-1.5">
              <Label>Turnaround Time</Label>
              <Select
                value={vendorForm.turnaround}
                onValueChange={(v) => setVendorForm({ ...vendorForm, turnaround: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select turnaround…" /></SelectTrigger>
                <SelectContent>
                  {TURNAROUND_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min order qty */}
            <div className="space-y-1.5">
              <Label>Minimum Order Quantity</Label>
              <Input
                type="number"
                min="0"
                value={vendorForm.min_order_qty}
                onChange={(e) => setVendorForm({ ...vendorForm, min_order_qty: e.target.value })}
                placeholder="e.g. 12"
                className="max-w-xs"
              />
            </div>

            {/* File formats */}
            <div className="space-y-2">
              <Label>Accepted File Formats</Label>
              <div className="flex flex-wrap gap-2">
                {VENDOR_FILE_FORMATS.map(({ id, label }) => {
                  const checked = vendorForm.file_formats.includes(id);
                  return (
                    <div
                      key={id}
                      onClick={() => toggleVendorFormat(id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer transition select-none text-sm",
                        checked
                          ? "border-[#fde047]/40 bg-[#fde047]/5 text-foreground"
                          : "border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleVendorFormat(id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3 w-3 shrink-0"
                      />
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={vendorForm.notes}
                onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                rows={3}
                placeholder="Any special requirements, pricing info, or working arrangements…"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              A welcome email will be sent to the vendor's email address when you submit.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={submitAddVendor}
                disabled={addingVendor}
                className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest gap-2"
              >
                {addingVendor && <Loader2 className="h-4 w-4 animate-spin" />}
                ADD VENDOR
              </Button>
              <Button
                variant="outline"
                onClick={() => { setVendorSheetOpen(false); setVendorForm({ ...EMPTY_VENDOR_FORM }); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
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
