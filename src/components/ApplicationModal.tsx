import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { submitApplication } from "@/lib/api";
import { toast } from "sonner";

interface Question {
  key: string;
  label: string;
  type: "text" | "textarea";
  required?: boolean;
}

interface Position {
  id: string;
  name: string;
  color: string;
  questions?: Question[];
}

export function ApplicationModal({ position, open, onClose }: { position: Position | null; open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [minecraft, setMinecraft] = useState("");
  const [age, setAge] = useState("");
  const [discord, setDiscord] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const questions: Question[] = position?.questions && Array.isArray(position.questions) && position.questions.length > 0
    ? position.questions
    : [
        { key: "motivation", label: "Motivatie", type: "textarea", required: true },
        { key: "experience", label: "Ervaring", type: "textarea" },
        { key: "availability", label: "Beschikbaarheid", type: "text" },
      ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!position || !minecraft) return;
    for (const q of questions) {
      if (q.required && !answers[q.key]?.trim()) {
        toast.error(`${q.label} is verplicht`);
        return;
      }
    }
    setLoading(true);
    try {
      await submitApplication({
        position_id: position.id,
        minecraft_username: minecraft,
        age: age ? parseInt(age) : undefined,
        discord_username: discord || undefined,
        answers,
        question_labels: Object.fromEntries(questions.map((q) => [q.key, q.label])),
      });
      toast.success("Sollicitatie verstuurd! We nemen snel contact op.");
      setMinecraft(""); setAge(""); setDiscord(""); setAnswers({});
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Er ging iets mis bij het versturen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Solliciteer voor {position?.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Minecraft Gebruikersnaam *</Label>
            <Input value={minecraft} onChange={(e) => setMinecraft(e.target.value)} required className="bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Leeftijd</Label>
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Discord Gebruikersnaam</Label>
              <Input value={discord} onChange={(e) => setDiscord(e.target.value)} className="bg-secondary border-border" />
            </div>
          </div>
          {questions.map((q) => (
            <div key={q.key}>
              <Label>{q.label}{q.required && " *"}</Label>
              {q.type === "textarea" ? (
                <Textarea value={answers[q.key] || ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} className="bg-secondary border-border" rows={3} />
              ) : (
                <Input value={answers[q.key] || ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} className="bg-secondary border-border" />
              )}
            </div>
          ))}
          <Button type="submit" disabled={loading} className="w-full font-semibold" style={{ backgroundColor: position?.color, color: "#000" }}>
            {loading ? "Versturen..." : "Verstuur Sollicitatie"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
