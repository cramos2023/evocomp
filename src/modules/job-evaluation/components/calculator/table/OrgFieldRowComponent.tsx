
import React from "react";
import { Position } from "@/modules/job-evaluation/types/position";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/modules/job-evaluation/components/ui/select";
import { normalizeOptionKey } from "@/modules/job-evaluation/utils/translationUtils";

interface OrgFieldRowComponentProps {
  fieldName: string;
  labelText: string;
  positions: Position[];
  visiblePositions: number[];
  fieldKey: keyof Position;
  options: any[];
  onUpdatePosition: (index: number, field: keyof Position, value: any) => void;
  disabled?: (posIndex: number) => boolean;
  placeholder?: (posIndex: number) => string;
}

import { useTranslation } from "react-i18next";

const OrgFieldRowComponent: React.FC<OrgFieldRowComponentProps> = ({
  fieldName,
  labelText,
  positions,
  visiblePositions,
  fieldKey,
  options,
  onUpdatePosition,
  disabled = () => false,
  placeholder
}) => {
  const { t } = useTranslation("jobEvaluation");
  
  // Default placeholder if not provided
  const getPlaceholder = (posIndex: number) => {
    if (placeholder) return placeholder(posIndex);
    return t("filters.select_option", "Select option");
  };

  return (
    <tr key={`${fieldName}-row`} className="border-b border-border/50 hover:bg-muted/30">
      <td className="sticky left-0 z-10 bg-background border-r shadow-[1px_0_0_#e5e7eb] w-[200px] min-w-[200px] p-0">
        <div className="py-2 px-4">
          <div className="flex items-center gap-1">
            <span className="text-sm">{t(`org.${fieldName}`, labelText)}</span>
          </div>
        </div>
      </td>
      {visiblePositions.map((posIndex) => (
        <td key={posIndex} className="min-w-[250px] p-0">
          <div className="py-2 px-4">
            <Select
              value={positions[posIndex]?.[fieldKey]?.toString() || ""}
              onValueChange={(value) => onUpdatePosition(posIndex, fieldKey, fieldKey === "orgSize" ? Number(value) : value)}
              disabled={disabled(posIndex)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={getPlaceholder(posIndex)} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                   <SelectItem key={option} value={option.toString()}>
                    {t(`options.${normalizeOptionKey(option)}`, option.toString()) as string}
                   </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </td>
      ))}
    </tr>
  );
};

export default OrgFieldRowComponent;
