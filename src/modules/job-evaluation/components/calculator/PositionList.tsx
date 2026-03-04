
import React from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/modules/job-evaluation/components/ui/button";
import PositionRow from "./PositionRow";
import { Position } from "@/modules/job-evaluation/types/position";

interface PositionListProps {
  positions: Position[];
  onUpdate: (index: number, updatedPosition: Position) => void;
  onRemove: (index: number) => void;
  onCalculate: (index: number) => void;
  onAdd: () => void;
}

const PositionList: React.FC<PositionListProps> = ({
  positions,
  onUpdate,
  onRemove,
  onCalculate,
  onAdd,
}) => {
  return (
    <div className="space-y-6">
      {positions.map((position, index) => (
        <PositionRow
          key={index}
          index={index}
          position={position}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onCalculate={onCalculate}
        />
      ))}

      <Button
        variant="outline"
        onClick={onAdd}
        className="w-full py-6 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
      >
        <PlusCircle className="h-5 w-5 mr-2" />
        Add Another Position
      </Button>
    </div>
  );
};

export default PositionList;
