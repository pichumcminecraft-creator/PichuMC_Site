import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Trash2, Ticket, Bold, Italic, Underline, Code, Link2, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const statusColors: Record<string, string> = {
  in_afwachting: "#F59E0B",
  geaccepteerd: "#10B981",
  afgewezen: "#EF4444",
};

const statusLabels: Record<string, string> = {
  in_afwachting: "In Afwachting",
  geaccepteerd: "Geaccepteerd",
  afgewezen: "Afgewezen",
};

const PRESET_COLORS = [
  { name: "Goud", value: "#FFD700" },
  { name: "Groen", value: "#22C55E" },
  { name: "Blauw", value: "#3B82F6" },
  { name: "Paars", value: "#A855F7" },
  { name: "Rood", value: "#EF4444" },
  { name: "Oranje", value: "#F59E0B" },
  { name: "Roze", value: "#EC4899" },
  { name: "Cyaan", value: "#06B6D4" },
];

export function ApplicationsTab() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dmTarget, setDmTarget] = useState<any>(null);
  const [dmTitle, setDmTitle] = useState("🎫 Maak een ticket aan");
  const [dmContent, setDmContent] = useState("Hey {user} 👋");
  const [dmDescription, setDmDescription] = useState(
    "Bedankt voor je sollicitatie voor **{positie}**!\n\nOpen een **ticket** in onze Discord en vermeld dat het over je sollicitatie gaat."
  );
  const [dmColor, setDmColor] = useState("#FFD700");
  const [dmDiscordId, setDmDiscordId] = useState("");
  const [sending, setSending] = useState(false);

  const allSelected = apps.length > 0 && selected.size === apps.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(apps.map((a) => a.id)));
  const toggleOne = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const bulkAction = async (op: "delete" | "status", status?: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const label = op === "delete" ? "verwijderen" : status === "geaccepteerd" ? "accepteren" : "afwijzen";
    if (!confirm(`Weet je zeker dat je ${ids.length} sollicitatie(s) wilt ${label}?`)) return;
    const t = toast.loading(`${ids.length} sollicitaties ${label}...`);
    try {
      await adminFetch("bulk-applications", { ids, op, status });
      toast.success(`${ids.length} sollicitaties bijgewerkt`, { id: t });
      setSelected(new Set());
      load();
    } catch (e: any) {
      toast.error(e.message || "Mislukt", { id: t });
    }
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await adminFetch("applications");
      setApps(data || []);
    } catch {}
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await adminFetch("update-application", { id, status });
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast.success("Status bijgewerkt");
    } catch {
      toast.error("Fout bij bijwerken");
    }
  };

  const deleteApp = async (id: string) => {
    try {
      await adminFetch("delete-application", { id });
      setApps((prev) => prev.filter((a) => a.id !== id));
      toast.success("Sollicitatie verwijderd");
    } catch {
      toast.error("Fout bij verwijderen");
    }
  };

  const openDmDialog = (app: any) => {
    if (!app.discord_username) {
      toast.error("Geen Discord gebruikersnaam bij deze sollicitatie");
      return;
    }
    setDmTarget(app);
    setDmTitle("🎫 Maak een ticket aan");
    setDmContent("Hey {user} 👋");
    setDmDescription(
      `Bedankt voor je sollicitatie voor **{positie}**!\n\nOm verder te gaan vragen we je een **ticket** te openen in onze Discord server. Een staff lid neemt zo snel mogelijk contact met je op.\n\n**Stappen:**\n1. Ga naar het \`#tickets\` kanaal\n2. Klik op "Maak een ticket"\n3. Vermeld dat het over je sollicitatie voor **{positie}** gaat`
    );
    setDmColor(app.positions?.color || "#FFD700");
    // If discord_username already looks like a numeric ID, prefill it
    const v = String(app.discord_username || "").trim();
    setDmDiscordId(/^\d{17,20}$/.test(v) ? v : "");
  };

  const wrapSelection = (id: string, before: string, after: string = before) => {
    const el = document.getElementById(id) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const value = el.value;
    const selected = value.slice(start, end) || "tekst";
    const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
    if (id === "dm-description") setDmDescription(newValue);
    else if (id === "dm-title") setDmTitle(newValue);
    else if (id === "dm-content") setDmContent(newValue);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const sendDm = async () => {
    if (!dmTarget) return;
    setSending(true);
    const t = toast.loading(`DM sturen naar ${dmTarget.discord_username}...`);
    try {
      await adminFetch("dm-ticket-invite", {
        application_id: dmTarget.id,
        discord_user_id: dmDiscordId.trim() || undefined,
        custom_title: dmTitle,
        custom_description: dmDescription,
        custom_content: dmContent,
        custom_color: dmColor,
      });
      toast.success(`DM verstuurd naar ${dmTarget.discord_username}`, { id: t });
      setDmTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Versturen mislukt", { id: t });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Laden...</p>;
  if (!apps.length) return <p className="text-muted-foreground">Geen sollicitaties gevonden.</p>;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap mb-3 p-3 rounded-xl bg-card border border-border">
        <Button size="sm" variant="ghost" className="gap-1" onClick={toggleAll}>
          {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          {allSelected ? "Deselecteer alles" : "Selecteer alles"}
        </Button>
        <span className="text-xs text-muted-foreground">{selected.size} geselecteerd</span>
        {selected.size > 0 && (
          <div className="flex gap-2 ml-auto flex-wrap">
            <Button size="sm" className="bg-[#10B981] hover:bg-[#059669] text-foreground gap-1" onClick={() => bulkAction("status", "geaccepteerd")}>
              <CheckCircle className="w-4 h-4" /> Accepteer ({selected.size})
            </Button>
            <Button size="sm" variant="destructive" className="gap-1" onClick={() => bulkAction("status", "afgewezen")}>
              <XCircle className="w-4 h-4" /> Wijs af ({selected.size})
            </Button>
            <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => bulkAction("delete")}>
              <Trash2 className="w-4 h-4" /> Verwijder ({selected.size})
            </Button>
          </div>
        )}
      </div>
      <div className="space-y-4">
        {apps.map((app, idx) => (
          <div
            key={app.id}
            className="card-glow rounded-xl bg-card p-5 animate-fade-in-up hover:scale-[1.01] transition-transform duration-200"
            style={{ animationDelay: `${Math.min(idx * 40, 400)}ms`, animationFillMode: "backwards" }}
          >
            <div className="flex items-start gap-3 mb-3">
              <Checkbox
                checked={selected.has(app.id)}
                onCheckedChange={() => toggleOne(app.id)}
                className="mt-1"
              />
              <div className="flex-1 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-foreground text-lg">{app.minecraft_username}</p>
                    <Badge style={{ backgroundColor: statusColors[app.status], color: "#000" }}>
                      {statusLabels[app.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Positie: <span style={{ color: app.positions?.color }}>{app.positions?.name}</span>
                    {app.age && ` • ${app.age} jaar`}
                    {app.discord_username && ` • Discord: ${app.discord_username}`}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">{new Date(app.created_at).toLocaleDateString("nl-NL")}</p>
              </div>
            </div>

            {app.motivation && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Motivatie:</p>
                <p className="text-sm text-foreground">{app.motivation}</p>
              </div>
            )}
            {app.experience && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Ervaring:</p>
                <p className="text-sm text-foreground">{app.experience}</p>
              </div>
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
              {app.status === "in_afwachting" && (
                <>
                  <Button size="sm" className="bg-[#10B981] hover:bg-[#059669] text-foreground gap-1" onClick={() => updateStatus(app.id, "geaccepteerd")}>
                    <CheckCircle className="w-4 h-4" /> Accepteren
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => updateStatus(app.id, "afgewezen")}>
                    <XCircle className="w-4 h-4" /> Afwijzen
                  </Button>
                </>
              )}
              {app.discord_username && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openDmDialog(app)}>
                  <Ticket className="w-4 h-4" /> Mail naar DC ({app.discord_username})
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1 text-destructive ml-auto" onClick={() => deleteApp(app.id)}>
                <Trash2 className="w-4 h-4" /> Verwijderen
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!dmTarget} onOpenChange={(o) => !o && setDmTarget(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>DM sturen naar {dmTarget?.discord_username}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Variabelen die je kunt gebruiken:</p>
              <code className="text-primary">{"{user}"}</code> = Discord mention •{" "}
              <code className="text-primary">{"{minecraft}"}</code> = Minecraft naam •{" "}
              <code className="text-primary">{"{positie}"}</code> = positie •{" "}
              <code className="text-primary">{"{discord}"}</code> = Discord naam
            </div>

            <div>
              <Label htmlFor="dm-content">Bericht (boven embed)</Label>
              <Input id="dm-content" value={dmContent} onChange={(e) => setDmContent(e.target.value)} className="bg-secondary" />
            </div>

            <div>
              <Label htmlFor="dm-title">Embed titel</Label>
              <Input id="dm-title" value={dmTitle} onChange={(e) => setDmTitle(e.target.value)} className="bg-secondary" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="dm-description">Embed bericht</Label>
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" title="Vet" onClick={() => wrapSelection("dm-description", "**")}>
                    <Bold className="w-3.5 h-3.5" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" title="Cursief" onClick={() => wrapSelection("dm-description", "*")}>
                    <Italic className="w-3.5 h-3.5" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" title="Onderstreept" onClick={() => wrapSelection("dm-description", "__")}>
                    <Underline className="w-3.5 h-3.5" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" title="Code" onClick={() => wrapSelection("dm-description", "`")}>
                    <Code className="w-3.5 h-3.5" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" title="Link" onClick={() => wrapSelection("dm-description", "[", "](https://)")}>
                    <Link2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <Textarea
                id="dm-description"
                value={dmDescription}
                onChange={(e) => setDmDescription(e.target.value)}
                className="bg-secondary font-mono text-sm"
                rows={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Discord markdown: <code>**vet**</code>, <code>*cursief*</code>, <code>__onderstreept__</code>, <code>~~doorgehaald~~</code>, <code>`code`</code>, <code>||spoiler||</code>
              </p>
            </div>

            <div>
              <Label>Embed kleur</Label>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setDmColor(c.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${dmColor === c.value ? "border-foreground scale-110" : "border-border"}`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="color"
                    value={dmColor}
                    onChange={(e) => setDmColor(e.target.value)}
                    className="w-10 h-8 rounded cursor-pointer bg-transparent"
                  />
                  <Input value={dmColor} onChange={(e) => setDmColor(e.target.value)} className="w-28 bg-secondary font-mono text-xs" />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label>Voorbeeld</Label>
              <div className="mt-1.5 rounded-lg bg-[#313338] p-4 border border-border">
                <p className="text-[#dbdee1] text-sm mb-2 whitespace-pre-wrap">{dmContent.replace(/\{user\}/gi, `@${dmTarget?.discord_username || ""}`)}</p>
                <div className="flex gap-3">
                  <div className="w-1 rounded-full self-stretch" style={{ backgroundColor: dmColor }} />
                  <div className="flex-1 bg-[#2b2d31] rounded p-3">
                    <p className="text-white font-semibold text-sm mb-1">{dmTitle}</p>
                    <p
                      className="text-[#dbdee1] text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: dmDescription
                          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                          .replace(/\{positie\}/gi, dmTarget?.positions?.name || "")
                          .replace(/\{minecraft\}/gi, dmTarget?.minecraft_username || "")
                          .replace(/\{discord\}/gi, dmTarget?.discord_username || "")
                          .replace(/\{user\}/gi, `@${dmTarget?.discord_username || ""}`)
                          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                          .replace(/__(.+?)__/g, "<u>$1</u>")
                          .replace(/\*(.+?)\*/g, "<em>$1</em>")
                          .replace(/~~(.+?)~~/g, "<s>$1</s>")
                          .replace(/`([^`]+?)`/g, '<code class="bg-[#1e1f22] px-1 rounded text-[#e3e5e8]">$1</code>')
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDmTarget(null)}>Annuleren</Button>
            <Button onClick={sendDm} disabled={sending} className="gap-1">
              <Ticket className="w-4 h-4" /> {sending ? "Versturen..." : "Verstuur DM"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
