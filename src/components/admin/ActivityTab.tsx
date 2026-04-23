import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Clock, User, Settings, Shield, Key, Trash2, Plus, LogIn } from "lucide-react";

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
};

export function ActivityTab() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await adminFetch("activity-log");
      setEntries(data || []);
    } catch {}
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
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground text-lg">Activiteiten Log</h3>
        <span className="text-xs text-muted-foreground">Laatste 100 acties</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nog geen activiteiten.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
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
