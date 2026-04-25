import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Clock, User, Settings, Shield, Key, Trash2, Plus, LogIn, Search, Download, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ActivityEntry {
  id: string;
  user_id: string;
  username: string;
  action: string;
  details: string | null;
  created_at: string;
}

const actionIcons: Record<string, React.ElementType> = {
  login: LogIn,
  "add-user": Plus,
  "delete-user": Trash2,
  "change-password": Key,
  "change-user-password": Key,
  "update-position": Settings,
  "update-application": Shield,
  "add-role": Plus,
  "update-role": Settings,
  "delete-role": Trash2,
  "update-user-role": Shield,
  "update-discord": Settings,
  "discord-broadcast": Settings,
  "dm-ticket-invite": Shield,
};

const actionLabels: Record<string, string> = {
  login: "Ingelogd",
  "add-user": "Gebruiker toegevoegd",
  "delete-user": "Gebruiker verwijderd",
  "change-password": "Wachtwoord gewijzigd",
  "change-user-password": "Wachtwoord gereset",
  "update-position": "Positie bijgewerkt",
  "update-application": "Sollicitatie bijgewerkt",
  "add-role": "Rol aangemaakt",
  "update-role": "Rol bijgewerkt",
  "delete-role": "Rol verwijderd",
  "update-user-role": "Gebruikersrol gewijzigd",
  "update-discord": "Discord bijgewerkt",
  "discord-broadcast": "Discord broadcast",
  "dm-ticket-invite": "Ticket DM gestuurd",
  "bulk-delete-applications": "Bulk verwijderd",
  "bulk-update-applications": "Bulk bijgewerkt",
};

export function ActivityTab() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminFetch("activity-log");
      setEntries(data || []);
    } catch {}
    setLoading(false);
  };

  const users = useMemo(() => Array.from(new Set(entries.map((e) => e.username))).sort(), [entries]);
  const actions = useMemo(() => Array.from(new Set(entries.map((e) => e.action))).sort(), [entries]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (userFilter !== "all" && e.username !== userFilter) return false;
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (!s) return true;
      return (
        e.username.toLowerCase().includes(s) ||
        e.action.toLowerCase().includes(s) ||
        (e.details || "").toLowerCase().includes(s)
      );
    });
  }, [entries, search, userFilter, actionFilter]);

  const exportCsv = () => {
    const headers = ["datum", "gebruiker", "actie", "details"];
    const rows = filtered.map((e) => [
      new Date(e.created_at).toISOString(),
      e.username,
      e.action,
      (e.details || "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pichumc-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} rijen geëxporteerd`);
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Zojuist";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min geleden`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} uur geleden`;
    return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground text-lg">Activiteiten Log</h3>
        <span className="text-xs text-muted-foreground">{filtered.length} van {entries.length}</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Verversen
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1">
            <Download className="w-4 h-4" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek in details, gebruiker of actie..."
            className="pl-9 bg-secondary"
          />
        </div>
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="bg-secondary"><SelectValue placeholder="Gebruiker" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle gebruikers</SelectItem>
            {users.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="bg-secondary"><SelectValue placeholder="Actie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle acties</SelectItem>
            {actions.map((a) => <SelectItem key={a} value={a}>{actionLabels[a] || a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">Geen activiteiten gevonden.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const Icon = actionIcons[entry.action] || Settings;
            return (
              <div key={entry.id} className="card-glow rounded-xl bg-card p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span className="font-semibold text-foreground text-sm">{entry.username}</span>
                    <span className="text-xs text-muted-foreground">{actionLabels[entry.action] || entry.action}</span>
                  </div>
                  {entry.details && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.details}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(entry.created_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
