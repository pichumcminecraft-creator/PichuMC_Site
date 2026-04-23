import { useEffect, useState } from "react";
import { adminFetch, getAdminUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Megaphone, Trash2, Pin, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", is_pinned: false });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "", is_pinned: false });
  const user = getAdminUser();
  const isOwner = user?.role === "eigenaar";
  const canManage = isOwner || user?.permissions?.announcements_manage === true;

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setAnnouncements(await adminFetch("announcements") || []); } catch {}
  };

  const add = async () => {
    if (!form.title) return toast.error("Vul een titel in");
    try {
      const data = await adminFetch("add-announcement", form);
      setAnnouncements((prev) => [data, ...prev]);
      setForm({ title: "", content: "", is_pinned: false });
      setShowAdd(false);
      toast.success("Mededeling geplaatst");
    } catch (err: any) { toast.error(err.message); }
  };

  const update = async () => {
    if (!editId) return;
    try {
      await adminFetch("update-announcement", { id: editId, ...editForm });
      setAnnouncements((prev) => prev.map(a => a.id === editId ? { ...a, ...editForm } : a));
      setEditId(null);
      toast.success("Mededeling bijgewerkt");
    } catch (err: any) { toast.error(err.message); }
  };

  const remove = async (id: string) => {
    try {
      await adminFetch("delete-announcement", { id });
      setAnnouncements((prev) => prev.filter(a => a.id !== id));
      toast.success("Mededeling verwijderd");
    } catch { toast.error("Fout"); }
  };

  const startEdit = (a: any) => {
    setEditId(a.id);
    setEditForm({ title: a.title, content: a.content, is_pinned: a.is_pinned });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mededelingen</h1>
          <p className="text-sm text-muted-foreground">Plaats berichten die iedereen kan zien op het dashboard.</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowAdd(!showAdd)} className="gap-1">
            <Plus className="w-4 h-4" /> Nieuwe Mededeling
          </Button>
        )}
      </div>

      {showAdd && canManage && (
        <div className="card-glow rounded-xl bg-card p-5 space-y-3 border-l-4 border-l-primary">
          <Label>Titel</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-secondary border-border" placeholder="Titel van de mededeling" />
          <Label>Inhoud</Label>
          <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="bg-secondary border-border" placeholder="Schrijf je bericht..." rows={4} />
          <div className="flex items-center gap-2">
            <Switch checked={form.is_pinned} onCheckedChange={(v) => setForm({ ...form, is_pinned: v })} />
            <Label>Vastpinnen op Dashboard</Label>
          </div>
          <Button onClick={add}>Plaatsen</Button>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground">Geen mededelingen</p>
          <p className="text-sm text-muted-foreground">Er zijn nog geen mededelingen geplaatst.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="card-glow rounded-xl bg-card p-5 hover:bg-card/80 transition-colors">
              {editId === a.id ? (
                <div className="space-y-3">
                  <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="bg-secondary border-border" />
                  <Textarea value={editForm.content} onChange={(e) => setEditForm({ ...editForm, content: e.target.value })} className="bg-secondary border-border" rows={3} />
                  <div className="flex items-center gap-2">
                    <Switch checked={editForm.is_pinned} onCheckedChange={(v) => setEditForm({ ...editForm, is_pinned: v })} />
                    <Label className="text-sm">Vastpinnen</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={update} className="gap-1"><Save className="w-3.5 h-3.5" /> Opslaan</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditId(null)} className="gap-1"><X className="w-3.5 h-3.5" /> Annuleer</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {a.is_pinned && <Pin className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
                      <div>
                        <p className="font-bold text-foreground">{a.title}</p>
                        {a.content && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.content}</p>}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => startEdit(a)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(a.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {a.creator?.username && `Door: ${a.creator.username} • `}
                    {new Date(a.created_at).toLocaleString("nl-NL")}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
