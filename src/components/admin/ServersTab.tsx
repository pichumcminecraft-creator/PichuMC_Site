import { useEffect, useMemo, useRef, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Play, Square, RotateCw, Zap, Terminal, Shield, Send,
  Server as ServerIcon, Cpu, HardDrive, Activity, Loader2,
  RefreshCw, Power
} from "lucide-react";
import { toast } from "sonner";
import { getToken } from "@/lib/api";

type Server = {
  identifier: string;
  uuid: string;
  name: string;
  description?: string;
  node?: string;
  limits?: { memory?: number; disk?: number; cpu?: number };
  status?: string | null;
};

type Resources = {
  current_state?: string;
  resources?: { memory_bytes?: number; cpu_absolute?: number; disk_bytes?: number; uptime?: number };
};

const SERVER_GROUPS: { key: string; label: string; match: RegExp; icon: string; color: string }[] = [
  { key: "lobby",    label: "Lobby",    match: /lobby/i,             icon: "🏠", color: "#3B82F6" },
  { key: "skyblock", label: "Skyblock", match: /sky\s*block|skyblock/i, icon: "🏝️", color: "#22C55E" },
  { key: "velocity", label: "Velocity", match: /velocity|proxy/i,    icon: "⚡", color: "#A855F7" },
  { key: "events",   label: "Events",   match: /event/i,             icon: "🎉", color: "#EC4899" },
  { key: "other",    label: "Overig",   match: /.*/,                  icon: "📦", color: "#94A3B8" },
];

function classifyServer(s: Server): string {
  for (const g of SERVER_GROUPS) {
    if (g.key === "other") continue;
    if (g.match.test(s.name) || g.match.test(s.description || "")) return g.key;
  }
  return "other";
}

function formatBytes(bytes: number = 0): string {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatUptime(ms: number = 0): string {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}u ${m}m`;
}

const STATE_META: Record<string, { label: string; color: string; pulse?: boolean }> = {
  running: { label: "Online", color: "#22C55E", pulse: true },
  starting: { label: "Opstarten...", color: "#F59E0B", pulse: true },
  stopping: { label: "Stoppen...", color: "#F59E0B", pulse: true },
  offline: { label: "Offline", color: "#64748B" },
};

export function ServersTab() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>("lobby");
  const [activeServerId, setActiveServerId] = useState<string | null>(null);

  useEffect(() => { loadServers(); }, []);

  const loadServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch("ptero-servers");
      setServers(data?.servers || []);
    } catch (e: any) {
      setError(e.message || "Kon servers niet laden");
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const map: Record<string, Server[]> = {};
    SERVER_GROUPS.forEach((g) => (map[g.key] = []));
    servers.forEach((s) => {
      const g = classifyServer(s);
      map[g].push(s);
    });
    return map;
  }, [servers]);

  // Auto-select first server in active group
  useEffect(() => {
    const list = grouped[activeGroup] || [];
    if (list.length && !list.find((s) => s.identifier === activeServerId)) {
      setActiveServerId(list[0].identifier);
    } else if (!list.length) {
      setActiveServerId(null);
    }
  }, [activeGroup, grouped]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground animate-fade-in">
        <Loader2 className="w-5 h-5 animate-spin" /> Servers laden vanuit Pterodactyl...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 animate-fade-in">
        <p className="font-semibold text-destructive mb-2">Pterodactyl fout</p>
        <p className="text-sm text-muted-foreground mb-3">{error}</p>
        <Button onClick={loadServers} size="sm" variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Opnieuw proberen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ServerIcon className="w-6 h-6 text-primary animate-glow-pulse" />
            Server Beheer
          </h2>
          <p className="text-sm text-muted-foreground">{servers.length} server(s) beschikbaar via Pterodactyl</p>
        </div>
        <Button onClick={loadServers} size="sm" variant="outline" className="gap-2 hover:scale-105 transition-transform">
          <RefreshCw className="w-4 h-4" /> Verversen
        </Button>
      </div>

      <Tabs value={activeGroup} onValueChange={setActiveGroup}>
        <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
          {SERVER_GROUPS.map((g) => {
            const count = grouped[g.key]?.length || 0;
            return (
              <TabsTrigger
                key={g.key}
                value={g.key}
                className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <span>{g.icon}</span> {g.label}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{count}</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SERVER_GROUPS.map((g) => (
          <TabsContent key={g.key} value={g.key} className="mt-4 animate-fade-in-up">
            {(grouped[g.key] || []).length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                <ServerIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                Geen "{g.label}" servers gevonden in jouw Pterodactyl account.
              </div>
            ) : (
              <div className="grid lg:grid-cols-[260px,1fr] gap-4">
                {/* Server list sidebar */}
                <div className="space-y-2">
                  {(grouped[g.key] || []).map((s, idx) => (
                    <button
                      key={s.identifier}
                      onClick={() => setActiveServerId(s.identifier)}
                      className={`w-full text-left rounded-xl border p-3 transition-all hover:scale-[1.02] animate-fade-in-up ${
                        activeServerId === s.identifier
                          ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                      style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "backwards" }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{g.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{s.identifier}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Active server panel */}
                <div>
                  {activeServerId && (
                    <ServerPanel
                      key={activeServerId}
                      server={(grouped[g.key] || []).find((s) => s.identifier === activeServerId)!}
                    />
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ===== Single Server Panel =====
function ServerPanel({ server }: { server: Server }) {
  const [resources, setResources] = useState<Resources | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [cmd, setCmd] = useState("");
  const [whitelistName, setWhitelistName] = useState("");
  const [whitelist, setWhitelist] = useState<Array<{ uuid?: string; name: string }>>([]);
  const [wlLoading, setWlLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Poll resources
  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const r = await adminFetch(`ptero-resources&id=${server.identifier}`);
        if (mounted) setResources(r);
      } catch {}
    };
    tick();
    const i = setInterval(tick, 5000);
    return () => { mounted = false; clearInterval(i); };
  }, [server.identifier]);

  // Load whitelist when tab opens
  useEffect(() => {
    if (tab === "whitelist") loadWhitelist();
  }, [tab, server.identifier]);

  // Console websocket
  useEffect(() => {
    if (tab !== "console") {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }
    let cancelled = false;
    let ws: WebSocket | null = null;

    const connect = async () => {
      try {
        setLogs((l) => [...l, "› Verbinding maken met console..."]);
        const data = await adminFetch(`ptero-console-ws&id=${server.identifier}`);
        if (cancelled || !data?.socket || !data?.token) return;
        ws = new WebSocket(data.socket);
        wsRef.current = ws;
        ws.onopen = () => {
          ws?.send(JSON.stringify({ event: "auth", args: [data.token] }));
        };
        ws.onmessage = (msg) => {
          try {
            const parsed = JSON.parse(msg.data);
            if (parsed.event === "auth success") {
              ws?.send(JSON.stringify({ event: "send logs", args: [null] }));
              ws?.send(JSON.stringify({ event: "send stats", args: [null] }));
              setLogs((l) => [...l, "✓ Verbonden met live console"]);
            } else if (parsed.event === "console output") {
              const line = String(parsed.args?.[0] || "").replace(/\u001b\[[0-9;]*m/g, "");
              setLogs((l) => [...l.slice(-300), line]);
            } else if (parsed.event === "token expiring") {
              // Refresh
              adminFetch(`ptero-console-ws&id=${server.identifier}`).then((d: any) => {
                if (d?.token) ws?.send(JSON.stringify({ event: "auth", args: [d.token] }));
              });
            }
          } catch {}
        };
        ws.onerror = () => setLogs((l) => [...l, "⚠ Console fout"]);
        ws.onclose = () => setLogs((l) => [...l, "× Console verbinding verbroken"]);
      } catch (e: any) {
        setLogs((l) => [...l, `⚠ ${e.message}`]);
      }
    };
    connect();
    return () => { cancelled = true; ws?.close(); };
  }, [tab, server.identifier]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const power = async (signal: "start" | "stop" | "restart" | "kill") => {
    setBusy(signal);
    const t = toast.loading(`${signal === "start" ? "Starten" : signal === "stop" ? "Stoppen" : signal === "restart" ? "Herstarten" : "Killen"}...`);
    try {
      await adminFetch("ptero-power", { id: server.identifier, signal });
      toast.success(`Signaal '${signal}' verzonden`, { id: t });
    } catch (e: any) {
      toast.error(e.message, { id: t });
    } finally {
      setBusy(null);
    }
  };

  const sendCommand = async () => {
    if (!cmd.trim()) return;
    try {
      await adminFetch("ptero-command", { id: server.identifier, command: cmd });
      setLogs((l) => [...l, `> ${cmd}`]);
      setCmd("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const loadWhitelist = async () => {
    setWlLoading(true);
    try {
      const data = await adminFetch(`ptero-whitelist&id=${server.identifier}`);
      setWhitelist(data?.whitelist || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setWlLoading(false);
    }
  };

  const addToWhitelist = async () => {
    if (!whitelistName.trim()) return;
    const t = toast.loading(`${whitelistName} whitelisten...`);
    try {
      await adminFetch("ptero-command", {
        id: server.identifier,
        command: `whitelist add ${whitelistName.trim()}`,
      });
      toast.success(`${whitelistName} toegevoegd`, { id: t });
      setWhitelistName("");
      setTimeout(loadWhitelist, 1500);
    } catch (e: any) {
      toast.error(e.message, { id: t });
    }
  };

  const removeFromWhitelist = async (name: string) => {
    if (!confirm(`${name} van whitelist verwijderen?`)) return;
    try {
      await adminFetch("ptero-command", {
        id: server.identifier,
        command: `whitelist remove ${name}`,
      });
      toast.success(`${name} verwijderd`);
      setTimeout(loadWhitelist, 1500);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const state = resources?.current_state || "unknown";
  const meta = STATE_META[state] || { label: state, color: "#94A3B8" };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              {server.name}
              <Badge
                style={{ backgroundColor: meta.color + "20", color: meta.color, borderColor: meta.color + "40" }}
                className={`border ${meta.pulse ? "animate-pulse" : ""}`}
              >
                <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: meta.color }} />
                {meta.label}
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{server.identifier} • {server.node || "—"}</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Button size="sm" disabled={busy !== null} onClick={() => power("start")}
              className="bg-[#22C55E] hover:bg-[#16A34A] text-white gap-1 hover:scale-105 transition-transform">
              <Play className="w-3.5 h-3.5" /> Start
            </Button>
            <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => power("restart")}
              className="gap-1 hover:scale-105 transition-transform">
              <RotateCw className={`w-3.5 h-3.5 ${busy === "restart" ? "animate-spin" : ""}`} /> Restart
            </Button>
            <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => power("stop")}
              className="gap-1 hover:scale-105 transition-transform">
              <Square className="w-3.5 h-3.5" /> Stop
            </Button>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => power("kill")}
              className="gap-1 hover:scale-105 transition-transform border-destructive/40 text-destructive hover:bg-destructive/10">
              <Power className="w-3.5 h-3.5" /> Kill
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-none border-b border-border bg-transparent h-auto p-0 px-3 gap-0">
          <TabsTrigger value="overview" className="gap-1.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent transition-colors">
            <Activity className="w-3.5 h-3.5" /> Overzicht
          </TabsTrigger>
          <TabsTrigger value="console" className="gap-1.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent transition-colors">
            <Terminal className="w-3.5 h-3.5" /> Console
          </TabsTrigger>
          <TabsTrigger value="whitelist" className="gap-1.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent transition-colors">
            <Shield className="w-3.5 h-3.5" /> Whitelist
          </TabsTrigger>
        </TabsList>

        {/* === Overview === */}
        <TabsContent value="overview" className="p-4 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<Cpu className="w-4 h-4" />} label="CPU" value={`${(resources?.resources?.cpu_absolute || 0).toFixed(1)}%`} accent="#3B82F6" />
            <StatCard icon={<Zap className="w-4 h-4" />} label="RAM" value={formatBytes(resources?.resources?.memory_bytes)} accent="#A855F7" />
            <StatCard icon={<HardDrive className="w-4 h-4" />} label="Schijf" value={formatBytes(resources?.resources?.disk_bytes)} accent="#22C55E" />
            <StatCard icon={<Activity className="w-4 h-4" />} label="Uptime" value={formatUptime(resources?.resources?.uptime)} accent="#F59E0B" />
          </div>
          {server.limits && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
              <div className="rounded-lg bg-secondary/40 p-2">
                <p className="font-semibold text-foreground">RAM Limiet</p>
                <p>{server.limits.memory ? `${server.limits.memory} MB` : "Onbeperkt"}</p>
              </div>
              <div className="rounded-lg bg-secondary/40 p-2">
                <p className="font-semibold text-foreground">CPU Limiet</p>
                <p>{server.limits.cpu ? `${server.limits.cpu}%` : "Onbeperkt"}</p>
              </div>
              <div className="rounded-lg bg-secondary/40 p-2">
                <p className="font-semibold text-foreground">Schijf Limiet</p>
                <p>{server.limits.disk ? `${server.limits.disk} MB` : "Onbeperkt"}</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* === Console === */}
        <TabsContent value="console" className="p-4 animate-fade-in">
          <div className="rounded-lg bg-[#0a0a0a] border border-border font-mono text-xs text-green-400 h-80 overflow-y-auto p-3 mb-3">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">› Verbinden...</p>
            ) : (
              logs.map((l, i) => (
                <div key={i} className="whitespace-pre-wrap break-all">{l}</div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
          <div className="flex gap-2">
            <Input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendCommand()}
              placeholder="Type een commando (bv. say Hallo!)"
              className="bg-secondary font-mono"
            />
            <Button onClick={sendCommand} className="gap-1 hover:scale-105 transition-transform">
              <Send className="w-4 h-4" /> Stuur
            </Button>
          </div>
        </TabsContent>

        {/* === Whitelist === */}
        <TabsContent value="whitelist" className="p-4 animate-fade-in">
          <div className="flex gap-2 mb-3">
            <Input
              value={whitelistName}
              onChange={(e) => setWhitelistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addToWhitelist()}
              placeholder="Minecraft gebruikersnaam"
              className="bg-secondary"
            />
            <Button onClick={addToWhitelist} className="gap-1 hover:scale-105 transition-transform">
              <Shield className="w-4 h-4" /> Whitelist
            </Button>
            <Button onClick={loadWhitelist} variant="outline" size="icon">
              <RefreshCw className={`w-4 h-4 ${wlLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 max-h-80 overflow-y-auto">
            {wlLoading ? (
              <p className="p-4 text-muted-foreground text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Whitelist laden...
              </p>
            ) : whitelist.length === 0 ? (
              <p className="p-4 text-muted-foreground text-sm">Whitelist is leeg of niet beschikbaar.</p>
            ) : (
              <div className="divide-y divide-border">
                {whitelist.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 hover:bg-primary/5 transition-colors animate-fade-in"
                       style={{ animationDelay: `${i * 20}ms`, animationFillMode: "backwards" }}>
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://mc-heads.net/avatar/${entry.name}/24`}
                        alt={entry.name}
                        className="w-6 h-6 rounded"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                      <span className="font-mono text-sm">{entry.name}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive h-7"
                      onClick={() => removeFromWhitelist(entry.name)}>
                      Verwijder
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Whitelist wordt gelezen uit <code>/whitelist.json</code>. Wijzigingen via commando worden na ~1.5s zichtbaar.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 hover:scale-105 transition-transform">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1" style={{ color: accent }}>
        {icon} {label}
      </div>
      <p className="text-lg font-bold font-mono">{value}</p>
    </div>
  );
}
