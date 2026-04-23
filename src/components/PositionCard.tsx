import { Shield, Code, Video, Calendar, Hammer, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, React.ElementType> = {
  shield: Shield,
  code: Code,
  video: Video,
  calendar: Calendar,
  hammer: Hammer,
  megaphone: Megaphone,
};

interface Position {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_open: boolean;
  requirements: string[];
}

export function PositionCard({ position, onApply }: { position: Position; onApply: (p: Position) => void }) {
  const Icon = iconMap[position.icon] || Shield;
  const isClosed = !position.is_open;

  return (
    <div className={`card-glow rounded-xl bg-card p-6 flex flex-col h-full transition-all ${isClosed ? "opacity-60" : "hover:scale-[1.02]"}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: position.color + "22" }}>
          <Icon className="w-5 h-5" style={{ color: position.color }} />
        </div>
        <h3 className="text-lg font-bold text-foreground">{position.name}</h3>
        <Badge
          className="text-xs font-semibold"
          style={{
            backgroundColor: isClosed ? "hsl(var(--destructive))" : "#00E676",
            color: isClosed ? "hsl(var(--destructive-foreground))" : "#000",
          }}
        >
          {isClosed ? "Gesloten" : "Open"}
        </Badge>
      </div>

      <p className="text-muted-foreground text-sm mb-4 flex-grow">{position.description}</p>

      <div className="mb-4">
        <p className="font-semibold text-foreground mb-2">Vereisten:</p>
        <ul className="space-y-1">
          {position.requirements.map((req, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: position.color }} />
              {req}
            </li>
          ))}
        </ul>
      </div>

      <Button
        className="w-full font-semibold mt-auto"
        style={{
          background: isClosed ? "hsl(var(--muted))" : `linear-gradient(135deg, ${position.color}, ${position.color}dd)`,
          color: isClosed ? "hsl(var(--muted-foreground))" : "#000",
        }}
        onClick={() => !isClosed && onApply(position)}
        disabled={isClosed}
      >
        {isClosed ? "Gesloten voor sollicitaties" : `Solliciteer voor ${position.name}`}
      </Button>
    </div>
  );
}
