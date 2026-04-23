import { FileText, Clock, CheckCircle, XCircle, Zap, Users } from "lucide-react";

const statItems = [
  { key: "totalApps", label: "Sollicitaties", icon: FileText, color: "#3B82F6" },
  { key: "pending", label: "In Afwachting", icon: Clock, color: "#F59E0B" },
  { key: "accepted", label: "Geaccepteerd", icon: CheckCircle, color: "#10B981" },
  { key: "rejected", label: "Afgewezen", icon: XCircle, color: "#EF4444" },
  { key: "openPositions", label: "Open Posities", icon: Zap, color: "#8B5CF6" },
  { key: "adminCount", label: "Admin Users", icon: Users, color: "#06B6D4" },
];

export function AdminStats({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.key} className="card-glow rounded-xl bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4" style={{ color: item.color }} />
              <span className="text-2xl font-bold text-foreground">{stats?.[item.key] ?? 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}
