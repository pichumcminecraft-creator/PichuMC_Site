import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Crown, Clock, Settings, Server } from "lucide-react";
import { PositionsTab } from "./PositionsTab";
import { ApplicationsTab } from "./ApplicationsTab";
import { DiscordTab } from "./DiscordTab";
import { UsersTab } from "./UsersTab";
import { RolesTab } from "./RolesTab";
import { ActivityTab } from "./ActivityTab";
import { SiteSettingsTab } from "./SiteSettingsTab";
import { ServersTab } from "./ServersTab";

export function AdminTabs({ onRefreshStats }: { onRefreshStats: () => void }) {
  const trigger =
    "gap-1.5 transition-all duration-200 hover:scale-105 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_15px_hsl(var(--primary)/0.4)]";

  return (
    <Tabs defaultValue="positions" className="animate-fade-in">
      <TabsList className="bg-card border border-border mb-6 flex-wrap h-auto gap-1 p-1">
        <TabsTrigger value="positions" className={trigger}>
          <Zap className="w-3.5 h-3.5" /> Posities
        </TabsTrigger>
        <TabsTrigger value="applications" className={trigger}>
          Sollicitaties
        </TabsTrigger>
        <TabsTrigger value="servers" className={trigger}>
          <Server className="w-3.5 h-3.5" /> Servers
        </TabsTrigger>
        <TabsTrigger value="discord" className={trigger}>
          Discord
        </TabsTrigger>
        <TabsTrigger value="users" className={trigger}>
          Gebruikers
        </TabsTrigger>
        <TabsTrigger value="roles" className={trigger}>
          <Crown className="w-3.5 h-3.5" /> Rollen
        </TabsTrigger>
        <TabsTrigger value="activity" className={trigger}>
          <Clock className="w-3.5 h-3.5" /> Activiteit
        </TabsTrigger>
        <TabsTrigger value="site-settings" className={trigger}>
          <Settings className="w-3.5 h-3.5" /> Site Instellingen
        </TabsTrigger>
      </TabsList>

      <TabsContent value="positions" className="animate-fade-in-up"><PositionsTab onRefresh={onRefreshStats} /></TabsContent>
      <TabsContent value="applications" className="animate-fade-in-up"><ApplicationsTab /></TabsContent>
      <TabsContent value="servers" className="animate-fade-in-up"><ServersTab /></TabsContent>
      <TabsContent value="discord" className="animate-fade-in-up"><DiscordTab /></TabsContent>
      <TabsContent value="users" className="animate-fade-in-up"><UsersTab /></TabsContent>
      <TabsContent value="roles" className="animate-fade-in-up"><RolesTab /></TabsContent>
      <TabsContent value="activity" className="animate-fade-in-up"><ActivityTab /></TabsContent>
      <TabsContent value="site-settings" className="animate-fade-in-up"><SiteSettingsTab /></TabsContent>
    </Tabs>
  );
}
