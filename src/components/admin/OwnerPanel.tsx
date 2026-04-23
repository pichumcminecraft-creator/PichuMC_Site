import { useState } from "react";
import { Crown, Database, Server, ShieldAlert, Sparkles, Lock, Cpu, AlertTriangle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAdminUser } from "@/lib/api";

/**
 * OwnerPanel — exclusieve eigenaar/owner_panel weergave.
 * Bewust ander UI dan dashboard: donker, "command bridge" stijl.
 */
export function OwnerPanel() {
  const user = getAdminUser();
  const [confirmOpen, setConfirmOpen] = useState(false);

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
              Welkom, {user?.username}. Hier vind je acties die alleen voor de eigenaar zijn — gevoelige
              instellingen, kritieke acties en systeemdiagnostiek.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/15 border border-destructive/30">
            <Lock className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs text-destructive font-medium">Hoog beveiligde zone</span>
          </div>
        </div>
      </div>

      {/* Vitals row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Vital icon={Server} label="Server status" value="Operationeel" tone="ok" />
        <Vital icon={Database} label="Database" value="Verbonden" tone="ok" />
        <Vital icon={Cpu} label="Edge functies" value="Live" tone="ok" />
      </div>

      {/* Action sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section
          title="Systeem Acties"
          icon={Sparkles}
          items={[
            { label: "Cache leegmaken", desc: "Verwijder alle gecachte query data.", danger: false },
            { label: "Activity log exporteren", desc: "Download volledige audit log als CSV.", danger: false },
            { label: "Sessies verlopen forceren", desc: "Log alle staff direct uit.", danger: true },
          ]}
        />
        <Section
          title="Permissies & Rollen"
          icon={ShieldAlert}
          items={[
            { label: "Owner toewijzen aan andere user", desc: "Draag eigenaarschap permanent over.", danger: true },
            { label: "Bulk rol aanpassen", desc: "Pas rol van meerdere admins tegelijk aan.", danger: false },
            { label: "Permissie audit", desc: "Bekijk welke admins welke rechten hebben.", danger: false },
          ]}
        />
      </div>

      {/* Danger zone */}
      <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h2 className="text-lg font-bold text-destructive">Danger Zone</h2>
        </div>
        <div className="space-y-3">
          <DangerRow
            title="Reset alle sollicitaties"
            description="Verwijder ALLE sollicitaties uit de database. Dit kan niet ongedaan worden gemaakt."
            onConfirm={() => setConfirmOpen(true)}
          />
          <DangerRow
            title="Onderhoud modus inschakelen"
            description="Sluit de website tijdelijk voor bezoekers. Alleen staff kan inloggen."
            onConfirm={() => {}}
          />
        </div>
        {confirmOpen && (
          <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            Functie nog niet aangesloten. Bevestig in een latere update.
          </div>
        )}
      </div>

      {/* Live monitor */}
      <div className="rounded-3xl bg-card border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Live monitor</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          {[
            { l: "API calls / min", v: "247" },
            { l: "Failed auth", v: "3" },
            { l: "DB queries", v: "1.2k" },
            { l: "Avg response", v: "82ms" },
          ].map((m) => (
            <div key={m.l} className="p-3 rounded-xl bg-secondary border border-border">
              <p className="text-xl font-semibold text-foreground tabular-nums">{m.v}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Vital({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: "ok" | "warn" }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4">
      <div className={cn(
        "size-12 rounded-xl flex items-center justify-center",
        tone === "ok" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-base font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, items }: { title: string; icon: React.ElementType; items: { label: string; desc: string; danger?: boolean }[] }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary border border-border hover:border-primary/30 transition-all">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{it.label}</p>
              <p className="text-xs text-muted-foreground truncate">{it.desc}</p>
            </div>
            <Button
              size="sm"
              variant={it.danger ? "destructive" : "outline"}
              className="shrink-0"
            >
              Uitvoeren
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DangerRow({ title, description, onConfirm }: { title: string; description: string; onConfirm: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-card border border-destructive/20">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button size="sm" variant="destructive" onClick={onConfirm}>Bevestigen</Button>
    </div>
  );
}
