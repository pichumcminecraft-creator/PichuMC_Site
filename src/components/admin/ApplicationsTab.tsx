import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Trash2, Ticket } from "lucide-react";
import { toast } from "sonner";

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

export function ApplicationsTab() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <p className="text-muted-foreground">Laden...</p>;
  if (!apps.length) return <p className="text-muted-foreground">Geen sollicitaties gevonden.</p>;

  return (
    <div className="space-y-4">
      {apps.map((app) => (
        <div key={app.id} className="card-glow rounded-xl bg-card p-5">
          <div className="flex items-start justify-between mb-3">
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
            <p className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString("nl-NL")}</p>
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

          <div className="flex gap-2 mt-3">
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
            <Button size="sm" variant="outline" className="gap-1 text-destructive ml-auto" onClick={() => deleteApp(app.id)}>
              <Trash2 className="w-4 h-4" /> Verwijderen
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
