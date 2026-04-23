import { useEffect, useState } from "react";
import { adminFetch, getAdminUser, setAuth, getToken } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Crown, Key, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Role {
  id: string;
  name: string;
  color: string;
}

export function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [newUser, setNewUser] = useState({ username: "", password: "", role_id: "" });
  const [passwordChange, setPasswordChange] = useState({ current: "", new_: "", confirm: "" });
  const [changingPasswordFor, setChangingPasswordFor] = useState<string | null>(null);
  const [newPasswordForUser, setNewPasswordForUser] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const currentUser = getAdminUser();
  const isOwner = currentUser?.role === "eigenaar";
  const canSeePasswords = isOwner || currentUser?.permissions?.see_passwords === true;
  const canManageUsers = isOwner || currentUser?.permissions?.users_manage === true;

  useEffect(() => { load(); loadRoles(); }, []);

  const load = async () => {
    try {
      const data = await adminFetch("users");
      setUsers(data || []);
    } catch {}
  };

  const loadRoles = async () => {
    try {
      const data = await adminFetch("roles");
      setRoles((data || []).filter((r: any) => !r.is_system));
    } catch {}
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.password) return toast.error("Vul alle velden in");
    if (!newUser.role_id) return toast.error("Selecteer een rol");
    try {
      await adminFetch("add-user", newUser);
      setNewUser({ username: "", password: "", role_id: "" });
      load();
      toast.success("Gebruiker toegevoegd");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await adminFetch("delete-user", { id });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("Gebruiker verwijderd");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateRole = async (id: string, role_id: string) => {
    try {
      await adminFetch("update-user-role", { id, role_id });
      load();
      toast.success("Rol bijgewerkt");
    } catch {
      toast.error("Fout bij bijwerken");
    }
  };

  const changeOwnPassword = async () => {
    if (!passwordChange.current || !passwordChange.new_) return toast.error("Vul alle velden in");
    if (passwordChange.new_ !== passwordChange.confirm) return toast.error("Wachtwoorden komen niet overeen");
    try {
      const result = await adminFetch("change-password", { current_password: passwordChange.current, new_password: passwordChange.new_ });
      setPasswordChange({ current: "", new_: "", confirm: "" });
      // Update token so session stays valid
      if (result.token) {
        setAuth(result.token, currentUser);
      }
      toast.success("Wachtwoord gewijzigd!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const changeUserPassword = async (userId: string) => {
    if (!newPasswordForUser) return toast.error("Vul een wachtwoord in");
    try {
      await adminFetch("change-user-password", { user_id: userId, new_password: newPasswordForUser });
      setChangingPasswordFor(null);
      setNewPasswordForUser("");
      load();
      toast.success("Wachtwoord gewijzigd");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Change (own) */}
      <div className="card-glow rounded-xl bg-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Wachtwoord Wijzigen</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Wijzig je eigen wachtwoord.</p>
        <div className="space-y-3 max-w-lg">
          <div>
            <Label className="font-semibold">Huidig Wachtwoord</Label>
            <Input type="password" value={passwordChange.current} onChange={(e) => setPasswordChange({ ...passwordChange, current: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Je huidige wachtwoord" />
          </div>
          <div>
            <Label className="font-semibold">Nieuw Wachtwoord</Label>
            <Input type="password" value={passwordChange.new_} onChange={(e) => setPasswordChange({ ...passwordChange, new_: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Je nieuwe wachtwoord" />
          </div>
          <div>
            <Label className="font-semibold">Bevestig Nieuw Wachtwoord</Label>
            <Input type="password" value={passwordChange.confirm} onChange={(e) => setPasswordChange({ ...passwordChange, confirm: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Herhaal je nieuwe wachtwoord" />
          </div>
          <Button onClick={changeOwnPassword} className="bg-green-600 hover:bg-green-700 text-white">Wachtwoord Wijzigen</Button>
        </div>
      </div>

      {/* Add User */}
      {canManageUsers && (
        <div className="card-glow rounded-xl bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Nieuwe Gebruiker Toevoegen</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Gebruikersnaam</Label>
              <Input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Gebruikersnaam" />
            </div>
            <div>
              <Label>Wachtwoord</Label>
              <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Wachtwoord" />
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={newUser.role_id} onValueChange={(v) => setNewUser({ ...newUser, role_id: v })}>
                <SelectTrigger className="bg-secondary border-border mt-1">
                  <SelectValue placeholder="Selecteer rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addUser} className="bg-primary text-primary-foreground gap-1">
              <Plus className="w-4 h-4" /> Toevoegen
            </Button>
          </div>
        </div>
      )}

      <h3 className="font-bold text-foreground text-lg">Bestaande Gebruikers</h3>

      <div className="space-y-3">
        {users.map((user) => {
          const roleColor = user.roles?.color || "#3B82F6";
          const roleName = user.roles?.name || user.role;
          return (
            <div key={user.id} className="card-glow rounded-xl bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-foreground" style={{ backgroundColor: roleColor + "33", color: roleColor }}>
                    {user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{user.username}</p>
                      {roleName === "eigenaar" && <Crown className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-xs" style={{ color: roleColor }}>{roleName.charAt(0).toUpperCase() + roleName.slice(1)}</p>
                    {user.last_online && (
                      <p className="text-xs text-muted-foreground">Laatst online: {new Date(user.last_online).toLocaleDateString("nl-NL")}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canSeePasswords && user.password_hash && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowPasswords(prev => ({ ...prev, [user.id]: !prev[user.id] }))}>
                      {showPasswords[user.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      Hash
                    </Button>
                  )}
                  {canManageUsers && roleName !== "eigenaar" && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => { setChangingPasswordFor(changingPasswordFor === user.id ? null : user.id); setNewPasswordForUser(""); }}>
                        <Key className="w-3 h-3" /> Wachtwoord
                      </Button>
                      <Select value={user.role_id || ""} onValueChange={(v) => updateRole(user.id, v)}>
                        <SelectTrigger className="w-32 bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="destructive" onClick={() => deleteUser(user.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {showPasswords[user.id] && user.password_hash && (
                <div className="mt-3 p-2 bg-secondary rounded text-xs font-mono text-muted-foreground break-all">
                  {user.password_hash}
                </div>
              )}

              {changingPasswordFor === user.id && (
                <div className="mt-3 flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Nieuw wachtwoord voor {user.username}</Label>
                    <Input type="password" value={newPasswordForUser} onChange={(e) => setNewPasswordForUser(e.target.value)} className="bg-secondary border-border mt-1" placeholder="Nieuw wachtwoord" />
                  </div>
                  <Button onClick={() => changeUserPassword(user.id)} className="bg-green-600 hover:bg-green-700 text-white">Opslaan</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
