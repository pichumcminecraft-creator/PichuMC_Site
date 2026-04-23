import { useEffect, useState } from "react";
import { adminFetch, getAdminUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ListTodo, CheckCircle2, Loader2, Trash2, Circle, ArrowRight, Bot, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  todo: { label: "Te Doen", color: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.15)" },
  bezig: { label: "Bezig", color: "#3B82F6", bg: "rgba(59,130,246,0.15)" },
  voltooid: { label: "Voltooid", color: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.15)" },
};

export function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showDiscord, setShowDiscord] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [discordSettings, setDiscordSettings] = useState({ enabled: false, bot_token: "", channel_id: "", ping_role_id: "", embed_color: "#FFD700" });
  const [newTask, setNewTask] = useState({ title: "", description: "", assigned_user_id: "", assigned_role_id: "" });
  const user = getAdminUser();
  const isOwner = user?.role === "eigenaar";
  const canManage = isOwner || user?.permissions?.tasks_manage === true;

  useEffect(() => { load(); if (canManage) loadDiscord(); }, []);

  const load = async () => {
    try {
      const [taskData, userData, roleData] = await Promise.all([
        adminFetch("tasks"),
        adminFetch("users"),
        adminFetch("roles"),
      ]);
      setTasks(taskData || []);
      setUsers(userData || []);
      setRoles((roleData || []).filter((r: any) => !r.is_system));
    } catch {}
  };

  const loadDiscord = async () => {
    try { const d = await adminFetch("task-settings"); if (d) setDiscordSettings({ ...discordSettings, ...d }); } catch {}
  };

  const saveDiscord = async () => {
    try {
      await adminFetch("update-task-settings", discordSettings);
      toast.success("Discord instellingen opgeslagen");
    } catch { toast.error("Fout bij opslaan"); }
  };

  const addTask = async () => {
    if (!newTask.title) return toast.error("Vul een titel in");
    try {
      const body: any = { title: newTask.title, description: newTask.description };
      if (newTask.assigned_user_id) body.assigned_user_id = newTask.assigned_user_id;
      if (newTask.assigned_role_id) body.assigned_role_id = newTask.assigned_role_id;
      const data = await adminFetch("add-task", body);
      setTasks((prev) => [data, ...prev]);
      setNewTask({ title: "", description: "", assigned_user_id: "", assigned_role_id: "" });
      setShowAdd(false);
      toast.success("Taak aangemaakt");
    } catch (err: any) { toast.error(err.message); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await adminFetch("update-task", { id, status });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      toast.success("Status bijgewerkt");
    } catch { toast.error("Fout"); }
  };

  const deleteTask = async (id: string) => {
    try {
      await adminFetch("delete-task", { id });
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Taak verwijderd");
    } catch { toast.error("Fout"); }
  };

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  const counts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    bezig: tasks.filter((t) => t.status === "bezig").length,
    voltooid: tasks.filter((t) => t.status === "voltooid").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Taken</h1>
          <p className="text-sm text-muted-foreground">Beheer en bekijk alle taken.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button onClick={() => setShowDiscord(!showDiscord)} variant="outline" className="gap-1">
              <Bot className="w-4 h-4" /> Discord
            </Button>
          )}
          {canManage && (
            <Button onClick={() => setShowAdd(!showAdd)} className="gap-1">
              <Plus className="w-4 h-4" /> Nieuwe Taak
            </Button>
          )}
        </div>
      </div>

      {/* Discord settings */}
      {showDiscord && canManage && (
        <div className="card-glow rounded-xl bg-card p-6 border-l-4 border-l-[#5865F2]">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-[#5865F2]" />
            <h3 className="font-bold text-foreground">Discord Taken Instellingen</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Notificaties bij nieuwe / gewijzigde taken</Label>
              <Switch checked={discordSettings.enabled} onCheckedChange={(v) => setDiscordSettings({ ...discordSettings, enabled: v })} />
            </div>
            <div>
              <Label>Bot Token</Label>
              <div className="relative mt-1">
                <Input type={showToken ? "text" : "password"} value={discordSettings.bot_token || ""} onChange={(e) => setDiscordSettings({ ...discordSettings, bot_token: e.target.value })} className="pr-10 bg-secondary border-border" placeholder="Bot token" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowToken(!showToken)}>
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Kanaal ID</Label>
                <Input value={discordSettings.channel_id || ""} onChange={(e) => setDiscordSettings({ ...discordSettings, channel_id: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Kanaal ID" />
              </div>
              <div>
                <Label>Ping Rol ID (optioneel)</Label>
                <Input value={discordSettings.ping_role_id || ""} onChange={(e) => setDiscordSettings({ ...discordSettings, ping_role_id: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Rol ID" />
              </div>
            </div>
            <div>
              <Label>Embed Kleur</Label>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-10 h-10 rounded border border-border" style={{ backgroundColor: discordSettings.embed_color }} />
                <Input value={discordSettings.embed_color} onChange={(e) => setDiscordSettings({ ...discordSettings, embed_color: e.target.value })} className="bg-secondary border-border" />
              </div>
            </div>
            <Button onClick={saveDiscord} className="gap-1"><Save className="w-4 h-4" /> Opslaan</Button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "Alles", count: tasks.length },
          { key: "todo", label: "Te Doen", count: counts.todo },
          { key: "bezig", label: "Bezig", count: counts.bezig },
          { key: "voltooid", label: "Voltooid", count: counts.voltooid },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {f.label} <span className="ml-1 opacity-70">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && canManage && (
        <div className="card-glow rounded-xl bg-card p-5 space-y-3 border-l-4 border-l-primary">
          <Label>Titel</Label>
          <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="bg-secondary border-border" placeholder="Taak titel" />
          <Label>Beschrijving (optioneel)</Label>
          <Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="bg-secondary border-border" placeholder="Extra details..." />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Toewijzen aan Gebruiker</Label>
              <Select value={newTask.assigned_user_id} onValueChange={(v) => setNewTask({ ...newTask, assigned_user_id: v })}>
                <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue placeholder="Geen" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Toewijzen aan Rol</Label>
              <Select value={newTask.assigned_role_id} onValueChange={(v) => setNewTask({ ...newTask, assigned_role_id: v })}>
                <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue placeholder="Geen" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={addTask}>Taak Aanmaken</Button>
        </div>
      )}

      {/* Tasks list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ListTodo className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground">Geen taken gevonden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const sc = statusConfig[task.status] || statusConfig.todo;
            return (
              <div key={task.id} className="card-glow rounded-xl bg-card p-4 hover:bg-card/80 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {task.status === "voltooid" ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : task.status === "bezig" ? (
                        <Loader2 className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold ${task.status === "voltooid" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                      {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" style={{ borderColor: sc.color, color: sc.color, backgroundColor: sc.bg }}>
                          {sc.label}
                        </Badge>
                        {task.assigned_user?.username && (
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">👤 {task.assigned_user.username}</span>
                        )}
                        {task.assigned_role?.name && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: (task.assigned_role.color || '#3B82F6') + '22', color: task.assigned_role.color }}>
                            👥 {task.assigned_role.name}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {task.creator?.username && `Door: ${task.creator.username} • `}
                        {new Date(task.created_at).toLocaleString("nl-NL")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {task.status !== "voltooid" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:text-primary" onClick={() => updateStatus(task.id, task.status === "todo" ? "bezig" : "voltooid")}>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                    {canManage && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
