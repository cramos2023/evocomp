import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/modules/job-evaluation/components/ui/button";
import { Input } from "@/modules/job-evaluation/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/modules/job-evaluation/components/ui/select";
import InfoTooltip from "./InfoTooltip";
import OrganizationFields from "./OrganizationFields";
import { dimensionInfoData } from "@/modules/job-evaluation/utils/dimensionInfo";
import { EvaluationInput, EvaluationResult } from "@/modules/job-evaluation/utils/calculatorUtils";
import { Position } from "@/modules/job-evaluation/types/position";
import { OrganizationFieldsData } from "@/modules/job-evaluation/types/organizationFields";

interface PositionRowProps {
  index: number;
  position: Position;
  onUpdate: (index: number, updatedPosition: Position) => void;
  onRemove: (index: number) => void;
  onCalculate: (index: number) => void;
}

const PositionRow: React.FC<PositionRowProps> = ({
  index,
  position,
  onUpdate,
  onRemove,
  onCalculate,
}) => {
  const [localPosition, setLocalPosition] = useState<Position>({ ...position });

  useEffect(() => {
    setLocalPosition({ ...position });
  }, [position]);

  const handleInputChange = (field: string, value: string) => {
    const updatedPosition = {
      ...localPosition,
      [field]: field === "jobTitle" ? value : parseFloat(value) || 0,
    };
    
    setLocalPosition(updatedPosition);
    onUpdate(index, updatedPosition);
  };

  const handleSelectChange = (field: string, value: string) => {
    handleInputChange(field, value);
  };

  const handleOrganizationFieldsChange = (updatedData: OrganizationFieldsData) => {
    const updatedPosition = {
      ...localPosition,
      ...updatedData
    };
    setLocalPosition(updatedPosition);
    onUpdate(index, updatedPosition);
  };

  const renderSelectOptions = (dimensionKey: string) => {
    const info = dimensionInfoData[dimensionKey];
    if (!info || !info.levels) return null;

    return info.levels.map((level) => (
      <SelectItem key={level.value} value={level.value.toString()}>
        {level.value} - {level.label}
      </SelectItem>
    ));
  };

  const generateSelectOptions = (dimensionKey: string) => {
    const info = dimensionInfoData[dimensionKey];
    if (!info || !info.levels) return null;
    
    const standardLevels = info.levels;
    
    const levelMap = new Map(standardLevels.map(level => [level.value, level.label]));
    
    const allOptions = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].filter(value => {
      const minValue = Math.min(...standardLevels.map(l => l.value));
      const maxValue = Math.max(...standardLevels.map(l => l.value));
      return value >= minValue && value <= maxValue;
    });
    
    return allOptions.map(value => {
      const label = levelMap.get(value);
      return (
        <SelectItem key={value} value={value.toString()}>
          {label ? `${value} - ${label}` : value.toString()}
        </SelectItem>
      );
    });
  };

  const renderSelect = (field: string, label: string) => (
    <div className="flex items-center space-x-2">
      <div className="flex-grow">
        <div className="flex items-center mb-1">
          <label className="text-xs text-muted-foreground mr-1">{label}</label>
          <InfoTooltip dimensionKey={field} />
        </div>
        <Select
          value={localPosition[field as keyof Position]?.toString() || ""}
          onValueChange={(value) => handleSelectChange(field, value)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>
          <SelectContent>{generateSelectOptions(field)}</SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="relative grid grid-cols-12 gap-3 p-4 border border-[rgb(var(--border))] rounded-lg bg-[rgb(var(--bg-surface-2))] hover:bg-[rgb(var(--bg-surface))] transition-all">
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 text-red-600 p-0.5 rounded-full z-10 transition-colors"
        aria-label="Remove position"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="col-span-12 sm:col-span-6 md:col-span-3">
        <label className="text-xs text-muted-foreground block mb-1">Job Title</label>
        <Input
          value={localPosition.jobTitle || ""}
          onChange={(e) => handleInputChange("jobTitle", e.target.value)}
          placeholder="Enter job title"
          className="h-9"
        />
      </div>

      <div className="col-span-12 sm:col-span-6 md:col-span-3 flex items-end">
        <Button
          onClick={() => onCalculate(index)}
          className="w-full bg-primary hover:bg-primary/90 text-white h-9"
        >
          Calculate
        </Button>
      </div>

      {position.result && (
        <div className="col-span-12 sm:col-span-12 md:col-span-6 grid grid-cols-6 gap-2">
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Total Points</div>
            <div className="h-9 flex items-center px-3 bg-secondary/50 rounded-md border border-border/50 text-sm font-medium">
              {position.result.totalPoints.toFixed(1)}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Position Class</div>
            <div className="h-9 flex items-center px-3 bg-secondary/50 rounded-md border border-border/50 text-sm font-medium">
              {position.result.positionClass}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground mb-1">RCS Grade</div>
            <div className="h-9 flex items-center justify-center bg-primary/10 rounded-md border border-primary/30 text-sm font-bold text-primary">
              {position.result.rcsGrade}
            </div>
          </div>
        </div>
      )}

      <div className="col-span-12">
        <OrganizationFields 
          data={localPosition} 
          onChange={handleOrganizationFieldsChange} 
        />
      </div>

      <div className="col-span-4">{renderSelect("impact", "Impact")}</div>
      <div className="col-span-4">{renderSelect("contribution", "Contribution")}</div>
      <div className="col-span-4">{renderSelect("size", "Size")}</div>

      <div className="col-span-4">{renderSelect("communication", "Communication")}</div>
      <div className="col-span-4">{renderSelect("frame", "Frame")}</div>
      <div className="col-span-4">{renderSelect("innovation", "Innovation")}</div>

      <div className="col-span-4">{renderSelect("complexity", "Complexity")}</div>
      <div className="col-span-4">{renderSelect("knowledge", "Knowledge")}</div>
      <div className="col-span-4">{renderSelect("teams", "Teams")}</div>

      <div className="col-span-4">{renderSelect("breadth", "Breadth")}</div>
      <div className="col-span-4">{renderSelect("risk", "Risk")}</div>
      <div className="col-span-4">{renderSelect("environment", "Environment")}</div>
    </div>
  );
};

export default PositionRow;
