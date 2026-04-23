import { useEffect, useMemo, useState } from "react";
import { adminFetch, getAdminUser } from "@/lib/api";
import {
  Users2, Crown, CalendarOff, Megaphone, Activity, Globe,
  Server, Sparkles, Search, Trophy, Medal, Zap, FileText,
  Sun, Moon, Coffee, PartyPopper, Flame, Gamepad2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseAnnouncement, type Audience } from "@/lib/announcements";
import pichuLogo from "@/assets/PichuMC_logo.png";

const FUN_FACTS = [
  "Een Enderman pakt geen blok op als je hem aankijkt 👀",
  "Pichu evolueert tot Pikachu als zijn vriendschap hoog is ⚡",
  "Een Creeper springt soms uit angst voor katten 🐱",
  "De langste Minecraft-wereld in 1 sessie was 138+ uur 🎮",
  "Skyblock startte als kleine map in 2011 🏝️",
  "1 Minecraft-dag duurt 20 minuten in het echt ⏱️",
  "De Wither werd toegevoegd in 1.4 (de 'Pretty Scary Update') 💀",
  "Eigenlijk heten Endermen oorspronkelijk 'Farlanders' 🌌",
];

const GREETINGS = [
  "Klaar om wat magie te doen?",
  "Laten we het netwerk soepel houden ✨",
  "De spelers rekenen op jou 🎯",
  "Tijd om te shinen 💫",
  "Vandaag wordt een goede dag 🚀",
];

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [audienceTab, setAudienceTab] = useState<Audience>("staff");
  const [now, setNow] = useState(new Date());
  const user = getAdminUser();
  const isOwner = user?.role === "eigenaar";
  const has = (perm: string) => isOwner || user?.permissions?.[perm] === true;

  useEffect(() => {
    adminFetch("stats").then(setStats).catch(() => {});
    // Veel activity ophalen voor leaderboard accuracy
    adminFetch("activity-log").then((d) => setActivity((d || []).slice(0, 200))).catch(() => {});
    adminFetch("announcements")
      .then((d) => setAnnouncements((d || []).map((a: any) => parseAnnouncement(a))))
      .catch(() => {});
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const roleName = user?.role || "Staff";
  const visibleAnnouncements = announcements.filter(a => a.audience === audienceTab);
  const heroAnnouncement = visibleAnnouncements.find(a => a.is_pinned) || visibleAnnouncements[0];

  // Echte actieve staff (laatst online < 15 min via stats endpoint)
  const activeStaff: any[] = stats?.activeStaff || [];
  const activeCount: number = stats?.activeStaffCount ?? 0;

  // Top online: combineer activity counts (vandaag) met online status
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  const counts: Record<string, number> = {};
  activity.forEach((a) => {
    if (new Date(a.created_at).getTime() >= todayMs) {
      counts[a.username] = (counts[a.username] || 0) + 1;
    }
  });
  // Voeg ook online staff toe (zelfs zonder vandaag-activity → 1 baseline)
  activeStaffEnsure: {
    // niets — onderstaande logica gebruikt activeStaff direct
  }
  const activeStaffNames = new Set(activeStaff.map((s) => s.username));
  activeStaff.forEach((s) => {
    if (!(s.username in counts)) counts[s.username] = 0;
  });
  const leaderboard = Object.entries(counts)
    .sort((a, b) => {
      const aOnline = activeStaffNames.has(a[0]) ? 1 : 0;
      const bOnline = activeStaffNames.has(b[0]) ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      return (b[1] as number) - (a[1] as number);
    })
    .slice(0, 8);
  const maxCount = Math.max(1, ...leaderboard.map((e) => e[1] as number));

  const bars = [40, 65, 50, 80, 35, 90, 70];
  const hour = now.getHours();
  const partOfDay =
    hour < 6 ? { label: "Nacht", icon: Moon, greet: "Nachtuil" } :
    hour < 12 ? { label: "Ochtend", icon: Coffee, greet: "Goedemorgen" } :
    hour < 18 ? { label: "Middag", icon: Sun, greet: "Goedemiddag" } :
    { label: "Avond", icon: Moon, greet: "Goedenavond" };
  const PartIcon = partOfDay.icon;

  const funFact = useMemo(() => FUN_FACTS[Math.floor(Date.now() / 86_400_000) % FUN_FACTS.length], []);
  const greetingTagline = useMemo(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)], []);

  // Welke stat-tiles zichtbaar op basis van perms
  const showApplications = has("applications_view") || has("applications_manage");
  const showAbsences = has("absences_manage");
  const showPositions = has("positions_view") || has("positions_manage");

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img src={pichuLogo} alt="PichuMC" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              PichuMC <span className="text-muted-foreground font-light">Staff</span>
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <PartIcon className="w-3 h-3" />
              {partOfDay.greet}, {user?.username} — {greetingTagline}
            </p>
          </div>
          <div className="ml-3 hidden md:flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1.5 text-xs">
            <span className={cn("size-2 rounded-full", activeCount > 0 ? "bg-primary animate-pulse" : "bg-muted-foreground/40")} />
            <span className="text-foreground font-medium">{activeCount} Staff online</span>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="hidden md:flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 text-foreground text-sm tabular-nums">
            <PartIcon className="w-4 h-4 text-primary" />
            {now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="hidden md:flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 w-60 text-muted-foreground text-sm">
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
        {/* HERO: announcements */}
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

        {/* Active staff */}
        <div className="rounded-3xl bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Staff online nu</span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-semibold text-foreground tabular-nums">{activeCount}</p>
            <p className="text-xs text-muted-foreground mb-1">van {stats?.adminCount ?? 0}</p>
          </div>
          <div className="flex -space-x-2 mt-3">
            {activeStaff.slice(0, 5).map((a, i) => (
              <div
                key={i}
                className="size-9 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center font-bold text-xs text-primary"
                title={`${a.username} • ${a.roles?.name || a.role}`}
                style={a.roles?.color ? { color: a.roles.color, borderColor: a.roles.color + "40" } : undefined}
              >
                {a.username?.[0]?.toUpperCase() || "?"}
              </div>
            ))}
            {activeCount === 0 && (
              <div className="text-xs text-muted-foreground">Niemand actief (laatste 15 min)</div>
            )}
          </div>
        </div>

        {/* Stats row — alleen tonen als perm */}
        {showApplications && (
          <StatTile
            label="Wachtende sollicitaties"
            value={stats?.pending ?? 0}
            icon={FileText}
            onClick={() => navigate("applications")}
          />
        )}
        {showAbsences && (
          <StatTile
            label="Afmeldingen actief"
            value={stats?.activeAbsences ?? 0}
            icon={CalendarOff}
            onClick={() => navigate("absences")}
          />
        )}
        {!showApplications && !showAbsences && showPositions && (
          <StatTile
            label="Open posities"
            value={stats?.openPositions ?? 0}
            icon={Zap}
            onClick={() => navigate("positions")}
          />
        )}
        {/* Fun fact tile vult de rij als andere niet zichtbaar zijn */}
        {(!showApplications || !showAbsences) && (
          <FunFactTile fact={funFact} />
        )}

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

        {/* Activity feed (spans 2) — alleen als activity_view */}
        {has("activity_view") ? (
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
        ) : (
          <MotivationalTile username={user?.username} />
        )}

        {/* Quick actions */}
        <div className="md:col-span-4 rounded-3xl bg-card border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Snelle acties
          </h3>
          <QuickActions user={user} />
        </div>
      </div>
    </div>
  );
}

function navigate(page: string) {
  window.dispatchEvent(new CustomEvent("admin:navigate", { detail: page }));
}

function StatTile({
  label, value, icon: Icon, onClick,
}: { label: string; value: number | string; icon: React.ElementType; onClick?: () => void }) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "rounded-3xl bg-card border border-border p-5 text-left w-full",
        onClick && "hover:border-primary/40 hover:bg-card/80 transition-colors"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="text-3xl font-semibold text-foreground tabular-nums">{value}</p>
    </Comp>
  );
}

function FunFactTile({ fact }: { fact: string }) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-primary/80">Wist je dat?</span>
        <Gamepad2 className="w-4 h-4 text-primary" />
      </div>
      <p className="text-sm text-foreground leading-relaxed">{fact}</p>
    </div>
  );
}

function MotivationalTile({ username }: { username?: string }) {
  return (
    <div className="md:col-span-2 rounded-3xl bg-gradient-to-br from-primary/15 via-card to-card border border-primary/20 p-6 flex items-center gap-4">
      <div className="size-14 rounded-2xl bg-primary/20 flex items-center justify-center">
        <PartyPopper className="w-7 h-7 text-primary" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">Hé {username}, jij bent een legend 🌟</p>
        <p className="text-sm text-muted-foreground">Bedankt voor het draaiend houden van PichuMC.</p>
      </div>
      <Flame className="ml-auto w-6 h-6 text-primary/60" />
    </div>
  );
}

function QuickActions({ user }: { user: any }) {
  const isOwner = user?.role === "eigenaar";
  const has = (perm: string) => isOwner || user?.permissions?.[perm] === true;

  const all: { perm: string; page: string; icon: React.ElementType; label: string }[] = [
    { perm: "announcements_manage", page: "announcements", icon: Megaphone, label: "Mededeling plaatsen" },
    { perm: "absences_manage", page: "absences", icon: CalendarOff, label: "Afmeldingen beheren" },
    { perm: "applications_view", page: "applications", icon: FileText, label: "Sollicitaties bekijken" },
    { perm: "users_view", page: "team", icon: Users2, label: "Team bekijken" },
    { perm: "positions_view", page: "positions", icon: Zap, label: "Posities beheren" },
    { perm: "tasks_manage", page: "tasks", icon: FileText, label: "Taken bekijken" },
    { perm: "owner_panel", page: "owner", icon: Crown, label: "Owner Panel" },
    { perm: "activity_view", page: "activity", icon: Activity, label: "Activiteit log" },
  ];
  // Iedereen mag eigen taken zien — voeg fallback toe
  const visible = all.filter((a) => has(a.perm));
  // Altijd 'Mijn Taken' beschikbaar voor iedere staff
  if (!visible.find((v) => v.page === "tasks")) {
    visible.unshift({ perm: "*", page: "tasks", icon: FileText, label: "Mijn Taken" });
  }

  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">Geen acties beschikbaar voor je rol.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {visible.slice(0, 8).map((a) => (
        <button
          key={a.page}
          onClick={() => navigate(a.page)}
          className="flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/70 border border-border hover:border-primary/30 transition-all text-left group"
        >
          <div className="size-9 rounded-lg bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
            <a.icon className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
