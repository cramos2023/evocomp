
import React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/job-evaluation/components/ui/tooltip";
import { dimensionInfoData } from "@/modules/job-evaluation/utils/dimensionInfo";

interface InfoTooltipProps {
  dimensionKey: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  showLabels?: boolean;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({
  dimensionKey,
  className = "",
  side = "top",
  showLabels = true
}) => {
  const dimensionInfo = dimensionInfoData[dimensionKey];

  if (!dimensionInfo) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground ${className}`}
          >
            <Info className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          className="max-w-md p-4 z-[100]"
          // Use portal to avoid z-index stacking context issues
          avoidCollisions
        >
          <h4 className="mb-2 font-medium">{dimensionInfo.title}</h4>
          <p className="text-sm">{dimensionInfo.description}</p>
          
          {showLabels && dimensionInfo.levels && dimensionInfo.levels.length > 0 && (
            <div className="mt-3 space-y-2">
              {dimensionInfo.levels.map(level => (
                <div key={level.value} className="text-xs border-l-2 border-primary pl-2">
                  <span className="font-medium">{level.value} - {level.label}:</span> {level.description}
                </div>
              ))}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default InfoTooltip;
