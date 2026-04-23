import { useEffect, useMemo, useState } from "react";
import {
  Crown, Database, Server, ShieldAlert, Sparkles, Lock, Cpu, AlertTriangle, Activity,
  Trash2, Download, FolderOpen, FolderClosed, Info, KeyRound, CheckCircle2, XCircle, Loader2,
  RefreshCw, Globe, Users, Eye, EyeOff, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { adminFetch, getAdminUser, setAuth } from "@/lib/api";
import { toast } from "sonner";

type McServer = {
  key: string;
  name: string;
  host: string;
  port: number;
  online: boolean;
  players: number;
  max: number;
  version: string | null;
  motd?: string | null;
};

type OwnerActionResult = {
  deleted?: number;
  rows?: any[];
  refreshStats?: boolean;
};

const MC_SERVERS = [
  { key: "velocity", name: "Velocity", host: "node-07.bluxnetwork.eu", port: 25003 },
  { key: "lobby", name: "Lobby", host: "node-07.bluxnetwork.eu", port: 25001 },
  { key: "skyblock", name: "Skyblock", host: "node-07.bluxnetwork.eu", port: 25002 },
  { key: "events", name: "Events", host: "node-07.bluxnetwork.eu", port: 25000 },
] as const;

const DB_INFO = {
  endpoint: "5.175.192.176:3306",
  host: "5.175.192.176",
  port: "3306",
  connectionsFrom: "%",
  username: "u161_hp1IoNxLiQ",
  password: "6KsbZLtIwL3xhwK4+h3@!E4h",
  database: "s161_SitePichumc",
  jdbc: "jdbc:mysql://u161_hp1IoNxLiQ:6KsbZLtIwL3xhwK4%2Bh3%40!E4h@5.175.192.176:3306/s161_SitePichumc",
} as const;

const SUPPORTED_ACTIONS = new Set([
  "delete-rejected-applications",
  "close-all-positions",
  "open-all-positions",
  "export-activity",
  "export-users",
]);

type ActionDef = {
  id: string;
  label: string;
  short: string;
  description: string;
  detail: string;          // exact wat het doet
  consequences: string[];  // gevolgen
  icon: React.ElementType;
  danger?: boolean;
  confirmText?: string;    // typed-confirmation woord, optioneel
  produces?: "csv";        // download
};

const ACTIONS: { section: string; items: ActionDef[] }[] = [
  {
    section: "Onderhoud & Opschonen",
    items: [
      {
        id: "clear-old-activity",
        label: "Oude activiteit opschonen",
        short: "Verwijder activity-log ouder dan 30 dagen",
        description: "Houdt je database licht en voorkomt eindeloze logs.",
        detail: "Verwijdert alle rijen uit activity_log waarvan created_at > 30 dagen geleden is. Recente activiteit (laatste 30 dagen) blijft staan.",
        consequences: [
          "Oude activity-log rijen worden permanent verwijderd",
          "Audit trail van vóór 30 dagen geleden gaat verloren",
          "Geen impact op gebruikers, sollicitaties of posities",
        ],
        icon: Trash2,
        danger: false,
      },
      {
        id: "delete-rejected-applications",
        label: "Afgewezen sollicitaties verwijderen",
        short: "Ruim alle 'afgewezen' sollicitaties op",
        description: "Verwijdert sollicitaties die de status 'afgewezen' hebben.",
        detail: "Alle records in de tabel applications met status = 'afgewezen' worden verwijderd. Geaccepteerde en wachtende sollicitaties blijven onaangetast.",
        consequences: [
          "Afgewezen sollicitaties zijn niet meer terug te halen",
          "Statistieken voor 'afgewezen' worden 0",
          "Discord-berichten in kanalen blijven bestaan",
        ],
        icon: Trash2,
        danger: true,
        confirmText: "VERWIJDER",
      },
    ],
  },
  {
    section: "Posities (bulk)",
    items: [
      {
        id: "close-all-positions",
        label: "Alle posities sluiten",
        short: "Zet elke openstaande positie op gesloten",
        description: "Tijdelijk de hele aanmeldsite dichtzetten.",
        detail: "Updates alle records in positions waar is_open = true naar is_open = false. Gebruikers kunnen tijdelijk niet solliciteren.",
        consequences: [
          "Apply-pagina toont geen posities meer",
          "Bestaande sollicitaties blijven bestaan",
          "Te ontdoen via 'Alle posities openen'",
        ],
        icon: FolderClosed,
        danger: true,
        confirmText: "SLUIT",
      },
      {
        id: "open-all-positions",
        label: "Alle posities openen",
        short: "Maak alle gesloten posities weer beschikbaar",
        description: "Snel alles weer live zetten.",
        detail: "Updates alle records in positions waar is_open = false naar is_open = true.",
        consequences: [
          "Alle posities verschijnen weer op de Apply pagina",
          "Sollicitaties kunnen direct binnenkomen",
        ],
        icon: FolderOpen,
        danger: false,
      },
    ],
  },
  {
    section: "Exports",
    items: [
      {
        id: "export-activity",
        label: "Activity log exporteren",
        short: "Download laatste 5000 rijen als CSV",
        description: "Voor audits of externe analyse.",
        detail: "Haalt de laatste 5000 records uit activity_log en levert een CSV bestand op (download in je browser).",
        consequences: [
          "Geen wijzigingen in de database",
          "Bestand bevat usernames en acties — bewaar veilig",
        ],
        icon: Download,
        produces: "csv",
      },
      {
        id: "export-users",
        label: "Gebruikerslijst exporteren",
        short: "Download alle admin gebruikers als CSV",
        description: "Lijst van staff inclusief rol en laatste login.",
        detail: "Exporteert id, username, rol en last_online voor alle admin_users.",
        consequences: [
          "Geen wijzigingen in de database",
          "Wachtwoord-hashes worden NIET geëxporteerd",
        ],
        icon: Download,
        produces: "csv",
      },
    ],
  },
];

export function OwnerPanel() {
  const user = getAdminUser();
  const [stats, setStats] = useState<any>(null);
  const [open, setOpen] = useState<ActionDef | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [mcServers, setMcServers] = useState<McServer[] | null>(null);
  const [mcLoading, setMcLoading] = useState(false);
  const [mcCheckedAt, setMcCheckedAt] = useState<string | null>(null);
  const [passwordVerified, setPasswordVerified] = useState(false);

  const availableActions = useMemo(() => ACTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!SUPPORTED_ACTIONS.has(item.id)) return false;
      if (item.id === "delete-rejected-applications") return !!user?.permissions?.applications_manage || user?.role === "eigenaar";
      if (item.id === "close-all-positions" || item.id === "open-all-positions") return !!user?.permissions?.positions_manage || user?.role === "eigenaar";
      if (item.id === "export-activity") return !!user?.permissions?.activity_view || user?.role === "eigenaar";
      if (item.id === "export-users") return !!user?.permissions?.users_view || !!user?.permissions?.users_manage || user?.role === "eigenaar";
      return true;
    }),
  })).filter((section) => section.items.length > 0), [user]);

  const loadMc = async (manual = false) => {
    setMcLoading(true);
    try {
      const results = await Promise.all(
        MC_SERVERS.map(async (server) => {
          try {
            const res = await fetch(`https://api.mcsrvstat.us/3/${server.host}:${server.port}`);
            const data = await res.json();
            return {
              ...server,
              online: !!data.online,
              players: data.players?.online ?? 0,
              max: data.players?.max ?? 0,
              version: data.version || null,
              motd: Array.isArray(data.motd?.clean) ? data.motd.clean.join(" ") : null,
            } satisfies McServer;
          } catch {
            return { ...server, online: false, players: 0, max: 0, version: null, motd: null } satisfies McServer;
          }
        }),
      );
      setMcServers(results);
      setMcCheckedAt(new Date().toISOString());
      if (manual) toast.success("Serverstatus bijgewerkt");
    } catch (e: any) {
      toast.error(e?.message || "Kon serverstatus niet laden");
    } finally {
      setMcLoading(false);
    }
  };

  useEffect(() => {
    adminFetch("stats").then(setStats).catch(() => {});
    loadMc();
    const t = setInterval(() => loadMc(false), 60_000);
    return () => clearInterval(t);
  }, []);

  const close = () => {
    setOpen(null); setPassword(""); setConfirm(""); setResult(null); setBusy(false); setPasswordVerified(false);
  };

  const verifyPassword = async () => {
    if (!user?.username) throw new Error("Gebruiker niet gevonden");
    const data = await adminFetch("login", { username: user.username, password });
    if (data?.token && data?.user) setAuth(data.token, data.user);
    return true;
  };

  const runAction = async (actionId: string): Promise<OwnerActionResult> => {
    switch (actionId) {
      case "clear-old-activity": {
        const rows = await adminFetch("activity-log");
        return { rows, refreshStats: false };
      }
      case "delete-rejected-applications": {
        const apps = await adminFetch("applications");
        const rejected = (apps || []).filter((app: any) => app.status === "afgewezen");
        await Promise.all(rejected.map((app: any) => adminFetch("delete-application", { id: app.id })));
        return { deleted: rejected.length, refreshStats: true };
      }
      case "close-all-positions": {
        const positions = await adminFetch("positions");
        const openPositions = (positions || []).filter((position: any) => position.is_open);
        await Promise.all(openPositions.map((position: any) => adminFetch("update-position", { id: position.id, is_open: false })));
        return { deleted: openPositions.length, refreshStats: true };
      }
      case "open-all-positions": {
        const positions = await adminFetch("positions");
        const closedPositions = (positions || []).filter((position: any) => !position.is_open);
        await Promise.all(closedPositions.map((position: any) => adminFetch("update-position", { id: position.id, is_open: true })));
        return { deleted: closedPositions.length, refreshStats: true };
      }
      case "export-activity": {
        const rows = await adminFetch("activity-log");
        return { rows };
      }
      case "export-users": {
        const rows = await adminFetch("users");
        return {
          rows: (rows || []).map((entry: any) => ({
            id: entry.id,
            username: entry.username,
            role: entry.roles?.name || entry.role,
            last_online: entry.last_online,
            created_at: entry.created_at,
          })),
        };
      }
      default:
        throw new Error("Deze actie is nog niet gekoppeld");
    }
  };

  const execute = async () => {
    if (!open) return;
    if (open.confirmText && confirm !== open.confirmText) {
      toast.error(`Typ "${open.confirmText}" om te bevestigen`);
      return;
    }
    if (!password) { toast.error("Wachtwoord vereist"); return; }
    setBusy(true);
    try {
      if (!passwordVerified) {
        await verifyPassword();
        setPasswordVerified(true);
      }
      const data = await runAction(open.id);
      if (open.produces === "csv") {
        downloadCsv(open.id, data.rows || []);
      }
      const deleted = typeof data.deleted === "number" ? ` (${data.deleted} rijen)` : "";
      setResult({ ok: true, msg: `Succesvol uitgevoerd${deleted}` });
      toast.success(`${open.label} voltooid`);
      if (data.refreshStats) adminFetch("stats").then(setStats).catch(() => {});
    } catch (err: any) {
      setResult({ ok: false, msg: err.message || "Er ging iets mis" });
      toast.error(err.message || "Fout");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/40 p-8 bg-gradient-to-br from-primary/15 via-card to-card">
        <div className="absolute inset-0 opacity-20 pointer-events-none"
             style={{ backgroundImage: "radial-gradient(circle at 20% 20%, hsl(var(--primary)) 0%, transparent 40%)" }} />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Owner Panel</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Volledige Controle</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg">
              Welkom, {user?.username}. Acties hier zijn direct van invloed op de live database. Iedere actie
              vereist je wachtwoord ter bevestiging.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/15 border border-destructive/30">
            <Lock className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs text-destructive font-medium">Hoog beveiligde zone</span>
          </div>
        </div>
      </div>

      {/* Vitals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Vital icon={Server} label="Edge functies" value="Live" />
        <Vital icon={Database} label="Database" value="Verbonden" />
        <Vital icon={Cpu} label="Status API" value="OK" />
        <Vital icon={Activity} label="Admins" value={String(stats?.adminCount ?? "-")} />
      </div>

      {/* Minecraft server status */}
      <div className="rounded-3xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Minecraft servers</h2>
            {mcCheckedAt && (
              <span className="text-[10px] text-muted-foreground">
                · gecheckt {new Date(mcCheckedAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => loadMc(true)} disabled={mcLoading} className="h-7 gap-1 text-xs">
            <RefreshCw className={cn("w-3 h-3", mcLoading && "animate-spin")} /> Verversen
          </Button>
        </div>

        {mcServers === null && mcLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(mcServers || []).map((s) => (
              <McServerCard key={s.key} s={s} />
            ))}
          </div>
        )}

        {mcServers && mcServers.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Totaal online:{" "}
              <span className="text-foreground font-semibold">
                {mcServers.reduce((sum, s) => sum + (s.online ? s.players : 0), 0)}
              </span>
            </span>
            <span>·</span>
            <span>
              Servers up:{" "}
              <span className="text-primary font-semibold">
                {mcServers.filter(s => s.online).length}/{mcServers.length}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* MySQL Database */}
      <DatabaseWidget />


      {availableActions.map((sec) => (
        <div key={sec.section} className="rounded-3xl bg-card border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{sec.section}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sec.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setOpen(item)}
                className={cn(
                  "text-left p-4 rounded-2xl border transition-all flex items-start gap-3 group",
                  item.danger
                    ? "bg-destructive/5 border-destructive/20 hover:border-destructive/50 hover:bg-destructive/10"
                    : "bg-secondary border-border hover:border-primary/40"
                )}
              >
                <div className={cn(
                  "size-10 rounded-xl flex items-center justify-center shrink-0",
                  item.danger ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    {item.danger && <ShieldAlert className="w-3.5 h-3.5 text-destructive" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.short}</p>
                  <span className="text-[10px] text-primary font-medium mt-2 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    <Info className="w-3 h-3" /> Bekijk details
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Detail / confirm dialog */}
      <Dialog open={!!open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="sm:max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <open.icon className={cn("w-5 h-5", open.danger ? "text-destructive" : "text-primary")} />
                  {open.label}
                </DialogTitle>
                <DialogDescription>{open.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="rounded-xl bg-secondary border border-border p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    Wat doet deze actie?
                  </p>
                  <p className="text-sm text-foreground">{open.detail}</p>
                </div>

                <div className={cn(
                  "rounded-xl p-3 border",
                  open.danger ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/20"
                )}>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className={cn("w-3 h-3", open.danger ? "text-destructive" : "text-primary")} />
                    Gevolgen
                  </p>
                  <ul className="space-y-1">
                    {open.consequences.map((c) => (
                      <li key={c} className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-muted-foreground mt-0.5">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {result ? (
                  <div className={cn(
                    "rounded-xl p-3 border flex items-center gap-2 text-sm",
                    result.ok ? "bg-primary/10 border-primary/30 text-primary" : "bg-destructive/10 border-destructive/30 text-destructive"
                  )}>
                    {result.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {result.msg}
                  </div>
                ) : (
                  <>
                    {open.confirmText && (
                      <div>
                        <Label className="text-xs">
                          Typ <span className="font-mono text-destructive">{open.confirmText}</span> om te bevestigen
                        </Label>
                        <Input
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          placeholder={open.confirmText}
                          className="mt-1 bg-secondary border-border font-mono"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <KeyRound className="w-3 h-3" /> Bevestig met je wachtwoord
                      </Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Wachtwoord"
                        className="mt-1 bg-secondary border-border"
                        autoFocus
                      />
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={close}>{result ? "Sluiten" : "Annuleer"}</Button>
                {!result && (
                  <Button
                    onClick={execute}
                    disabled={busy}
                    variant={open.danger ? "destructive" : "default"}
                  >
                    {busy ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Bezig...</> : "Uitvoeren"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Vital({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
      <div className="size-10 rounded-xl flex items-center justify-center bg-primary/15 text-primary shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function McServerCard({ s }: { s: any }) {
  const address = `${s.host}:${s.port}`;
  const copy = () => {
    navigator.clipboard.writeText(address).then(() => toast.success("Adres gekopieerd"));
  };
  const pct = s.online && s.max > 0 ? Math.min(100, Math.round((s.players / s.max) * 100)) : 0;
  return (
    <div className={cn(
      "rounded-2xl border p-4 transition-colors",
      s.online
        ? "bg-secondary border-border hover:border-primary/40"
        : "bg-destructive/5 border-destructive/20"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "size-2 rounded-full",
              s.online ? "bg-primary animate-pulse" : "bg-destructive"
            )} />
            <p className="text-sm font-semibold text-foreground">{s.name}</p>
          </div>
          <button
            onClick={copy}
            className="text-[11px] text-muted-foreground font-mono hover:text-primary transition-colors mt-0.5"
            title="Klik om te kopiëren"
          >
            {address}
          </button>
        </div>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider",
          s.online
            ? "bg-primary/10 text-primary border-primary/30"
            : "bg-destructive/10 text-destructive border-destructive/30"
        )}>
          {s.online ? "Online" : "Offline"}
        </span>
      </div>

      {s.online ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Spelers</span>
            <span className="text-foreground tabular-nums font-semibold">
              {s.players}{s.max ? <span className="text-muted-foreground"> / {s.max}</span> : ""}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-card overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.max(pct, s.players > 0 ? 4 : 0)}%` }}
            />
          </div>
          {s.version && (
            <p className="text-[10px] text-muted-foreground mt-2 truncate">
              {s.version}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-destructive/80 mt-3">Server reageert niet</p>
      )}
    </div>
  );
}

function CopyField({ label, value, monospace = false, sensitive = false }: { label: string; value: string; monospace?: boolean; sensitive?: boolean }) {
  const [shown, setShown] = useState(!sensitive);
  const masked = sensitive && !shown ? "•".repeat(Math.min(value.length, 16)) : value;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} gekopieerd`);
    } catch {
      toast.error("Kopiëren mislukt");
    }
  };
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-xs text-foreground truncate",
          monospace && "font-mono"
        )}>
          {masked}
        </div>
        {sensitive && (
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setShown(s => !s)}>
            {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copy}>
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function DatabaseWidget() {
  return (
    <div className="rounded-3xl bg-card border border-border p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">MySQL Database</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
            Actief
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{DB_INFO.database}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <CopyField label="Endpoint" value={DB_INFO.endpoint} monospace />
        <CopyField label="Connections from" value={DB_INFO.connectionsFrom} monospace />
        <CopyField label="Username" value={DB_INFO.username} monospace />
        <CopyField label="Database" value={DB_INFO.database} monospace />
        <CopyField label="Host" value={DB_INFO.host} monospace />
        <CopyField label="Port" value={DB_INFO.port} monospace />
      </div>

      <div className="space-y-3">
        <CopyField label="Password" value={DB_INFO.password} monospace sensitive />
        <CopyField label="JDBC connection string" value={DB_INFO.jdbc} monospace sensitive />
      </div>

      <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Deze credentials geven volledige toegang tot de productie-database. Deel ze nooit en roteer het wachtwoord
          regelmatig via je hosting paneel.
        </p>
      </div>
    </div>
  );
}
  if (!rows.length) {
    toast.info("Geen data om te exporteren");
    return;
  }
  const keys = Array.from(rows.reduce((set, r) => {
    Object.keys(r || {}).forEach((k) => set.add(k));
    return set;
  }, new Set<string>())) as string[];
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
