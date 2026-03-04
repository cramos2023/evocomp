
import React from "react";
import { Position } from "@/modules/job-evaluation/types/position";
import OrgFieldRowComponent from "./OrgFieldRowComponent";

interface JobFamilyRowProps {
  positions: Position[];
  visiblePositions: number[];
  onUpdatePosition: (index: number, field: keyof Position, value: any) => void;
  getJobFamilyOptions: (careerFunction?: string) => any[];
}

import { useTranslation } from "react-i18next";

const JobFamilyRow: React.FC<JobFamilyRowProps> = ({
  positions,
  visiblePositions,
  onUpdatePosition,
  getJobFamilyOptions
}) => {
  const { t } = useTranslation("jobEvaluation");

  return (
    <OrgFieldRowComponent
      fieldName="jobFamily"
      labelText="Job Family"
      positions={positions}
      visiblePositions={visiblePositions}
      fieldKey="jobFamily"
      options={positions.reduce((allOptions, pos, index) => {
        if (visiblePositions.includes(index)) {
          const options = getJobFamilyOptions(pos.careerFunction);
          options.forEach(opt => {
            if (!allOptions.includes(opt)) {
              allOptions.push(opt);
            }
          });
        }
        return allOptions;
      }, [] as string[])}
      onUpdatePosition={onUpdatePosition}
      disabled={(posIndex) => !positions[posIndex]?.careerFunction}
      placeholder={(posIndex) => 
        positions[posIndex]?.careerFunction 
          ? t("filters.select_family") 
          : t("filters.select_function_first", "Select Career Function first")
      }
    />
  );
};

export default JobFamilyRow;
