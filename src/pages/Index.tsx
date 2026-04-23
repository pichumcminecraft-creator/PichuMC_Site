import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicPositions } from "@/lib/api";
import { PositionCard } from "@/components/PositionCard";
import { ApplicationModal } from "@/components/ApplicationModal";

const Index = () => {
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const { data: positions = [], isLoading } = useQuery({
    queryKey: ["positions"],
    queryFn: getPublicPositions,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">Staff Sollicitaties</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Word onderdeel van het PichuMC team! Kies een positie hieronder om te solliciteren.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground">Laden...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {positions.map((pos: any) => (
              <PositionCard key={pos.id} position={pos} onApply={setSelectedPosition} />
            ))}
          </div>
        )}
      </div>

      <ApplicationModal position={selectedPosition} open={!!selectedPosition} onClose={() => setSelectedPosition(null)} />
    </div>
  );
};

export default Index;
