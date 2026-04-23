import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bot, Eye, EyeOff, Plus, ChevronDown, ChevronUp, Shield, Code, Video, Calendar, Hammer, Megaphone, Zap, Send } from "lucide-react";
import { toast } from "sonner";

const iconMap: Record<string, React.ElementType> = { shield: Shield, code: Code, video: Video, calendar: Calendar, hammer: Hammer, megaphone: Megaphone };

export function DiscordTab() {
  const [botToken, setBotToken] = useState("");
  const [guildId, setGuildId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [channelForms, setChannelForms] = useState<Record<string, any>>({});
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [discordData, posData] = await Promise.all([adminFetch("discord-settings"), adminFetch("positions")]);
      if (discordData.settings) {
        setBotToken(discordData.settings.bot_token || "");
        setGuildId(discordData.settings.guild_id || "");
      }
      setPositions(posData || []);

      const forms: Record<string, any> = {};
      (posData || []).forEach((p: any) => {
        const ch = (discordData.channels || []).find((c: any) => c.position_id === p.id);
        forms[p.id] = {
          enabled: ch?.enabled || false,
          channel_id: ch?.channel_id || "",
          ping_roles: ch?.ping_roles || [],
          embed_color: ch?.embed_color || "#FFD700",
          newRole: "",
        };
      });
      setChannelForms(forms);
    } catch {}
  };

  const saveGlobal = async () => {
    try {
      await adminFetch("update-discord-settings", { bot_token: botToken, guild_id: guildId });
      toast.success("Discord instellingen opgeslagen");
    } catch { toast.error("Fout bij opslaan"); }
  };

  const saveChannel = async (posId: string) => {
    const form = channelForms[posId];
    try {
      await adminFetch("update-discord-channel", {
        position_id: posId,
        enabled: form.enabled,
        channel_id: form.channel_id,
        ping_roles: form.ping_roles,
        embed_color: form.embed_color,
      });
      toast.success("Kanaal instellingen opgeslagen");
    } catch { toast.error("Fout bij opslaan"); }
  };

  const testConnection = async (posId: string) => {
    const form = channelForms[posId];
    if (!form.channel_id) return toast.error("Vul eerst een kanaal ID in");
    setTesting(posId);
    try {
      await adminFetch("test-discord", { channel_id: form.channel_id, embed_color: form.embed_color });
      toast.success("Test bericht verzonden!");
    } catch (err: any) {
      toast.error(err.message);
    }
    setTesting(null);
  };

  const updateForm = (posId: string, updates: any) => {
    setChannelForms((prev) => ({ ...prev, [posId]: { ...prev[posId], ...updates } }));
  };

  const addRole = (posId: string) => {
    const form = channelForms[posId];
    if (!form.newRole) return;
    updateForm(posId, { ping_roles: [...form.ping_roles, form.newRole], newRole: "" });
  };

  return (
    <div className="space-y-6">
      <div className="card-glow rounded-xl bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground text-lg">Discord Bot Instellingen</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Bot Token</Label>
            <div className="relative mt-1">
              <Input type={showToken ? "text" : "password"} value={botToken} onChange={(e) => setBotToken(e.target.value)} className="pr-10 bg-secondary border-border" placeholder="Voer je bot token in" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowToken(!showToken)}>
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Server (Guild) ID</Label>
            <Input value={guildId} onChange={(e) => setGuildId(e.target.value)} className="bg-secondary border-border mt-1" placeholder="Bijv. 123456789012345678" />
          </div>
          <Button onClick={saveGlobal} className="bg-primary text-primary-foreground">Opslaan</Button>
        </div>
      </div>

      <h3 className="font-bold text-foreground text-lg">Kanalen per Positie</h3>

      {positions.map((pos) => {
        const Icon = iconMap[pos.icon] || Shield;
        const form = channelForms[pos.id];
        const isOpen = expanded === pos.id;

        return (
          <div key={pos.id} className="card-glow rounded-xl bg-card overflow-hidden" style={{ borderLeft: `3px solid ${pos.color}` }}>
            <button className="w-full p-4 flex items-center justify-between" onClick={() => setExpanded(isOpen ? null : pos.id)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: pos.color + "22" }}>
                  <Icon className="w-5 h-5" style={{ color: pos.color }} />
                </div>
                <span className="font-semibold text-foreground">{pos.name}</span>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {isOpen && form && (
              <div className="px-4 pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Discord Notificaties</Label>
                  <Switch checked={form.enabled} onCheckedChange={(v) => updateForm(pos.id, { enabled: v })} />
                </div>
                <div>
                  <Label>Kanaal ID</Label>
                  <Input value={form.channel_id} onChange={(e) => updateForm(pos.id, { channel_id: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Bijv. 123456789012345678" />
                </div>
                <div>
                  <Label>Ping Roles</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={form.newRole} onChange={(e) => updateForm(pos.id, { newRole: e.target.value })} className="bg-secondary border-border" placeholder="Role ID" />
                    <Button size="icon" variant="outline" onClick={() => addRole(pos.id)}><Plus className="w-4 h-4" /></Button>
                  </div>
                  {form.ping_roles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {form.ping_roles.map((r: string, i: number) => (
                        <span key={i} className="text-xs bg-secondary px-2 py-1 rounded cursor-pointer hover:bg-destructive" onClick={() => updateForm(pos.id, { ping_roles: form.ping_roles.filter((_: any, j: number) => j !== i) })}>
                          {r} ×
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Embed Kleur</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-10 h-10 rounded" style={{ backgroundColor: form.embed_color }} />
                    <Input value={form.embed_color} onChange={(e) => updateForm(pos.id, { embed_color: e.target.value })} className="bg-secondary border-border" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => saveChannel(pos.id)} className="flex-1">Opslaan</Button>
                  <Button onClick={() => testConnection(pos.id)} variant="outline" className="gap-1" disabled={testing === pos.id}>
                    <Send className="w-4 h-4" /> {testing === pos.id ? "Verzenden..." : "Test Bericht"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
