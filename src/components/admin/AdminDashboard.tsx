import { useEffect, useState } from "react";
import { adminFetch, getAdminUser } from "@/lib/api";
import { Users2, Crown, Clock, CalendarOff, Megaphone, TrendingUp, Activity } from "lucide-react";
import pichuLogo from "@/assets/PichuMC_logo.png";

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const user = getAdminUser();

  useEffect(() => {
    adminFetch("stats").then(setStats).catch(() => {});
    adminFetch("activity-log").then((d) => setActivity((d || []).slice(0, 5))).catch(() => {});
    adminFetch("announcements").then((d) => setAnnouncements((d || []).slice(0, 3))).catch(() => {});
  }, []);

  const roleName = user?.role || "Staff";
  const permissions = user?.permissions || {};
  const permLabels = Object.entries(permissions)
    .filter(([, v]) => v === true)
    .map(([k]) => k.replace(/_/g, " "))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <img src={pichuLogo} alt="PichuMC" className="w-12 h-12 object-contain" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welkom terug, {user?.username}!</h1>
          <p className="text-muted-foreground text-sm">Hier is een overzicht van het staff team.</p>
        </div>
      </div>

      {/* Announcements banner */}
      {announcements.filter(a => a.is_pinned).length > 0 && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary text-sm">Mededelingen</span>
          </div>
          {announcements.filter(a => a.is_pinned).map(a => (
            <div key={a.id} className="text-sm text-foreground">
              <span className="font-medium">{a.title}</span>
              {a.content && <span className="text-muted-foreground ml-2">— {a.content}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Totaal Staff" value={stats?.adminCount ?? 0} icon={Users2} color="text-primary" />
        <StatCard label="Rollen" value={stats?.totalRoles ?? "-"} icon={Crown} color="text-primary" />
        <StatCard label="Wachtend" value={stats?.pending ?? 0} icon={Clock} color="text-primary" />
        <StatCard label="Actief Afwezig" value={stats?.activeAbsences ?? 0} icon={CalendarOff} color="text-primary" />
      </div>

      {/* Role + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your role */}
        <div className="card-glow rounded-xl bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground text-lg">Je Rol</h3>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{roleName}</p>
              <p className="text-xs text-muted-foreground">
                {roleName === "eigenaar" ? "Volledige toegang" : "Beperkte toegang"}
              </p>
            </div>
          </div>
          {permLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {permLabels.map((p) => (
                <span key={p} className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card-glow rounded-xl bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground text-lg">Recente Activiteit</h3>
          </div>
          {activity.length === 0 ? (
            <p className="text-muted-foreground text-sm">Geen recente activiteit</p>
          ) : (
            <div className="space-y-3">
              {activity.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <span className="text-foreground font-medium text-sm">{a.username}</span>{" "}
                    <span className="text-muted-foreground text-sm">{a.action}</span>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("nl-NL")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="card-glow rounded-xl bg-card p-4 hover:bg-card/80 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
