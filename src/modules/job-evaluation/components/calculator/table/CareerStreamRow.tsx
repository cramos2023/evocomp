
import React from "react";
import { Position } from "@/modules/job-evaluation/types/position";
import OrgFieldRowComponent from "./OrgFieldRowComponent";

interface CareerStreamRowProps {
  positions: Position[];
  visiblePositions: number[];
  onUpdatePosition: (index: number, field: keyof Position, value: any) => void;
  getCareerStreamOptions: (directReports?: string) => any[];
}

import { useTranslation } from "react-i18next";

const CareerStreamRow: React.FC<CareerStreamRowProps> = ({
  positions,
  visiblePositions,
  onUpdatePosition,
  getCareerStreamOptions
}) => {
  const { t } = useTranslation("jobEvaluation");

  return (
    <OrgFieldRowComponent
      fieldName="careerStream"
      labelText="Career Stream"
      positions={positions}
      visiblePositions={visiblePositions}
      fieldKey="careerStream"
      options={positions.reduce((allOptions, pos, index) => {
        if (visiblePositions.includes(index)) {
          const options = getCareerStreamOptions(pos.directReports);
          options.forEach(opt => {
            if (!allOptions.includes(opt)) {
              allOptions.push(opt);
            }
          });
        }
        return allOptions;
      }, [] as string[])}
      onUpdatePosition={onUpdatePosition}
      disabled={(posIndex) => !positions[posIndex]?.directReports}
      placeholder={(posIndex) => 
        positions[posIndex]?.directReports 
          ? t("filters.select_stream") 
          : t("filters.select_reports_first", "Select Direct Reports first")
      }
    />
  );
};

export default CareerStreamRow;
