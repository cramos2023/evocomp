
import React from "react";
import { EvaluationResult } from "@/modules/job-evaluation/utils/calculatorUtils";
import GlassCard from "../ui/GlassCard";

interface ResultsDisplayProps {
  result: EvaluationResult | null;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result }) => {
  if (!result) {
    return null;
  }

  const dimensionPoints = [
    { label: "Impact & Contribution", value: result.pointsImpactContribution },
    { label: "Size", value: result.pointsSize },
    { label: "Communication & Frame", value: result.pointsCommunicationFrame },
    { label: "Innovation & Complexity", value: result.pointsInnovationComplexity },
    { label: "Knowledge & Teams", value: result.pointsKnowledgeTeams },
    { label: "Breadth", value: result.pointsBreadth },
    { label: "Risk & Environment", value: result.pointsRiskEnvironment },
  ];

  return (
    <GlassCard className="animate-scale-in">
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Calculation Results</h3>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown of dimension points and final classification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2">
            <h4 className="text-sm font-medium mb-3">Dimension Points</h4>
            
            <div className="space-y-2">
              {dimensionPoints.map((point, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{point.label}</span>
                  <div className="relative w-full max-w-[200px] h-2 bg-secondary rounded-full overflow-hidden ml-4">
                    <div 
                      className="absolute top-0 left-0 h-full bg-primary/80 rounded-full"
                      style={{ width: `${Math.min(100, (point.value / 100) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium ml-3 min-w-[40px] text-right">
                    {point.value.toFixed(1)}
                  </span>
                </div>
              ))}

              <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
                <span className="text-sm font-medium">Total Points</span>
                <span className="text-sm font-bold">
                  {result.totalPoints.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="col-span-1">
            <h4 className="text-sm font-medium mb-3">Classification</h4>
            
            <div className="space-y-4 p-4 bg-secondary/50 rounded-lg border border-border/50">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Position Class</div>
                <div className="text-2xl font-bold">{result.positionClass}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">RCS Grade</div>
                <div className="flex items-center justify-center h-16 text-3xl font-bold bg-primary/10 rounded-md text-primary">
                  {result.rcsGrade}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

export default ResultsDisplay;
