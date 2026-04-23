import { useEffect, useState } from "react";
import { adminFetch, getAdminUser } from "@/lib/api";
import {
  Users2, Crown, Clock, CalendarOff, Megaphone, Activity, Globe,
  Server, Sparkles, Search, Trophy, Medal, Zap, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseAnnouncement, type Audience } from "@/lib/announcements";
import pichuLogo from "@/assets/PichuMC_logo.png";

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [audienceTab, setAudienceTab] = useState<Audience>("staff");
  const user = getAdminUser();

  useEffect(() => {
    adminFetch("stats").then(setStats).catch(() => {});
    adminFetch("activity-log").then((d) => setActivity((d || []).slice(0, 6))).catch(() => {});
    adminFetch("announcements")
      .then((d) => setAnnouncements((d || []).map((a: any) => parseAnnouncement(a))))
      .catch(() => {});
  }, []);

  const roleName = user?.role || "Staff";
  const visibleAnnouncements = announcements.filter(a => a.audience === audienceTab);
  const heroAnnouncement = visibleAnnouncements.find(a => a.is_pinned) || visibleAnnouncements[0];

  // Mock contributor leaderboard from activity
  const leaderboard = Object.entries(
    activity.reduce((acc: Record<string, number>, a) => {
      acc[a.username] = (acc[a.username] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 4);

  // Mock weekly bars (could be real later)
  const bars = [40, 65, 50, 80, 35, 90, 70];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img src={pichuLogo} alt="PichuMC" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              PichuMC <span className="text-muted-foreground font-light">Admin</span>
            </h1>
            <p className="text-xs text-muted-foreground">Welkom terug, {user?.username}</p>
          </div>
          <div className="ml-3 hidden md:flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1.5 text-xs">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-foreground font-medium">{stats?.adminCount ?? 0} Staff actief</span>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="hidden md:flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 w-72 text-muted-foreground text-sm">
            <Search className="w-4 h-4" />
            <span>Zoeken...</span>
            <kbd className="ml-auto text-[10px] bg-secondary border border-border rounded px-1.5 py-0.5">/</kbd>
          </div>
          <span className="text-xs px-3 py-2 rounded-xl bg-primary/15 text-primary border border-primary/30 font-medium capitalize">
            {roleName}
          </span>
        </div>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 auto-rows-[minmax(0,auto)]">
        {/* HERO: announcements with audience tabs (spans 2x2) */}
        <div className="md:col-span-2 md:row-span-2 rounded-3xl bg-card border border-border p-6 flex flex-col gap-4 min-h-[320px]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit">
              <button
                onClick={() => setAudienceTab("staff")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all",
                  audienceTab === "staff" ? "bg-card text-primary border-b-2 border-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users2 className="w-3.5 h-3.5" /> Staff intern
              </button>
              <button
                onClick={() => setAudienceTab("public")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all",
                  audienceTab === "public" ? "bg-card text-foreground border-b-2 border-accent shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Globe className="w-3.5 h-3.5" /> Voor iedereen
              </button>
            </div>
            <Megaphone className="w-4 h-4 text-muted-foreground" />
          </div>

          {heroAnnouncement ? (
            <div className="flex flex-col gap-3 flex-1">
              <h2 className="text-2xl tracking-tight leading-tight text-foreground font-semibold">
                {heroAnnouncement.title}
              </h2>
              {heroAnnouncement.cleanContent && (
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {heroAnnouncement.cleanContent}
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-2">
                {heroAnnouncement.is_pinned && (
                  <span className="px-3 py-1 rounded-full border border-primary/30 text-[11px] text-primary bg-primary/10">
                    Vastgepind
                  </span>
                )}
                <span className={cn(
                  "px-3 py-1 rounded-full text-[11px] border",
                  audienceTab === "public"
                    ? "border-accent bg-accent/30 text-foreground"
                    : "border-border bg-secondary text-muted-foreground"
                )}>
                  {audienceTab === "public" ? "Zichtbaar op website" : "Alleen voor staff"}
                </span>
                {visibleAnnouncements.length > 1 && (
                  <span className="px-3 py-1 rounded-full text-[11px] border border-border bg-secondary text-muted-foreground">
                    +{visibleAnnouncements.length - 1} meer
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-8">
              <Megaphone className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Geen {audienceTab === "public" ? "openbare" : "interne"} mededelingen
              </p>
            </div>
          )}
        </div>

        {/* Server health */}
        <div className="rounded-3xl bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Server status</span>
            <Server className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-semibold text-foreground tabular-nums">
            19.8 <span className="text-xs text-muted-foreground font-normal">TPS</span>
          </div>
          <div className="mt-3 h-12 flex items-end gap-1">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-primary/60" style={{ height: `${h}%` }} />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Uptime 99.8% afgelopen 7d</p>
        </div>

        {/* Active staff avatars */}
        <div className="rounded-3xl bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Actieve admins</span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex -space-x-3 mt-2">
            {(activity.slice(0, 4) || []).map((a, i) => (
              <div
                key={i}
                className="size-10 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center font-bold text-xs text-primary"
                title={a.username}
              >
                {a.username?.[0]?.toUpperCase() || "?"}
              </div>
            ))}
            {activity.length === 0 && (
              <div className="text-xs text-muted-foreground">Geen activiteit</div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">Laatste 24u</p>
        </div>

        {/* Stats row */}
        <StatTile label="Wachtende sollicitaties" value={stats?.pending ?? 0} icon={FileText} />
        <StatTile label="Afmeldingen actief" value={stats?.activeAbsences ?? 0} icon={CalendarOff} />

        {/* Leaderboard (spans 2) */}
        <div className="md:col-span-2 rounded-3xl bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" /> Top bijdragers
            </h3>
            <span className="text-[10px] text-muted-foreground">Recent</span>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen activiteit</p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map(([name, count], i) => (
                <div key={name as string} className="flex items-center gap-3">
                  <div className={cn(
                    "size-8 rounded-full flex items-center justify-center text-xs font-bold",
                    i === 0 ? "bg-primary/25 text-primary" :
                    i === 1 ? "bg-primary/15 text-primary" :
                    i === 2 ? "bg-primary/10 text-primary/80" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    {i < 3 ? <Medal className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className="flex-1 text-sm text-foreground font-medium">{name as string}</span>
                  <span className="tabular-nums text-xs text-primary font-semibold">{count as number} acties</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed (spans 2) */}
        <div className="md:col-span-2 rounded-3xl bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Recente activiteit
            </h3>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen activiteit</p>
          ) : (
            <div className="space-y-3">
              {activity.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground font-medium">{a.username}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(a.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions (spans 4) */}
        <div className="md:col-span-4 rounded-3xl bg-card border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Snelle acties
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction icon={Megaphone} label="Mededeling plaatsen" />
            <QuickAction icon={CalendarOff} label="Afmelding goedkeuren" />
            <QuickAction icon={FileText} label="Sollicitaties bekijken" />
            <QuickAction icon={Users2} label="Team beheren" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, icon: Icon }: { label: string; value: number | string; icon: React.ElementType }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="text-3xl font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button className="flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/70 border border-border hover:border-primary/30 transition-all text-left group">
      <div className="size-9 rounded-lg bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}
