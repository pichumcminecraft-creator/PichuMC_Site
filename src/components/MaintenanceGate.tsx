import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminUser } from "@/lib/api";
import { Wrench, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import pichuLogo from "@/assets/PichuMC_logo.png";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [bypass, setBypass] = useState(false);
  const navigate = useNavigate();
  const adminUser = getAdminUser();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["maintenance_mode", "maintenance_message"]);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => (map[r.key] = r.value));
      setEnabled(map.maintenance_mode === "true");
      setMessage(map.maintenance_message || "We zijn momenteel bezig met onderhoud.");
    };
    load();

    const channel = supabase
      .channel("maintenance-mode")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (enabled === null) return null;
  if (!enabled || bypass) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="relative mb-8 inline-block">
          <img src={pichuLogo} alt="PichuMC" className="w-24 h-24 mx-auto object-contain opacity-80" />
          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Wrench className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>
        <span className="inline-block text-[10px] uppercase tracking-[0.3em] text-primary font-bold mb-3">
          Onderhoud
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Even geduld...
        </h1>
        <p className="text-muted-foreground text-base mb-8 leading-relaxed">
          {message}
        </p>

        <div className="rounded-2xl bg-card border border-border p-4 mb-6">
          <p className="text-xs text-muted-foreground">
            Wij werken aan verbeteringen. Probeer het later nog eens.
          </p>
        </div>

        {adminUser && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <ShieldCheck className="w-3.5 h-3.5" />
              Ingelogd als {adminUser.username}
            </div>
            <Button size="sm" variant="outline" onClick={() => setBypass(true)}>
              Doorgaan naar site
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate("/admin")}>
              Naar admin panel
            </Button>
          </div>
        )}
        {!adminUser && (
          <button
            onClick={() => navigate("/admin/login")}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Staff login
          </button>
        )}
      </div>
    </div>
  );
}
