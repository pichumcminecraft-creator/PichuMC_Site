import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PositionCard } from "@/components/PositionCard";
import { ApplicationModal } from "@/components/ApplicationModal";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import pichuLogo from "@/assets/PichuMC_logo.png";

const Apply = () => {
  const [selectedPosition, setSelectedPosition] = useState<any>(null);

  const { data: settings = [] } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      return data || [];
    },
  });

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("positions").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const getSetting = (key: string, fallback: string) => {
    const s = settings.find((s: any) => s.key === key);
    return s?.value || fallback;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Terug naar home
        </Link>

        <div className="text-center mb-12">
          <img src={pichuLogo} alt="PichuMC" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            {getSetting("apply_title", "Staff Sollicitaties")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {getSetting("apply_subtitle", "Word onderdeel van het PichuMC team!")}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground">Laden...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {positions.map((pos: any) => (
              <PositionCard key={pos.id} position={pos} onApply={setSelectedPosition} />
            ))}
          </div>
        )}
      </div>

      <footer className="text-center py-6 flex items-center justify-center gap-2">
        <img src={pichuLogo} alt="PichuMC" className="w-5 h-5 object-contain" />
        <span className="text-muted-foreground text-sm">{getSetting("footer_text", "© 2025 PichuMC")}</span>
      </footer>

      <ApplicationModal position={selectedPosition} open={!!selectedPosition} onClose={() => setSelectedPosition(null)} />
    </div>
  );
};

export default Apply;
