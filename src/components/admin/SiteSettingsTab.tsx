import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Type, Plus, Trash2, GripVertical, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Shield, Code, Video, Calendar, Hammer, Megaphone,
  Zap, ClipboardList, MessageCircle, Users, Star, Settings,
} from "lucide-react";

const iconOptions = [
  { value: "shield", Icon: Shield },
  { value: "code", Icon: Code },
  { value: "video", Icon: Video },
  { value: "calendar", Icon: Calendar },
  { value: "hammer", Icon: Hammer },
  { value: "megaphone", Icon: Megaphone },
  { value: "zap", Icon: Zap },
  { value: "clipboard", Icon: ClipboardList },
  { value: "message-circle", Icon: MessageCircle },
  { value: "users", Icon: Users },
  { value: "star", Icon: Star },
  { value: "settings", Icon: Settings },
];

export function SiteSettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [navItems, setNavItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [settingsData, navData] = await Promise.all([
        adminFetch("site-settings"),
        adminFetch("nav-items"),
      ]);
      const map: Record<string, string> = {};
      (settingsData || []).forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
      setNavItems(navData || []);
    } catch {}
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await adminFetch("update-site-setting", { key, value });
      toast.success("Opgeslagen!");
    } catch {
      toast.error("Fout bij opslaan");
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await adminFetch("update-site-setting", { key, value });
      }
      toast.success("Alle teksten opgeslagen!");
    } catch {
      toast.error("Fout bij opslaan");
    }
    setSaving(false);
  };

  const addNavItem = async () => {
    try {
      const data = await adminFetch("add-nav-item", {
        title: "Nieuw item",
        description: "",
        icon: "zap",
        link: "/",
        color: "#FFD700",
      });
      setNavItems((prev) => [...prev, data]);
      toast.success("Item toegevoegd!");
    } catch {
      toast.error("Fout bij toevoegen");
    }
  };

  const updateNavItem = async (item: any) => {
    try {
      await adminFetch("update-nav-item", item);
      toast.success("Item opgeslagen!");
    } catch {
      toast.error("Fout bij opslaan");
    }
  };

  const deleteNavItem = async (id: string) => {
    try {
      await adminFetch("delete-nav-item", { id });
      setNavItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Item verwijderd!");
    } catch {
      toast.error("Fout bij verwijderen");
    }
  };

  const updateLocalNav = (id: string, field: string, value: any) => {
    setNavItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  return (
    <div className="space-y-8">
      {/* Text settings */}
      <div className="card-glow rounded-xl bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Site Teksten</h3>
        </div>
        <div className="space-y-4">
          {[
            { key: "home_title", label: "Home Titel" },
            { key: "home_subtitle", label: "Home Ondertitel" },
            { key: "apply_title", label: "Sollicitatie Pagina Titel" },
            { key: "apply_subtitle", label: "Sollicitatie Pagina Ondertitel" },
            { key: "footer_text", label: "Footer Tekst" },
          ].map(({ key, label }) => (
            <div key={key}>
              <Label className="text-sm text-muted-foreground">{label}</Label>
              <Input
                value={settings[key] || ""}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                className="bg-secondary border-border mt-1"
              />
            </div>
          ))}
          <Button onClick={saveSettings} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? "Opslaan..." : "Alle Teksten Opslaan"}
          </Button>
        </div>
      </div>

      {/* Navigation items */}
      <div className="card-glow rounded-xl bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GripVertical className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Navigatie Items (Home)</h3>
          </div>
          <Button size="sm" onClick={addNavItem} className="gap-1">
            <Plus className="w-4 h-4" /> Toevoegen
          </Button>
        </div>

        <div className="space-y-4">
          {navItems.map((item) => (
            <div key={item.id} className="rounded-lg bg-secondary p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Titel</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => updateLocalNav(item.id, "title", e.target.value)}
                    className="bg-card border-border mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Link</Label>
                  <Input
                    value={item.link}
                    onChange={(e) => updateLocalNav(item.id, "link", e.target.value)}
                    className="bg-card border-border mt-1"
                    placeholder="/apply of https://..."
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Beschrijving</Label>
                <Input
                  value={item.description || ""}
                  onChange={(e) => updateLocalNav(item.id, "description", e.target.value)}
                  className="bg-card border-border mt-1"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Icoon</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {iconOptions.map(({ value, Icon }) => (
                      <button
                        key={value}
                        onClick={() => updateLocalNav(item.id, "icon", value)}
                        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                          item.icon === value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Kleur</Label>
                  <Input
                    type="color"
                    value={item.color}
                    onChange={(e) => updateLocalNav(item.id, "color", e.target.value)}
                    className="h-10 w-full mt-1 p-1 bg-card border-border"
                  />
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <div className="flex items-center gap-2">
                    {item.is_visible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    <Switch checked={item.is_visible} onCheckedChange={(v) => updateLocalNav(item.id, "is_visible", v)} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => deleteNavItem(item.id)} className="gap-1 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" /> Verwijder
                </Button>
                <Button size="sm" onClick={() => updateNavItem(item)} className="gap-1">
                  <Save className="w-3.5 h-3.5" /> Opslaan
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
