import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Shield, Code, Video, Calendar, Hammer, Megaphone,
  Zap, ClipboardList, MessageCircle, Users, Star, Settings,
  ExternalLink
} from "lucide-react";
import pichuLogo from "@/assets/PichuMC_logo.png";

const iconMap: Record<string, React.ElementType> = {
  shield: Shield, code: Code, video: Video, calendar: Calendar,
  hammer: Hammer, megaphone: Megaphone, zap: Zap, clipboard: ClipboardList,
  "message-circle": MessageCircle, users: Users, star: Star, settings: Settings,
};

const Home = () => {
  const navigate = useNavigate();

  const { data: settings = [] } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      return data || [];
    },
  });

  const { data: navItems = [], isLoading } = useQuery({
    queryKey: ["nav-items"],
    queryFn: async () => {
      const { data } = await supabase.from("nav_items").select("*").eq("is_visible", true).order("sort_order");
      return data || [];
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["public-announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const getSetting = (key: string, fallback: string) => {
    const s = settings.find((s: any) => s.key === key);
    return s?.value || fallback;
  };

  const handleNavClick = (link: string) => {
    if (link.startsWith("http")) window.open(link, "_blank");
    else navigate(link);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="max-w-4xl w-full text-center">
          <img src={pichuLogo} alt="PichuMC" className="w-32 h-32 mx-auto mb-6 object-contain" />
          <h1 className="text-5xl md:text-6xl font-bold text-primary mb-4">
            {getSetting("home_title", "PichuMC")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            {getSetting("home_subtitle", "Welkom bij PichuMC!")}
          </p>

          {/* Public announcements */}
          {announcements.length > 0 && (
            <div className="max-w-xl mx-auto mb-10">
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-primary text-sm">Mededelingen</span>
                </div>
                <div className="space-y-2">
                  {announcements.slice(0, 3).map((a: any) => (
                    <div key={a.id}>
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      {a.content && <p className="text-xs text-muted-foreground">{a.content}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-muted-foreground">Laden...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {navItems.map((item: any) => {
                const Icon = iconMap[item.icon] || Zap;
                const isExternal = item.link?.startsWith("http");
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.link)}
                    className="card-glow rounded-xl bg-card p-6 flex flex-col items-center gap-4 transition-all hover:scale-[1.03] hover:shadow-lg text-left group"
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: item.color + "22" }}
                    >
                      <Icon className="w-7 h-7" style={{ color: item.color }} />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
                        {item.title}
                        {isExternal && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <footer className="text-center py-6 flex items-center justify-center gap-2">
        <img src={pichuLogo} alt="PichuMC" className="w-5 h-5 object-contain" />
        <span className="text-muted-foreground text-sm">{getSetting("footer_text", "© 2025 PichuMC")}</span>
      </footer>
    </div>
  );
};

export default Home;
