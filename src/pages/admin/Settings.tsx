import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

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
    business_name: "",
    from_name: "",
    from_email: "",
    support_email: "",
    printer_email: "",
    fulfillment_provider: "local_printer",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        business_name: settings.business_name,
        from_name: settings.from_name,
        from_email: settings.from_email,
        support_email: settings.support_email,
        printer_email: settings.printer_email ?? "",
        fulfillment_provider: settings.fulfillment_provider,
      });
    }
  }, [settings]);

  useEffect(() => {
    if (templates && templates.length > 0 && !activeTpl) {
      setActiveTpl(templates[0].key);
    }
  }, [templates, activeTpl]);

  const saveSettings = async () => {
    const { error } = await supabase
      .from("settings")
      .update({ ...form, printer_email: form.printer_email || null })
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
    const { error } = await supabase
      .from("email_templates")
      .update(tplForm)
      .eq("key", tpl.key);
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

      <TabsContent value="business">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="font-display tracking-widest">BUSINESS DETAILS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Business name" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} />
            <Field label="From name" value={form.from_name} onChange={(v) => setForm({ ...form, from_name: v })} />
            <Field label="From email" value={form.from_email} onChange={(v) => setForm({ ...form, from_email: v })} type="email" />
            <Field label="Support email" value={form.support_email} onChange={(v) => setForm({ ...form, support_email: v })} type="email" />
            <Button
              onClick={saveSettings}
              className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest"
            >
              <Save className="h-4 w-4 mr-1.5" /> SAVE
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="fulfillment">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="font-display tracking-widest">FULFILLMENT</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select
                value={form.fulfillment_provider}
                onValueChange={(v) => setForm({ ...form, fulfillment_provider: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="local_printer">Local printer (email)</SelectItem>
                  <SelectItem value="pod_provider">Print-on-demand (Phase 2)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Local printer emails new orders to the address below. POD provider integration is stubbed for Phase 2.
              </p>
            </div>
            <Field
              label="Printer email"
              value={form.printer_email}
              onChange={(v) => setForm({ ...form, printer_email: v })}
              type="email"
              placeholder="printer@example.com"
            />
            <Button
              onClick={saveSettings}
              className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest"
            >
              <Save className="h-4 w-4 mr-1.5" /> SAVE
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

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
                  Variables: {tpl.variables.map((v) => `{{${v}}}`).join(", ")}
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
                <Button
                  onClick={saveTemplate}
                  className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest"
                >
                  <Save className="h-4 w-4 mr-1.5" /> SAVE TEMPLATE
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

export default Settings;
