import { useEffect, useState } from "react";
import { adminFetch, getAdminUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Megaphone, Trash2, Pin, Edit2, Save, X, Globe, Users2 } from "lucide-react";
import { toast } from "sonner";
import { parseAnnouncement, encodeAnnouncementContent, type Audience } from "@/lib/announcements";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  audience: Audience;
  cleanContent: string;
  created_at: string;
  creator?: { username?: string };
};

export function AnnouncementsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<Audience>("staff");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<{ title: string; content: string; is_pinned: boolean; audience: Audience }>({
    title: "", content: "", is_pinned: false, audience: "staff",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; content: string; is_pinned: boolean; audience: Audience }>({
    title: "", content: "", is_pinned: false, audience: "staff",
  });
  const user = getAdminUser();
  const isOwner = user?.role === "eigenaar";
  const canManage = isOwner || user?.permissions?.announcements_manage === true;

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const raw = await adminFetch("announcements") || [];
      setItems(raw.map((a: any) => parseAnnouncement(a)));
    } catch {}
  };

  const add = async () => {
    if (!form.title) return toast.error("Vul een titel in");
    try {
      const data = await adminFetch("add-announcement", {
        title: form.title,
        content: encodeAnnouncementContent(form.content, form.audience),
        is_pinned: form.is_pinned,
      });
      setItems((prev) => [parseAnnouncement(data), ...prev]);
      setForm({ title: "", content: "", is_pinned: false, audience: tab });
      setShowAdd(false);
      toast.success("Mededeling geplaatst");
    } catch (err: any) { toast.error(err.message); }
  };

  const update = async () => {
    if (!editId) return;
    try {
      const payload = {
        id: editId,
        title: editForm.title,
        content: encodeAnnouncementContent(editForm.content, editForm.audience),
        is_pinned: editForm.is_pinned,
      };
      await adminFetch("update-announcement", payload);
      setItems((prev) => prev.map(a => a.id === editId ? parseAnnouncement({ ...a, ...payload }) : a));
      setEditId(null);
      toast.success("Mededeling bijgewerkt");
    } catch (err: any) { toast.error(err.message); }
  };

  const remove = async (id: string) => {
    try {
      await adminFetch("delete-announcement", { id });
      setItems((prev) => prev.filter(a => a.id !== id));
      toast.success("Mededeling verwijderd");
    } catch { toast.error("Fout"); }
  };

  const startEdit = (a: Item) => {
    setEditId(a.id);
    setEditForm({ title: a.title, content: a.cleanContent, is_pinned: a.is_pinned, audience: a.audience });
  };

  const filtered = items.filter(a => a.audience === tab);
  const counts = {
    staff: items.filter(a => a.audience === "staff").length,
    public: items.filter(a => a.audience === "public").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mededelingen</h1>
          <p className="text-sm text-muted-foreground">Plaats interne berichten voor staff of openbare berichten voor iedereen.</p>
        </div>
        {canManage && (
          <Button onClick={() => { setForm({ ...form, audience: tab }); setShowAdd(!showAdd); }} className="gap-1">
            <Plus className="w-4 h-4" /> Nieuwe Mededeling
          </Button>
        )}
      </div>

      {/* Audience tabs */}
      <div className="inline-flex gap-1 p-1 rounded-xl bg-card border border-border">
        <button
          onClick={() => setTab("staff")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
            tab === "staff" ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users2 className="w-4 h-4" /> Staff intern
          <span className="text-xs opacity-70">({counts.staff})</span>
        </button>
        <button
          onClick={() => setTab("public")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
            tab === "public" ? "bg-accent/30 text-foreground border border-accent" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Globe className="w-4 h-4" /> Voor iedereen
          <span className="text-xs opacity-70">({counts.public})</span>
        </button>
      </div>

      {showAdd && canManage && (
        <div className="card-glow rounded-xl bg-card p-5 space-y-3 border-l-4 border-l-primary">
          <Label>Doelgroep</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, audience: "staff" })}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 border transition-all",
                form.audience === "staff" ? "bg-primary/15 text-primary border-primary/30" : "bg-secondary border-border text-muted-foreground"
              )}
            >
              <Users2 className="w-3.5 h-3.5" /> Staff intern
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, audience: "public" })}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 border transition-all",
                form.audience === "public" ? "bg-accent/30 text-foreground border-accent" : "bg-secondary border-border text-muted-foreground"
              )}
            >
              <Globe className="w-3.5 h-3.5" /> Voor iedereen
            </button>
          </div>

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

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground">Geen mededelingen</p>
          <p className="text-sm text-muted-foreground">
            {tab === "staff" ? "Geen interne staff mededelingen." : "Geen openbare mededelingen geplaatst."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className={cn(
              "card-glow rounded-xl bg-card p-5 hover:bg-card/80 transition-colors border-l-4",
              a.audience === "public" ? "border-l-accent" : "border-l-primary"
            )}>
              {editId === a.id ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, audience: "staff" })}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border",
                        editForm.audience === "staff" ? "bg-primary/15 text-primary border-primary/30" : "bg-secondary border-border text-muted-foreground"
                      )}
                    >
                      <Users2 className="w-3 h-3" /> Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, audience: "public" })}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border",
                        editForm.audience === "public" ? "bg-accent/30 text-foreground border-accent" : "bg-secondary border-border text-muted-foreground"
                      )}
                    >
                      <Globe className="w-3 h-3" /> Voor iedereen
                    </button>
                  </div>
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
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground">{a.title}</p>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
                            a.audience === "public" ? "bg-accent/30 text-foreground" : "bg-primary/15 text-primary"
                          )}>
                            {a.audience === "public" ? <><Globe className="w-2.5 h-2.5" /> Publiek</> : <><Users2 className="w-2.5 h-2.5" /> Staff</>}
                          </span>
                        </div>
                        {a.cleanContent && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.cleanContent}</p>}
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
