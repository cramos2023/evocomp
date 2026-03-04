
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/modules/job-evaluation/components/ui/select";
import InfoTooltip from "./InfoTooltip";
import { dimensionInfoData } from "@/modules/job-evaluation/utils/dimensionInfo";

interface DimensionRowProps {
  dimensionKey: string;
  displayName: string;
  positions: any[];
  onUpdatePosition: (posIndex: number, field: string, value: string) => void;
}

const DimensionRow: React.FC<DimensionRowProps> = ({
  dimensionKey,
  displayName,
  positions,
  onUpdatePosition,
}) => {
  const renderSelectOptions = (dimensionKey: string) => {
    const info = dimensionInfoData[dimensionKey];
    if (!info || !info.levels) return null;

    return info.levels.map((level) => (
      <SelectItem key={level.value} value={level.value.toString()}>
        {level.value} - {level.label}
      </SelectItem>
    ));
  };

  return (
    <tr className="border-b border-border/50 hover:bg-muted/30">
      <td className="sticky left-0 z-10 bg-background border-r shadow-[1px_0_0_#e5e7eb] w-[200px] min-w-[200px] p-0">
        <div className="py-2 px-4">
          <div className="flex items-center gap-1">
            <span className="font-medium">{displayName}</span>
            <InfoTooltip dimensionKey={dimensionKey} />
          </div>
        </div>
      </td>
      {positions.map((position, posIndex) => (
        <td key={posIndex} className="min-w-[250px] p-0">
          <div className="p-2 px-4">
            <Select
              value={position[dimensionKey]?.toString() || ""}
              onValueChange={(value) => onUpdatePosition(posIndex, dimensionKey, value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={`Select ${displayName}`} />
              </SelectTrigger>
              <SelectContent>{renderSelectOptions(dimensionKey)}</SelectContent>
            </Select>
          </div>
        </td>
      ))}
    </tr>
  );
};

export default DimensionRow;
