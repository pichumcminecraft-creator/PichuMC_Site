import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, Code, Video, Calendar, Hammer, Megaphone, ChevronDown, ChevronRight, Plus, Trash2, Save, X, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

const iconOptions = [
  { value: "shield", Icon: Shield },
  { value: "code", Icon: Code },
  { value: "video", Icon: Video },
  { value: "calendar", Icon: Calendar },
  { value: "hammer", Icon: Hammer },
  { value: "megaphone", Icon: Megaphone },
];

export function PositionsTab({ onRefresh }: { onRefresh: () => void }) {
  const [positions, setPositions] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<Record<string, any>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newPos, setNewPos] = useState({ name: "", description: "", icon: "shield", color: "#FFD700", requirements: [""] });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await adminFetch("positions");
      setPositions(data || []);
      const forms: Record<string, any> = {};
      (data || []).forEach((p: any) => {
        forms[p.id] = { ...p, requirements: p.requirements?.length ? [...p.requirements] : [""] };
      });
      setEditForms(forms);
    } catch {}
  };

  const toggleOpen = async (pos: any) => {
    try {
      await adminFetch("update-position", { id: pos.id, is_open: !pos.is_open });
      setPositions((prev) => prev.map((p) => (p.id === pos.id ? { ...p, is_open: !p.is_open } : p)));
      setEditForms((prev) => ({ ...prev, [pos.id]: { ...prev[pos.id], is_open: !pos.is_open } }));
      onRefresh();
      toast.success(`${pos.name} is nu ${pos.is_open ? "gesloten" : "open"}`);
    } catch {
      toast.error("Fout bij bijwerken");
    }
  };

  const savePosition = async (id: string) => {
    const form = editForms[id];
    const reqs = form.requirements.filter((r: string) => r.trim());
    const questions = (form.questions || []).filter((q: any) => q.key?.trim() && q.label?.trim());
    try {
      await adminFetch("update-position", {
        id, name: form.name, description: form.description, icon: form.icon,
        color: form.color, requirements: reqs, questions,
      });
      setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, ...form, requirements: reqs, questions } : p)));
      onRefresh();
      toast.success("Positie opgeslagen!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addPosition = async () => {
    const reqs = newPos.requirements.filter((r) => r.trim());
    try {
      const data = await adminFetch("add-position", { ...newPos, requirements: reqs });
      setPositions((prev) => [...prev, data]);
      setEditForms((prev) => ({ ...prev, [data.id]: { ...data, requirements: data.requirements?.length ? [...data.requirements] : [""] } }));
      setNewPos({ name: "", description: "", icon: "shield", color: "#FFD700", requirements: [""] });
      setShowAdd(false);
      onRefresh();
      toast.success("Positie aangemaakt!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deletePosition = async (id: string) => {
    try {
      await adminFetch("delete-position", { id });
      setPositions((prev) => prev.filter((p) => p.id !== id));
      onRefresh();
      toast.success("Positie verwijderd!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const movePosition = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= positions.length) return;

    const newPositions = [...positions];
    [newPositions[index], newPositions[newIndex]] = [newPositions[newIndex], newPositions[index]];
    setPositions(newPositions);

    try {
      await adminFetch("reorder-positions", {
        order: newPositions.map((position, positionIndex) => ({
          id: position.id,
          sort_order: positionIndex,
        })),
      });
      onRefresh();
    } catch {
      toast.error("Fout bij herordenen");
      load();
    }
  };

  const updateForm = (id: string, field: string, value: any) => {
    setEditForms((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const updateReq = (id: string, index: number, value: string) => {
    setEditForms((prev) => {
      const reqs = [...prev[id].requirements];
      reqs[index] = value;
      return { ...prev, [id]: { ...prev[id], requirements: reqs } };
    });
  };

  const addReq = (id: string) => {
    setEditForms((prev) => ({ ...prev, [id]: { ...prev[id], requirements: [...prev[id].requirements, ""] } }));
  };

  const removeReq = (id: string, index: number) => {
    setEditForms((prev) => {
      const reqs = prev[id].requirements.filter((_: any, i: number) => i !== index);
      return { ...prev, [id]: { ...prev[id], requirements: reqs.length ? reqs : [""] } };
    });
  };

  const RequirementsEditor = ({ reqs, onUpdate, onAdd, onRemove }: { reqs: string[]; onUpdate: (i: number, v: string) => void; onAdd: () => void; onRemove: (i: number) => void }) => (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Vereisten</Label>
      {reqs.map((req, i) => (
        <div key={i} className="flex gap-2">
          <Input value={req} onChange={(e) => onUpdate(i, e.target.value)} className="bg-secondary border-border" placeholder="Bijv. 14+ jaar oud" />
          <Button size="icon" variant="ghost" onClick={() => onRemove(i)} className="text-destructive shrink-0"><X className="w-4 h-4" /></Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={onAdd} className="gap-1"><Plus className="w-3 h-3" /> Vereiste toevoegen</Button>
    </div>
  );

  const IconPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <Label className="text-sm">Icoon</Label>
      <div className="flex gap-1 mt-1">
        {iconOptions.map(({ value: v, Icon }) => (
          <button key={v} onClick={() => onChange(v)} className={`w-9 h-9 rounded flex items-center justify-center transition-colors ${value === v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-foreground text-lg">Posities</h3>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1"><Plus className="w-4 h-4" /> Nieuwe Positie</Button>
      </div>

      {showAdd && (
        <div className="card-glow rounded-xl bg-card p-5 space-y-4">
          <h4 className="font-semibold text-foreground">Nieuwe Positie</h4>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Naam</Label><Input value={newPos.name} onChange={(e) => setNewPos({ ...newPos, name: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Bijv. Staff" /></div>
            <div>
              <Label>Kleur</Label>
              <div className="flex gap-2 mt-1">
                <div className="w-10 h-10 rounded" style={{ backgroundColor: newPos.color }} />
                <Input value={newPos.color} onChange={(e) => setNewPos({ ...newPos, color: e.target.value })} className="bg-secondary border-border" />
              </div>
            </div>
          </div>
          <div><Label>Beschrijving</Label><Textarea value={newPos.description} onChange={(e) => setNewPos({ ...newPos, description: e.target.value })} className="bg-secondary border-border mt-1" rows={2} /></div>
          <IconPicker value={newPos.icon} onChange={(v) => setNewPos({ ...newPos, icon: v })} />
          <RequirementsEditor
            reqs={newPos.requirements}
            onUpdate={(i, v) => { const r = [...newPos.requirements]; r[i] = v; setNewPos({ ...newPos, requirements: r }); }}
            onAdd={() => setNewPos({ ...newPos, requirements: [...newPos.requirements, ""] })}
            onRemove={(i) => { const r = newPos.requirements.filter((_, j) => j !== i); setNewPos({ ...newPos, requirements: r.length ? r : [""] }); }}
          />
          <Button onClick={addPosition} className="w-full gap-1"><Plus className="w-4 h-4" /> Positie Aanmaken</Button>
        </div>
      )}

      {positions.map((pos, index) => {
        const Icon = iconOptions.find((o) => o.value === pos.icon)?.Icon || Shield;
        const isOpen = expanded === pos.id;
        const form = editForms[pos.id];

        return (
          <div key={pos.id} className="card-glow rounded-xl bg-card overflow-hidden" style={{ borderLeft: `3px solid ${pos.color}` }}>
            <div className="p-4 flex items-center justify-between">
              <button className="flex items-center gap-3 flex-1" onClick={() => setExpanded(isOpen ? null : pos.id)}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: pos.color + "22" }}>
                  <Icon className="w-5 h-5" style={{ color: pos.color }} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">{pos.name}</p>
                  <p className="text-xs text-muted-foreground">{pos.is_open ? "Open voor sollicitaties" : "Gesloten"}</p>
                </div>
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" /> : <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />}
              </button>
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <button onClick={() => movePosition(index, -1)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-1">
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button onClick={() => movePosition(index, 1)} disabled={index === positions.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-1">
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">{pos.is_open ? "Open" : "Dicht"}</span>
                <Switch checked={pos.is_open} onCheckedChange={() => toggleOpen(pos)} />
              </div>
            </div>

            {isOpen && form && (
              <div className="px-4 pb-4 pt-0 border-t border-border space-y-4">
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div><Label>Naam</Label><Input value={form.name} onChange={(e) => updateForm(pos.id, "name", e.target.value)} className="bg-secondary border-border mt-1" /></div>
                  <div>
                    <Label>Kleur</Label>
                    <div className="flex gap-2 mt-1">
                      <input type="color" value={form.color} onChange={(e) => updateForm(pos.id, "color", e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                      <Input value={form.color} onChange={(e) => updateForm(pos.id, "color", e.target.value)} className="bg-secondary border-border w-28" />
                    </div>
                  </div>
                </div>
                <div><Label>Beschrijving</Label><Textarea value={form.description || ""} onChange={(e) => updateForm(pos.id, "description", e.target.value)} className="bg-secondary border-border mt-1" rows={2} /></div>
                <IconPicker value={form.icon} onChange={(v) => updateForm(pos.id, "icon", v)} />
                <RequirementsEditor
                  reqs={form.requirements}
                  onUpdate={(i, v) => updateReq(pos.id, i, v)}
                  onAdd={() => addReq(pos.id)}
                  onRemove={(i) => removeReq(pos.id, i)}
                />
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-sm font-semibold">Sollicitatie Vragen</Label>
                  {(form.questions || []).map((q: any, i: number) => (
                    <div key={i} className="flex gap-2 items-start p-2 rounded bg-secondary/40">
                      <Input value={q.label} onChange={(e) => {
                        const qs = [...(form.questions || [])]; qs[i] = { ...qs[i], label: e.target.value };
                        updateForm(pos.id, "questions", qs);
                      }} placeholder="Vraag label" className="bg-background border-border flex-1" />
                      <Input value={q.key} onChange={(e) => {
                        const qs = [...(form.questions || [])]; qs[i] = { ...qs[i], key: e.target.value.replace(/\s+/g, "_").toLowerCase() };
                        updateForm(pos.id, "questions", qs);
                      }} placeholder="key" className="bg-background border-border w-28" />
                      <select value={q.type || "text"} onChange={(e) => {
                        const qs = [...(form.questions || [])]; qs[i] = { ...qs[i], type: e.target.value };
                        updateForm(pos.id, "questions", qs);
                      }} className="bg-background border border-border rounded h-10 px-2 text-sm">
                        <option value="text">Kort</option>
                        <option value="textarea">Lang</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-muted-foreground h-10">
                        <input type="checkbox" checked={!!q.required} onChange={(e) => {
                          const qs = [...(form.questions || [])]; qs[i] = { ...qs[i], required: e.target.checked };
                          updateForm(pos.id, "questions", qs);
                        }} /> *
                      </label>
                      <Button size="icon" variant="ghost" onClick={() => {
                        const qs = (form.questions || []).filter((_: any, j: number) => j !== i);
                        updateForm(pos.id, "questions", qs);
                      }} className="text-destructive shrink-0"><X className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => {
                    const qs = [...(form.questions || []), { key: `vraag_${(form.questions || []).length + 1}`, label: "Nieuwe vraag", type: "text", required: false }];
                    updateForm(pos.id, "questions", qs);
                  }} className="gap-1"><Plus className="w-3 h-3" /> Vraag toevoegen</Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => savePosition(pos.id)} className="flex-1 gap-1"><Save className="w-4 h-4" /> Opslaan</Button>
                  <Button variant="destructive" onClick={() => deletePosition(pos.id)} className="gap-1"><Trash2 className="w-4 h-4" /> Verwijderen</Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
