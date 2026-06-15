import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EasterEgg {
  id: string;
  category: "table_name" | "server_name" | "special_instruction" | "footer_note";
  text: string;
  active: boolean;
  created_at: string;
}

interface Settings {
  easter_eggs_mode: "random" | "fixed";
  easter_eggs_fixed_table_name: string | null;
  easter_eggs_fixed_server_name: string | null;
  easter_eggs_fixed_special_instruction: string | null;
  easter_eggs_fixed_footer_note: string | null;
}

const CATEGORIES: { key: EasterEgg["category"]; label: string }[] = [
  { key: "table_name",          label: "Table Names" },
  { key: "server_name",         label: "Server Names" },
  { key: "special_instruction", label: "Special Instructions" },
  { key: "footer_note",         label: "Footer Notes" },
];

const FIXED_FIELD: Record<EasterEgg["category"], keyof Settings> = {
  table_name:          "easter_eggs_fixed_table_name",
  server_name:         "easter_eggs_fixed_server_name",
  special_instruction: "easter_eggs_fixed_special_instruction",
  footer_note:         "easter_eggs_fixed_footer_note",
};

// ── EasterEggs page ───────────────────────────────────────────────────────────

const EasterEggs = () => {
  const qc = useQueryClient();

  // ── Data fetching ────────────────────────────────────────────────────────────

  const { data: eggs = [], isLoading: eggsLoading } = useQuery<EasterEgg[]>({
    queryKey: ["easter-eggs"],
    queryFn: async () => {
      // Admin can see all eggs including inactive — bypass the public policy by
      // not filtering on active. RLS "Admin full access" policy permits this.
      const { data, error } = await supabase
        .from("product_easter_eggs")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EasterEgg[];
    },
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<Settings>({
    queryKey: ["settings-easter-eggs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select(
          "easter_eggs_mode, easter_eggs_fixed_table_name, easter_eggs_fixed_server_name, easter_eggs_fixed_special_instruction, easter_eggs_fixed_footer_note"
        )
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data as Settings;
    },
  });

  // ── Settings mutations ────────────────────────────────────────────────────────

  const updateSettings = useMutation({
    mutationFn: async (patch: Partial<Settings>) => {
      const { error } = await supabase
        .from("settings")
        .update(patch)
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-easter-eggs"] });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  // ── Egg mutations ─────────────────────────────────────────────────────────────

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("product_easter_eggs")
        .update({ active: !active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["easter-eggs"] }),
    onError: () => toast.error("Update failed"),
  });

  const updateText = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await supabase
        .from("product_easter_eggs")
        .update({ text })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["easter-eggs"] });
      toast.success("Updated");
    },
    onError: () => toast.error("Update failed"),
  });

  const deleteEgg = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_easter_eggs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["easter-eggs"] });
      toast.success("Deleted");
    },
    onError: () => toast.error("Delete failed"),
  });

  const addEgg = useMutation({
    mutationFn: async ({ category, text }: { category: EasterEgg["category"]; text: string }) => {
      const { error } = await supabase
        .from("product_easter_eggs")
        .insert({ category, text, active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["easter-eggs"] });
      toast.success("Added");
    },
    onError: () => toast.error("Failed to add"),
  });

  const isLoading = eggsLoading || settingsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const mode = settings?.easter_eggs_mode ?? "random";

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-[#fde047]/10 rounded-sm mt-0.5">
          <Sparkles className="h-4 w-4 text-[#fde047]" />
        </div>
        <div>
          <h1 className="font-display text-xl tracking-widest">GUEST CHECK EASTER EGGS</h1>
          <p className="text-xs text-muted-foreground mt-1 font-marker tracking-widest">
            The dumb little jokes on the product cards. Opie-approved.
          </p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="border border-border bg-card p-5 space-y-4">
        <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase">Easter Egg Mode</p>
        <div className="flex flex-wrap gap-3">
          {(["random", "fixed"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                if (m !== mode) updateSettings.mutate({ easter_eggs_mode: m });
              }}
              className={`px-4 py-2 text-sm font-display tracking-widest border transition-colors ${
                mode === m
                  ? "border-[#fde047] bg-[#fde047]/10 text-[#fde047]"
                  : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              {m === "random" ? "Random (different every load)" : "Fixed (same one always)"}
            </button>
          ))}
        </div>

        {/* Fixed selectors — only shown when mode = 'fixed' */}
        <AnimatePresence>
          {mode === "fixed" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {CATEGORIES.map(({ key, label }) => {
                  const field = FIXED_FIELD[key];
                  const currentVal = settings?.[field] as string | null;
                  const categoryEggs = eggs.filter((e) => e.category === key && e.active);
                  return (
                    <div key={key}>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-marker block mb-1">
                        {label}
                      </label>
                      <select
                        value={currentVal ?? ""}
                        onChange={(e) =>
                          updateSettings.mutate({ [field]: e.target.value || null } as Partial<Settings>)
                        }
                        className="w-full px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:border-[#fde047] transition-colors"
                      >
                        <option value="">— pick one —</option>
                        {categoryEggs.map((egg) => (
                          <option key={egg.id} value={egg.id}>
                            {egg.text}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Manage Eggs — tabbed by category */}
      <div className="border border-border bg-card">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-[#fde047]" />
          <h2 className="font-display tracking-widest text-sm">MANAGE EGGS</h2>
        </div>

        <Tabs defaultValue="table_name" className="p-4 space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            {CATEGORIES.map(({ key, label }) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map(({ key, label }) => (
            <TabsContent key={key} value={key} className="mt-0 space-y-3">
              <EggCategoryTab
                category={key}
                label={label}
                eggs={eggs.filter((e) => e.category === key)}
                onToggle={(id, active) => toggleActive.mutate({ id, active })}
                onUpdateText={(id, text) => updateText.mutate({ id, text })}
                onDelete={(id) => {
                  if (confirm("Delete this egg?")) deleteEgg.mutate(id);
                }}
                onAdd={(text) => addEgg.mutate({ category: key, text })}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

// ── Per-category tab ──────────────────────────────────────────────────────────

interface EggCategoryTabProps {
  category: EasterEgg["category"];
  label: string;
  eggs: EasterEgg[];
  onToggle: (id: string, active: boolean) => void;
  onUpdateText: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string) => void;
}

function EggCategoryTab({
  label,
  eggs,
  onToggle,
  onUpdateText,
  onDelete,
  onAdd,
}: EggCategoryTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const handleAdd = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewText("");
    setShowAddForm(false);
  };

  const startEdit = (egg: EasterEgg) => {
    setEditingId(egg.id);
    setEditText(egg.text);
  };

  const commitEdit = (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    onUpdateText(id, trimmed);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  return (
    <div className="space-y-3">
      {/* Add new button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          className="h-8 text-xs font-display tracking-widest gap-1.5 bg-[#fde047] text-black hover:bg-[#fde047]/90"
          onClick={() => setShowAddForm((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5" />Add New
        </Button>
      </div>

      {/* Inline add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-[#fde047]/30 bg-[#fde047]/5 p-3 flex gap-2">
              <input
                autoFocus
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") { setShowAddForm(false); setNewText(""); }
                }}
                placeholder={`New ${label.toLowerCase().replace(/s$/, "")}…`}
                className="flex-1 px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
              />
              <Button
                size="sm"
                className="h-9 bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest"
                onClick={handleAdd}
                disabled={!newText.trim()}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                onClick={() => { setShowAddForm(false); setNewText(""); }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Egg list */}
      {eggs.length === 0 ? (
        <div className="py-8 text-center">
          <p className="font-marker text-muted-foreground italic text-sm">No {label.toLowerCase()} yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-border border border-border">
          {eggs.map((egg, i) => (
            <motion.div
              key={egg.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.2) }}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${!egg.active ? "opacity-40" : ""}`}
            >
              {/* Text — editable inline */}
              {editingId === egg.id ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(egg.id);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="flex-1 px-2 py-1 text-sm bg-transparent border border-[#fde047]/50 focus:outline-none focus:border-[#fde047] transition-colors"
                />
              ) : (
                <p className="flex-1 text-sm">{egg.text}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {editingId === egg.id ? (
                  <>
                    <button
                      onClick={() => commitEdit(egg.id)}
                      className="text-green-400 hover:text-green-300 transition-colors"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startEdit(egg)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Active toggle */}
                <button
                  onClick={() => onToggle(egg.id, egg.active)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={egg.active ? "Deactivate" : "Activate"}
                >
                  {egg.active
                    ? <ToggleRight className="h-5 w-5 text-green-400" />
                    : <ToggleLeft className="h-5 w-5" />}
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDelete(egg.id)}
                  className="text-muted-foreground hover:text-[#ff1744] transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EasterEggs;
