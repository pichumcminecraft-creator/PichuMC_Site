import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const TOKENS = [
  { key: "theme_primary", cssVar: "--primary" },
  { key: "theme_background", cssVar: "--background" },
  { key: "theme_card", cssVar: "--card" },
  { key: "theme_foreground", cssVar: "--foreground" },
  { key: "theme_secondary", cssVar: "--secondary" },
  { key: "theme_border", cssVar: "--border" },
  { key: "theme_destructive", cssVar: "--destructive" },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apply = async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      if (!data) return;
      const map: Record<string, string> = {};
      data.forEach((r: any) => (map[r.key] = r.value));
      const root = document.documentElement;
      TOKENS.forEach(({ key, cssVar }) => {
        if (map[key]) {
          root.style.setProperty(cssVar, map[key]);
          if (cssVar === "--primary") root.style.setProperty("--ring", map[key]);
          if (cssVar === "--card") root.style.setProperty("--popover", map[key]);
        }
      });
    };
    apply();

    const channel = supabase
      .channel("theme-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, apply)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  return <>{children}</>;
}
