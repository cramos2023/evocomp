
import React from "react";
import { Position } from "@/modules/job-evaluation/types/position";
import OrgFieldRowComponent from "./OrgFieldRowComponent";

interface CareerLevelRowProps {
  positions: Position[];
  visiblePositions: number[];
  onUpdatePosition: (index: number, field: keyof Position, value: any) => void;
  getCareerLevelOptions: (careerStream?: string) => any[];
}

import { useTranslation } from "react-i18next";

const CareerLevelRow: React.FC<CareerLevelRowProps> = ({
  positions,
  visiblePositions,
  onUpdatePosition,
  getCareerLevelOptions
}) => {
  const { t } = useTranslation("jobEvaluation");

  return (
    <OrgFieldRowComponent
      fieldName="careerLevel"
      labelText="Career Level"
      positions={positions}
      visiblePositions={visiblePositions}
      fieldKey="careerLevel"
      options={positions.reduce((allOptions, pos, index) => {
        if (visiblePositions.includes(index)) {
          const options = getCareerLevelOptions(pos.careerStream);
          options.forEach(opt => {
            if (!allOptions.includes(opt)) {
              allOptions.push(opt);
            }
          });
        }
        return allOptions;
      }, [] as string[])}
      onUpdatePosition={onUpdatePosition}
      disabled={(posIndex) => !positions[posIndex]?.careerStream}
      placeholder={(posIndex) => 
        positions[posIndex]?.careerStream 
          ? t("filters.select_level") 
          : t("filters.select_stream_first", "Select Career Stream first")
      }
    />
  );
};

export default CareerLevelRow;
