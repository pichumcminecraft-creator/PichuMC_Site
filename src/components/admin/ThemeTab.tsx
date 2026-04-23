import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";

// HSL helper
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
function hslToHex(hsl: string): string {
  const m = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!m) return "#000000";
  const h = parseInt(m[1]) / 360, s = parseInt(m[2]) / 100, l = parseInt(m[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const THEMES = [
  { key: "theme_primary", label: "Primair (knoppen, accent)", default: "43 96% 56%" },
  { key: "theme_background", label: "Achtergrond", default: "220 25% 7%" },
  { key: "theme_card", label: "Kaart", default: "220 20% 10%" },
  { key: "theme_foreground", label: "Tekst", default: "210 40% 92%" },
  { key: "theme_secondary", label: "Secundair", default: "220 15% 16%" },
  { key: "theme_border", label: "Rand", default: "220 15% 18%" },
  { key: "theme_destructive", label: "Gevaar (rood)", default: "0 84% 60%" },
];

const TEXT_KEYS = [
  { key: "site_logo_url", label: "Logo URL (optioneel)", placeholder: "https://..." },
  { key: "admin_panel_title", label: "Admin Panel Titel", placeholder: "PichuMC Staff" },
  { key: "home_title", label: "Home Titel" },
  { key: "home_subtitle", label: "Home Ondertitel" },
  { key: "apply_title", label: "Sollicitaties Titel" },
  { key: "apply_subtitle", label: "Sollicitaties Ondertitel" },
  { key: "footer_text", label: "Footer Tekst" },
];

export function ThemeTab() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await adminFetch("site-settings");
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => (map[r.key] = r.value));
      setValues(map);
    } catch {}
  };

  const save = async (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    try {
      await adminFetch("update-site-setting", { key, value });
    } catch (err: any) {
      toast.error(err.message || "Fout bij opslaan");
    }
  };

  const saveAll = async () => {
    setLoading(true);
    try {
      for (const t of THEMES) {
        await adminFetch("update-site-setting", { key: t.key, value: values[t.key] || t.default });
      }
      for (const t of TEXT_KEYS) {
        if (values[t.key] !== undefined) {
          await adminFetch("update-site-setting", { key: t.key, value: values[t.key] });
        }
      }
      toast.success("Instellingen opgeslagen");
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  const reset = async () => {
    setLoading(true);
    for (const t of THEMES) {
      await adminFetch("update-site-setting", { key: t.key, value: t.default });
    }
    await load();
    toast.success("Standaard kleuren hersteld");
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="card-glow rounded-xl bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground text-lg">Site Kleuren</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {THEMES.map((t) => {
            const hsl = values[t.key] || t.default;
            const hex = hslToHex(hsl);
            return (
              <div key={t.key} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => save(t.key, hexToHsl(e.target.value))}
                  className="w-12 h-12 rounded cursor-pointer bg-transparent border border-border"
                />
                <div className="flex-1">
                  <Label className="text-xs">{t.label}</Label>
                  <Input
                    value={hsl}
                    onChange={(e) => setValues((prev) => ({ ...prev, [t.key]: e.target.value }))}
                    onBlur={(e) => save(t.key, e.target.value)}
                    className="bg-background border-border mt-1 text-xs h-8"
                    placeholder="H S% L%"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={saveAll} disabled={loading} className="bg-primary text-primary-foreground">Alles Opslaan</Button>
          <Button onClick={reset} disabled={loading} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" /> Standaard Herstellen
          </Button>
        </div>
      </div>

      <div className="card-glow rounded-xl bg-card p-6">
        <h3 className="font-bold text-foreground text-lg mb-4">Site Teksten & Branding</h3>
        <div className="space-y-3">
          {TEXT_KEYS.map((t) => (
            <div key={t.key}>
              <Label className="text-xs">{t.label}</Label>
              <Input
                value={values[t.key] || ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [t.key]: e.target.value }))}
                onBlur={(e) => save(t.key, e.target.value)}
                placeholder={t.placeholder || ""}
                className="bg-secondary border-border mt-1"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
