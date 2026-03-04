
import React from "react";
import { Position } from "@/modules/job-evaluation/types/position";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/modules/job-evaluation/components/ui/select";
import { dimensionInfoData } from "@/modules/job-evaluation/utils/dimensionInfo";
import { Info } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/job-evaluation/components/ui/tooltip";

interface DimensionRowProps {
  dimensionKey: string;
  displayName: string;
  positions: Position[];
  onUpdatePosition: (index: number, field: keyof Position, value: any) => void;
  visiblePositions: number[];
}

import { useTranslation } from "react-i18next";

const DimensionRow: React.FC<DimensionRowProps> = ({
  dimensionKey,
  displayName,
  positions,
  onUpdatePosition,
  visiblePositions
}) => {
  const { t } = useTranslation("jobEvaluation");

  // Helper function to get options based on the dimension
  const getOptions = () => {
    const info = dimensionInfoData[dimensionKey];
    if (!info) return null;
    
    if (dimensionKey === 'size') {
      // For size, use whole numbers from 1 to 22 to match Org Size
      return Array.from({ length: 22 }, (_, i) => i + 1);
    }
    
    // For other dimensions, get the min and max values from the levels
    const levels = info.levels || [];
    if (levels.length === 0) return [1, 2, 3, 4, 5];
    
    const values = levels.map(l => l.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Generate options with 0.5 increments
    const options = [];
    for (let i = min; i <= max; i += 0.5) {
      options.push(i);
    }
    return options;
  };
    
  // Helper function to get level label
  const getLevelLabel = (value: number) => {
    const info = dimensionInfoData[dimensionKey];
    if (!info || !info.levels) return null;
    
    const level = info.levels.find(l => l.value === value);
    if (!level) return null;

    return t(`matrix.${dimensionKey}.${value}.label`, level.label);
  };
  
  // Helper function to get level description
  const getLevelDescription = (value: number) => {
    const info = dimensionInfoData[dimensionKey];
    if (!info || !info.levels) return null;
    
    const level = info.levels.find(l => l.value === value);
    if (!level) return null;

    return t(`matrix.${dimensionKey}.${value}.desc`, level.description);
  };
  
  // Get all the options for this dimension
  const options = getOptions();
  if (!options) return null;
  
  const translatedDisplayName = t(`calculator.dimension.${dimensionKey}`, displayName);

  return (
    <tr className="border-b border-[rgb(var(--border))] hover:bg-[rgba(var(--bg-surface-2),0.3)]">
      <td className="sticky left-0 z-10 bg-background border-r border-[rgb(var(--border))] w-[200px] min-w-[200px] p-0">
        <div className="py-2 px-4">
          <div className="flex items-center gap-1">
            <span className="font-medium">{translatedDisplayName}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground h-5 w-5">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  className="max-w-md p-4 z-[100]"
                  avoidCollisions
                >
                  <h4 className="mb-2 font-medium">{t(`matrix.${dimensionKey}.title`, dimensionInfoData[dimensionKey]?.title || displayName)}</h4>
                  <p className="text-sm">{t(`matrix.${dimensionKey}.description`, dimensionInfoData[dimensionKey]?.description)}</p>
                  <div className="mt-3 space-y-2">
                    {dimensionInfoData[dimensionKey]?.levels?.map(level => (
                      <div key={level.value} className="text-xs border-l-2 border-primary pl-2">
                        <span className="font-medium">{level.value} - {t(`matrix.${dimensionKey}.${level.value}.label`, level.label)}:</span> {t(`matrix.${dimensionKey}.${level.value}.desc`, level.description)}
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </td>
      {visiblePositions.map((posIndex) => (
        <td key={posIndex} className="min-w-[250px] p-0">
          <div className="p-2 px-4">
            <Select
              value={positions[posIndex]?.[dimensionKey as keyof Position]?.toString() || ""}
              onValueChange={(value) => onUpdatePosition(posIndex, dimensionKey as keyof Position, Number(value))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={t("filters.select_option_with_name", { defaultValue: `Select ${translatedDisplayName}`, name: translatedDisplayName })} />
              </SelectTrigger>
              <SelectContent>
                {options.map((level) => {
                  const label = getLevelLabel(level);
                  const description = getLevelDescription(level);
                  return (
                    <SelectItem 
                      key={level} 
                      value={level.toString()}
                      className="flex items-center"
                    >
                      <span>
                        {label 
                          ? `${level} - ${label}` 
                          : level.toString()}
                      </span>
                      {description && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="ml-1 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground h-4 w-4">
                                <Info className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="right" 
                              className="max-w-xs z-[100]"
                              avoidCollisions
                            >
                              <p className="text-xs">{description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </td>
      ))}
    </tr>
  );
};

export default DimensionRow;
