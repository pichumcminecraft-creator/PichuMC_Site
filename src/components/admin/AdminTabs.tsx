import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Crown, Clock, Settings } from "lucide-react";
import { PositionsTab } from "./PositionsTab";
import { ApplicationsTab } from "./ApplicationsTab";
import { DiscordTab } from "./DiscordTab";
import { UsersTab } from "./UsersTab";
import { RolesTab } from "./RolesTab";
import { ActivityTab } from "./ActivityTab";
import { SiteSettingsTab } from "./SiteSettingsTab";

export function AdminTabs({ onRefreshStats }: { onRefreshStats: () => void }) {
  return (
    <Tabs defaultValue="positions">
      <TabsList className="bg-card border border-border mb-6 flex-wrap h-auto gap-1 p-1">
        <TabsTrigger value="positions" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          <Zap className="w-3.5 h-3.5" /> Posities
        </TabsTrigger>
        <TabsTrigger value="applications" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Sollicitaties
        </TabsTrigger>
        <TabsTrigger value="discord" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Discord
        </TabsTrigger>
        <TabsTrigger value="users" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Gebruikers
        </TabsTrigger>
        <TabsTrigger value="roles" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          <Crown className="w-3.5 h-3.5" /> Rollen
        </TabsTrigger>
        <TabsTrigger value="activity" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          <Clock className="w-3.5 h-3.5" /> Activiteit
        </TabsTrigger>
        <TabsTrigger value="site-settings" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          <Settings className="w-3.5 h-3.5" /> Site Instellingen
        </TabsTrigger>
      </TabsList>

      <TabsContent value="positions"><PositionsTab onRefresh={onRefreshStats} /></TabsContent>
      <TabsContent value="applications"><ApplicationsTab /></TabsContent>
      <TabsContent value="discord"><DiscordTab /></TabsContent>
      <TabsContent value="users"><UsersTab /></TabsContent>
      <TabsContent value="roles"><RolesTab /></TabsContent>
      <TabsContent value="activity"><ActivityTab /></TabsContent>
      <TabsContent value="site-settings"><SiteSettingsTab /></TabsContent>
    </Tabs>
  );
}
