import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getAdminUser, clearAuth } from "@/lib/api";
import {
  LayoutDashboard, ListTodo, CalendarOff, Users2, Settings, Zap, FileText,
  MessageCircle, Crown, Clock, ChevronLeft, ChevronRight, LogOut, Shield, Megaphone, Palette
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { TasksPage } from "@/components/admin/TasksPage";
import { AbsencesPage } from "@/components/admin/AbsencesPage";
import { AnnouncementsPage } from "@/components/admin/AnnouncementsPage";
import { UsersTab } from "@/components/admin/UsersTab";
import { PositionsTab } from "@/components/admin/PositionsTab";
import { ApplicationsTab } from "@/components/admin/ApplicationsTab";
import { DiscordTab } from "@/components/admin/DiscordTab";
import { RolesTab } from "@/components/admin/RolesTab";
import { SiteSettingsTab } from "@/components/admin/SiteSettingsTab";
import { ThemeTab } from "@/components/admin/ThemeTab";
import { ActivityTab } from "@/components/admin/ActivityTab";
import { OwnerPanel } from "@/components/admin/OwnerPanel";
import pichuLogo from "@/assets/PichuMC_logo.png";

const staffItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "tasks", label: "Mijn Taken", icon: ListTodo },
  { key: "absences", label: "Afmeldingen", icon: CalendarOff },
  { key: "announcements", label: "Mededelingen", icon: Megaphone },
];

const adminItems = [
  { key: "team", label: "Team", icon: Users2 },
  { key: "applications", label: "Sollicitaties", icon: FileText },
  { key: "positions", label: "Posities", icon: Zap },
  { key: "discord", label: "Discord", icon: MessageCircle },
  { key: "roles", label: "Rollen", icon: Crown },
  { key: "activity", label: "Activiteit", icon: Clock },
  { key: "site-settings", label: "Teksten", icon: Settings },
  { key: "theme", label: "Thema & Kleuren", icon: Palette },
  { key: "owner", label: "Owner Panel", icon: Crown },
];

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const user = getAdminUser();
  const isOwner = user?.role === "eigenaar";
  const hasPerm = (perm: string) => isOwner || user?.permissions?.[perm] === true;

  useEffect(() => {
    if (!getToken()) navigate("/admin/login");
    const onNav = (e: any) => setActivePage(e.detail);
    window.addEventListener("admin:navigate", onNav);
    return () => window.removeEventListener("admin:navigate", onNav);
  }, []);

  const handleLogout = () => { clearAuth(); navigate("/admin/login"); };

  const roleName = user?.role || "Staff";

  const permMap: Record<string, string> = {
    team: "users_view", applications: "applications_view", positions: "positions_view",
    discord: "discord_view", roles: "roles_view", activity: "activity_view",
    "site-settings": "content_view", theme: "content_manage", announcements: "announcements_manage",
    owner: "owner_panel",
  };

  const visibleAdminItems = adminItems.filter((item) => hasPerm(permMap[item.key] || ""));

  const NavButton = ({ item, isAdmin }: { item: { key: string; label: string; icon: React.ElementType }; isAdmin?: boolean }) => {
    const Icon = item.icon;
    const isActive = activePage === item.key;
    return (
      <button
        onClick={() => setActivePage(item.key)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
          isActive && isAdmin
            ? "bg-destructive/15 text-destructive font-medium border border-destructive/20"
            : isActive
            ? "bg-primary text-primary-foreground font-medium shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={cn(
        "flex flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}>
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <img src={pichuLogo} alt="PichuMC" className="w-8 h-8 rounded-lg object-contain shrink-0" />
          {!collapsed && <span className="font-bold text-foreground text-sm">PichuMC Staff</span>}
        </div>

        {/* Staff Section */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-1">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Staff</span>
          </div>
        )}
        <nav className="px-2 py-1 space-y-0.5">
          {staffItems.map((item) => (
            <NavButton key={item.key} item={item} />
          ))}
        </nav>

        {/* Admin Section */}
        {visibleAdminItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-4 pt-5 pb-1">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-destructive" />
                  <span className="text-[10px] font-semibold text-destructive uppercase tracking-wider">Admin</span>
                </div>
              </div>
            )}
            {collapsed && <div className="my-2 mx-2 border-t border-destructive/30" />}
            <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
              {visibleAdminItems.map((item) => (
                <NavButton key={item.key} item={item} isAdmin />
              ))}
            </nav>
          </>
        )}

        {/* User info */}
        <div className="border-t border-border p-3 mt-auto">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {user?.username?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.username}</p>
                <p className="text-[10px] text-primary">{roleName}</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary mx-auto">
              {user?.username?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mt-3 transition-colors",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Uitloggen</span>}
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="border-t border-border p-2 text-muted-foreground hover:text-foreground flex items-center justify-center"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {activePage === "dashboard" && <AdminDashboard />}
          {activePage === "tasks" && <TasksPage />}
          {activePage === "absences" && <AbsencesPage />}
          {activePage === "announcements" && <AnnouncementsPage />}
          {activePage === "team" && <UsersTab />}
          {activePage === "applications" && <ApplicationsTab />}
          {activePage === "positions" && <PositionsTab onRefresh={() => {}} />}
          {activePage === "discord" && <DiscordTab />}
          {activePage === "roles" && <RolesTab />}
          {activePage === "activity" && <ActivityTab />}
          {activePage === "site-settings" && <SiteSettingsTab />}
          {activePage === "theme" && <ThemeTab />}
          {activePage === "owner" && <OwnerPanel />}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
