import { useEffect, useState } from "react";
import { adminFetch, getAdminUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarOff, Bot, Eye, EyeOff, Save, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  in_afwachting: "hsl(43, 96%, 56%)",
  goedgekeurd: "hsl(43, 96%, 56%)",
  afgekeurd: "#EF4444",
  teruggekomen: "#3B82F6",
};

const statusLabels: Record<string, string> = {
  in_afwachting: "In Afwachting",
  goedgekeurd: "Goedgekeurd",
  afgekeurd: "Afgekeurd",
  teruggekomen: "Teruggekomen",
};

export function AbsencesPage() {
  const [absences, setAbsences] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ start_date: "", end_date: "", reason: "" });
  const [discordSettings, setDiscordSettings] = useState({
    enabled: false, message_channel_id: "", role_channel_id: "", role_id: "", bot_token: "",
  });
  const [showToken, setShowToken] = useState(false);
  const [showDiscord, setShowDiscord] = useState(false);
  const [filter, setFilter] = useState("all");
  const user = getAdminUser();
  const isOwner = user?.role === "eigenaar";
  const canManage = isOwner || user?.permissions?.absences_manage === true;

  useEffect(() => { load(); loadDiscord(); }, []);

  const load = async () => {
    try { setAbsences(await adminFetch("absences") || []); } catch {}
  };
  const loadDiscord = async () => {
    try { const d = await adminFetch("absence-settings"); if (d) setDiscordSettings(d); } catch {}
  };

  const submit = async () => {
    if (!form.start_date || !form.end_date) return toast.error("Vul een start- en einddatum in");
    try {
      const data = await adminFetch("add-absence", form);
      setAbsences((prev) => [data, ...prev]);
      setForm({ start_date: "", end_date: "", reason: "" });
      setShowAdd(false);
      toast.success("Afmelding ingediend");
    } catch (err: any) { toast.error(err.message); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await adminFetch("update-absence", { id, status });
      setAbsences((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast.success("Status bijgewerkt");
    } catch { toast.error("Fout"); }
  };

  const deleteAbsence = async (id: string) => {
    try {
      await adminFetch("delete-absence", { id });
      setAbsences((prev) => prev.filter((a) => a.id !== id));
      toast.success("Afmelding verwijderd");
    } catch { toast.error("Fout bij verwijderen"); }
  };

  const saveDiscord = async () => {
    try {
      await adminFetch("update-absence-settings", discordSettings);
      toast.success("Discord instellingen opgeslagen");
    } catch { toast.error("Fout bij opslaan"); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

  const filtered = filter === "all" ? absences : absences.filter(a => a.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Afmeldingen</h1>
          <p className="text-sm text-muted-foreground">Beheer je afmeldingen en bekijk de status.</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Button onClick={() => setShowDiscord(!showDiscord)} variant="outline" className="gap-1">
              <Bot className="w-4 h-4" /> Discord
            </Button>
          )}
          <Button onClick={() => setShowAdd(!showAdd)} className="gap-1">
            <Plus className="w-4 h-4" /> Nieuwe Afmelding
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "Alles" },
          { key: "in_afwachting", label: "Wachtend" },
          { key: "goedgekeurd", label: "Goedgekeurd" },
          { key: "afgekeurd", label: "Afgekeurd" },
          { key: "teruggekomen", label: "Teruggekomen" },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Discord Settings */}
      {showDiscord && canManage && (
        <div className="card-glow rounded-xl bg-card p-6 border-l-4 border-l-[#5865F2]">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-[#5865F2]" />
            <h3 className="font-bold text-foreground">Discord Afmelding Instellingen</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Discord Notificaties</Label>
              <Switch checked={discordSettings.enabled} onCheckedChange={(v) => setDiscordSettings({ ...discordSettings, enabled: v })} />
            </div>
            <div>
              <Label>Bot Token</Label>
              <div className="relative mt-1">
                <Input type={showToken ? "text" : "password"} value={discordSettings.bot_token} onChange={(e) => setDiscordSettings({ ...discordSettings, bot_token: e.target.value })} className="pr-10 bg-secondary border-border" placeholder="Bot token" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowToken(!showToken)}>
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>📨 Bericht Kanaal ID</Label>
                <Input value={discordSettings.message_channel_id} onChange={(e) => setDiscordSettings({ ...discordSettings, message_channel_id: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Kanaal voor berichten" />
              </div>
              <div>
                <Label>👑 Rol Kanaal ID</Label>
                <Input value={discordSettings.role_channel_id} onChange={(e) => setDiscordSettings({ ...discordSettings, role_channel_id: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Kanaal voor rol-log" />
              </div>
            </div>
            <div>
              <Label>Discord Rol ID</Label>
              <Input value={discordSettings.role_id} onChange={(e) => setDiscordSettings({ ...discordSettings, role_id: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Rol ID" />
            </div>
            <Button onClick={saveDiscord} className="gap-1"><Save className="w-4 h-4" /> Opslaan</Button>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="card-glow rounded-xl bg-card p-5 space-y-3 border-l-4 border-l-primary">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Startdatum</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label>Einddatum</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="bg-secondary border-border mt-1" />
            </div>
          </div>
          <Label>Reden</Label>
          <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="bg-secondary border-border" placeholder="Waarom ben je afwezig?" />
          <Button onClick={submit}>Afmelding Indienen</Button>
        </div>
      )}

      {/* Absences list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <CalendarOff className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground">Geen afmeldingen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const color = statusColors[a.status] || statusColors.in_afwachting;
            return (
              <div key={a.id} className="card-glow rounded-xl bg-card p-5 hover:bg-card/80 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-foreground">{a.admin_users?.username || "Onbekend"}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(a.start_date)} — {formatDate(a.end_date)}</p>
                  </div>
                  <Badge style={{ backgroundColor: color + "22", color, border: `1px solid ${color}44` }}>
                    {statusLabels[a.status] || a.status}
                  </Badge>
                </div>
                {a.reason && <p className="text-sm text-foreground mt-3 bg-secondary/50 rounded-lg p-3">{a.reason}</p>}
                <p className="text-[10px] text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString("nl-NL")}</p>
                <div className="flex gap-2 mt-3">
                  {canManage && a.status === "in_afwachting" && (
                    <>
                      <Button size="sm" className="bg-primary hover:bg-primary/80 text-primary-foreground" onClick={() => updateStatus(a.id, "goedgekeurd")}>Goedkeuren</Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(a.id, "afgekeurd")}>Afkeuren</Button>
                    </>
                  )}
                  {a.status === "goedgekeurd" && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => updateStatus(a.id, "teruggekomen")}>
                      <RotateCcw className="w-3.5 h-3.5" /> Teruggekomen
                    </Button>
                  )}
                  {canManage && (
                    <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => deleteAbsence(a.id)}>
                      <Trash2 className="w-3.5 h-3.5" /> Verwijder
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
