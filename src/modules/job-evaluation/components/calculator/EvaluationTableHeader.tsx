
import React from "react";
import { Position } from "@/modules/job-evaluation/types/position";
import { Input } from "@/modules/job-evaluation/components/ui/input";
import { Button } from "@/modules/job-evaluation/components/ui/button";
import { Calculator, X } from "lucide-react";

interface EvaluationTableHeaderProps {
  positions: Position[];
  onUpdateTitle: (index: number, field: keyof Position, value: string) => void;
  onCalculatePosition: (index: number) => void;
  onRemovePosition: (index: number) => void;
  visiblePositions?: number[]; // Indices of positions that should be visible
}

import { useTranslation } from "react-i18next";

const EvaluationTableHeader: React.FC<EvaluationTableHeaderProps> = ({
  positions,
  onUpdateTitle,
  onCalculatePosition,
  onRemovePosition,
  visiblePositions = positions.map((_, i) => i) // Default to showing all positions
}) => {
  const { t } = useTranslation("jobEvaluation");
  // Filter visiblePositions to only include indices that exist in the positions array
  const validVisiblePositions = visiblePositions.filter(index => index < positions.length);
  
  return (
    <thead className="bg-background sticky top-0 z-20 shadow-sm">
      <tr className="border-b">
        {/* Fixed first column - labels */}
        <th className="sticky left-0 z-30 bg-background border-r border-[rgb(var(--border))] w-[200px] min-w-[200px] p-0">
          <div className="flex justify-between items-center py-3 px-4">
            <span className="font-medium text-sm">{t("evaluation.criteria")}</span>
          </div>
        </th>
        
        {/* Dynamic columns based on positions */}
        {validVisiblePositions.map((posIndex) => (
          <th key={posIndex} className="min-w-[250px] w-[250px] p-0">
            <div className="flex flex-col gap-2 p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t("calculator.position")} {posIndex + 1}</span>
                {positions.length > 1 && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => onRemovePosition(posIndex)}
                    disabled={positions.length <= 1}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <Input
                placeholder={t("calculator.job_title_placeholder")}
                value={positions[posIndex]?.jobTitle || ""}
                onChange={(e) => onUpdateTitle(posIndex, "jobTitle", e.target.value)}
                className="h-9 text-sm"
              />
              
              <Button
                onClick={() => onCalculatePosition(posIndex)}
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                <Calculator className="h-4 w-4 mr-2" />
                {t("calculator.calculate")}
              </Button>
              
              {positions[posIndex]?.result && (
                <div className="flex justify-between text-xs mt-1">
                  <div>
                    <span className="font-medium">RCS:</span>{" "}
                    <span className="font-bold text-primary">{positions[posIndex].result.rcsGrade}</span>
                  </div>
                  <div>
                    <span className="font-medium">{t("results.class")}:</span>{" "}
                    <span>{positions[posIndex].result.positionClass}</span>
                  </div>
                  <div>
                    <span className="font-medium">{t("results.points")}:</span>{" "}
                    <span>{positions[posIndex].result.totalPoints.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
};

export default EvaluationTableHeader;
