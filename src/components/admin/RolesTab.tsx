import { useEffect, useState } from "react";
import { adminFetch, getAdminUser } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Crown, ChevronDown, ChevronRight, Info, ArrowUp, ArrowDown, Server, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const ALL_PERMISSIONS = [
  { key: "tasks_manage", label: "Taken Beheren", desc: "Kan taken aanmaken, toewijzen en verwijderen." },
  { key: "absences_manage", label: "Afmeldingen Beheren", desc: "Kan afmeldingen goedkeuren, afkeuren en Discord instellingen beheren." },
  { key: "announcements_manage", label: "Mededelingen Beheren", desc: "Kan mededelingen plaatsen, bewerken en verwijderen die zichtbaar zijn voor iedereen." },
  { key: "positions_view", label: "Posities Bekijken", desc: "Kan de lijst met posities bekijken in het admin panel." },
  { key: "positions_manage", label: "Posities Beheren", desc: "Kan posities openen, sluiten en aanpassen." },
  { key: "applications_view", label: "Sollicitaties Bekijken", desc: "Kan ingezonden sollicitaties bekijken." },
  { key: "applications_manage", label: "Sollicitaties Beheren", desc: "Kan sollicitaties accepteren, afwijzen en verwijderen." },
  { key: "discord_view", label: "Discord Bekijken", desc: "Kan Discord instellingen en kanalen bekijken." },
  { key: "discord_manage", label: "Discord Beheren", desc: "Kan Discord bot token, guild ID en kanalen aanpassen." },
  { key: "content_view", label: "Inhoud Bekijken", desc: "Kan website-inhoud en teksten bekijken." },
  { key: "content_manage", label: "Inhoud Beheren", desc: "Kan website-inhoud en teksten aanpassen." },
  { key: "users_view", label: "Gebruikers Bekijken", desc: "Kan de lijst met admin gebruikers bekijken." },
  { key: "users_manage", label: "Gebruikers Beheren", desc: "Kan gebruikers toevoegen, verwijderen en wachtwoorden resetten." },
  { key: "roles_view", label: "Rollen Bekijken", desc: "Kan rollen en hun permissies bekijken." },
  { key: "roles_manage", label: "Rollen Beheren", desc: "Kan rollen aanmaken, aanpassen en verwijderen." },
  { key: "stats_view", label: "Statistieken Bekijken", desc: "Kan statistieken en overzichten bekijken op het dashboard." },
  { key: "activity_view", label: "Activiteit Bekijken", desc: "Kan de activiteiten log bekijken met alle admin acties." },
  { key: "see_passwords", label: "Wachtwoorden Inzien", desc: "Kan wachtwoord-hashes van andere gebruikers bekijken." },
  { key: "owner_panel", label: "Owner Panel Toegang", desc: "Geeft toegang tot het Owner Panel met gevoelige eigenaar-acties (alleen voor vertrouwde admins)." },
];

interface Role {
  id: string;
  name: string;
  color: string;
  permissions: Record<string, boolean>;
  is_system: boolean;
  user_count: number;
  sort_order: number;
}

const SERVER_PERMS: Array<{ key: "view" | "power" | "console" | "whitelist" | "players"; label: string }> = [
  { key: "view", label: "Bekijken" },
  { key: "power", label: "Power (start/stop)" },
  { key: "console", label: "Console" },
  { key: "whitelist", label: "Whitelist" },
  { key: "players", label: "Spelers" },
];

export function RolesTab() {
  const me = getAdminUser();
  const canEditPerms = me?.username === "LikeAPichu";
  const [roles, setRoles] = useState<Role[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [newRole, setNewRole] = useState({ name: "", color: "#3B82F6", permissions: {} as Record<string, boolean> });
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { load(); loadPositions(); loadServers(); }, []);

  const load = async () => {
    try {
      const data = await adminFetch("roles");
      setRoles(data || []);
    } catch {}
  };

  const loadPositions = async () => {
    try {
      const data = await adminFetch("positions");
      setPositions(data || []);
    } catch {}
  };

  const loadServers = async () => {
    try {
      const data = await adminFetch("ptero-servers");
      setServers(data?.servers || []);
    } catch {}
  };

  const addRole = async () => {
    if (!newRole.name) return toast.error("Vul een rolnaam in");
    try {
      await adminFetch("add-role", newRole);
      setNewRole({ name: "", color: "#3B82F6", permissions: {} });
      load();
      toast.success("Rol aangemaakt");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateRole = async (role: Role, updates: Partial<Role>) => {
    try {
      await adminFetch("update-role", { id: role.id, ...updates });
      setRoles((prev) => prev.map((r) => (r.id === role.id ? { ...r, ...updates } : r)));
      toast.success("Rol bijgewerkt");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteRole = async (id: string) => {
    try {
      await adminFetch("delete-role", { id });
      setRoles((prev) => prev.filter((r) => r.id !== id));
      toast.success("Rol verwijderd");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const moveRole = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= roles.length) return;
    const newRoles = [...roles];
    [newRoles[index], newRoles[newIndex]] = [newRoles[newIndex], newRoles[index]];
    setRoles(newRoles);
    const order = newRoles.map((r, i) => ({ id: r.id, sort_order: i }));
    try {
      await adminFetch("reorder-roles", { order });
    } catch {
      toast.error("Fout bij herordenen");
      load();
    }
  };

  const togglePermission = (perms: Record<string, boolean>, key: string) => {
    return { ...perms, [key]: !perms[key] };
  };

  const PermissionCheckbox = ({ permKey, label, desc, checked, onChange }: { permKey: string; label: string; desc: string; checked: boolean; onChange: () => void }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <Checkbox checked={checked} onCheckedChange={onChange} />
          {label}
          <Info className="w-3 h-3 opacity-40" />
        </label>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs">{desc}</p>
      </TooltipContent>
    </Tooltip>
  );

  const ServerPermsBlock = ({
    perms,
    onChange,
  }: {
    perms: Record<string, boolean>;
    onChange: (next: Record<string, boolean>) => void;
  }) => {
    const [openId, setOpenId] = useState<string | null>(null);
    if (servers.length === 0) {
      return (
        <p className="text-xs text-muted-foreground italic">
          Geen servers geladen (Pterodactyl koppeling nog niet beschikbaar of geen toegang).
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {servers.map((srv) => {
          const open = openId === srv.identifier;
          const activeCount = SERVER_PERMS.filter((p) => perms[`srv_${srv.identifier}_${p.key}`]).length;
          return (
            <div key={srv.identifier} className="rounded-lg bg-secondary/50 border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : srv.identifier)}
                className="w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors"
              >
                <Server className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground flex-1 text-left">{srv.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {activeCount}/{SERVER_PERMS.length} perms
                </span>
                {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
              {open && (
                <div className="px-3 pb-3 grid grid-cols-2 md:grid-cols-3 gap-2 border-t border-border pt-3">
                  {SERVER_PERMS.map((p) => {
                    const k = `srv_${srv.identifier}_${p.key}`;
                    return (
                      <label key={k} className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        <Checkbox checked={!!perms[k]} onCheckedChange={() => onChange({ ...perms, [k]: !perms[k] })} />
                        {p.label}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={"space-y-6 " + (canEditPerms ? "" : "pointer-events-none opacity-70")}>
      {!canEditPerms && (
        <div className="card-glow rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex items-center gap-3 pointer-events-auto opacity-100">
          <Lock className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Alleen LikeAPichu kan rol-permissies bewerken</p>
            <p className="text-xs text-muted-foreground">Je kunt rollen wel bekijken, maar niet aanpassen.</p>
          </div>
        </div>
      )}
      <div className="card-glow rounded-xl bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Nieuwe Rol Aanmaken</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-4 items-end mb-4">
          <div>
            <Label>Rol Naam</Label>
            <Input value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Bijv. Event Manager" />
          </div>
          <div>
            <Label>Kleur</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={newRole.color} onChange={(e) => setNewRole({ ...newRole, color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
              <Input value={newRole.color} onChange={(e) => setNewRole({ ...newRole, color: e.target.value })} className="bg-secondary border-border w-28" />
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={addRole} className="bg-primary text-primary-foreground gap-1 w-full md:w-auto">
              <Plus className="w-4 h-4" /> Rol Aanmaken
            </Button>
          </div>
        </div>

        <Label className="text-sm font-semibold">Algemene Permissies</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 mb-4">
          {ALL_PERMISSIONS.map((p) => (
            <PermissionCheckbox key={p.key} permKey={p.key} label={p.label} desc={p.desc} checked={!!newRole.permissions[p.key]} onChange={() => setNewRole({ ...newRole, permissions: togglePermission(newRole.permissions, p.key) })} />
          ))}
        </div>

        {positions.length > 0 && (
          <>
            <Label className="text-sm font-semibold">Per-Positie Permissies</Label>
            <p className="text-xs text-muted-foreground mb-2">Geef per positie toegang tot bekijken en beheren van sollicitaties.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {positions.map((pos) => (
                <div key={pos.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pos.color }} />
                  <span className="text-sm text-foreground flex-1">{pos.name}</span>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox checked={!!newRole.permissions[`pos_${pos.id}_view`]} onCheckedChange={() => setNewRole({ ...newRole, permissions: togglePermission(newRole.permissions, `pos_${pos.id}_view`) })} />
                    Bekijken
                  </label>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox checked={!!newRole.permissions[`pos_${pos.id}_manage`]} onCheckedChange={() => setNewRole({ ...newRole, permissions: togglePermission(newRole.permissions, `pos_${pos.id}_manage`) })} />
                    Beheren
                  </label>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-4">
          <Label className="text-sm font-semibold">Per-Server Permissies</Label>
          <p className="text-xs text-muted-foreground mb-2">Klik op een server om permissies in/uit te klappen.</p>
          <ServerPermsBlock perms={newRole.permissions} onChange={(next) => setNewRole({ ...newRole, permissions: next })} />
        </div>
      </div>

      <h3 className="font-bold text-foreground text-lg">Bestaande Rollen</h3>

      <div className="space-y-3">
        {roles.map((role, index) => (
          <div key={role.id} className="card-glow rounded-xl bg-card overflow-hidden">
            <div className="flex items-center">
              <div className="flex flex-col px-1">
                <button onClick={() => moveRole(index, -1)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-1"><ArrowUp className="w-3 h-3" /></button>
                <button onClick={() => moveRole(index, 1)} disabled={index === roles.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-1"><ArrowDown className="w-3 h-3" /></button>
              </div>
              <button onClick={() => setExpanded(expanded === role.id ? null : role.id)} className="flex-1 p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                  <span className="font-semibold text-foreground">{role.name}</span>
                  {role.is_system && <Crown className="w-4 h-4 text-primary" />}
                  <span className="text-xs text-muted-foreground">({role.user_count} gebruikers)</span>
                </div>
                {expanded === role.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>

            {expanded === role.id && (
              <div className="p-4 pt-0 border-t border-border">
                {role.is_system ? (
                  <p className="text-sm text-muted-foreground py-2">De {role.name} rol heeft altijd alle permissies en kan niet worden aangepast.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 mt-3">
                      <div>
                        <Label>Naam</Label>
                        <Input defaultValue={role.name} onBlur={(e) => { if (e.target.value !== role.name) updateRole(role, { name: e.target.value }); }} className="bg-secondary border-border mt-1" />
                      </div>
                      <div>
                        <Label>Kleur</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input type="color" defaultValue={role.color} onChange={(e) => updateRole(role, { color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                          <Input defaultValue={role.color} className="bg-secondary border-border w-28" readOnly />
                        </div>
                      </div>
                    </div>

                    <Label className="text-sm font-semibold">Algemene Permissies</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 mb-4">
                      {ALL_PERMISSIONS.map((p) => (
                        <PermissionCheckbox key={p.key} permKey={p.key} label={p.label} desc={p.desc} checked={!!role.permissions[p.key]} onChange={() => updateRole(role, { permissions: togglePermission(role.permissions, p.key) })} />
                      ))}
                    </div>

                    {positions.length > 0 && (
                      <>
                        <Label className="text-sm font-semibold">Per-Positie Permissies</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 mb-4">
                          {positions.map((pos) => (
                            <div key={pos.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pos.color }} />
                              <span className="text-sm text-foreground flex-1">{pos.name}</span>
                              <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                                <Checkbox checked={!!role.permissions[`pos_${pos.id}_view`]} onCheckedChange={() => updateRole(role, { permissions: togglePermission(role.permissions, `pos_${pos.id}_view`) })} />
                                Bekijken
                              </label>
                              <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                                <Checkbox checked={!!role.permissions[`pos_${pos.id}_manage`]} onCheckedChange={() => updateRole(role, { permissions: togglePermission(role.permissions, `pos_${pos.id}_manage`) })} />
                                Beheren
                              </label>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    <Label className="text-sm font-semibold">Per-Server Permissies</Label>
                    <div className="mt-2 mb-4">
                      <ServerPermsBlock
                        perms={role.permissions}
                        onChange={(next) => updateRole(role, { permissions: next })}
                      />
                    </div>

                    <Button variant="destructive" className="w-full gap-1 mt-2" onClick={() => deleteRole(role.id)}>
                      <Trash2 className="w-4 h-4" /> Rol Verwijderen
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
