
import React from "react";
import { Input } from "@/modules/job-evaluation/components/ui/input";
import { Button } from "@/modules/job-evaluation/components/ui/button";
import { Calculator, Trash2 } from "lucide-react";
import { EvaluationResult } from "@/modules/job-evaluation/utils/calculatorUtils";

interface PositionHeaderProps {
  index: number;
  title: string;
  result: EvaluationResult | null;
  onUpdateTitle: (index: number, title: string) => void;
  onCalculate: (index: number) => void;
  onRemove: (index: number) => void;
}

const PositionHeader: React.FC<PositionHeaderProps> = ({
  index,
  title,
  result,
  onUpdateTitle,
  onCalculate,
  onRemove,
}) => {
  return (
    <div className="p-3 px-4 border-b border-border/50 bg-card h-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Input
            value={title}
            onChange={(e) => onUpdateTitle(index, e.target.value)}
            placeholder="Job Title"
            className="border-0 bg-gray-100 h-7 p-0 px-2 text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0 rounded"
          />
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onCalculate(index)}
            title="Calculate Position"
          >
            <Calculator className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onRemove(index)}
            title="Remove Position"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {result && (
        <div className="mt-auto flex items-center justify-between text-xs">
          <span className="text-muted-foreground">RCS Grade:</span>
          <span className="font-semibold text-primary">{result.rcsGrade}</span>
        </div>
      )}
    </div>
  );
};

export default PositionHeader;
