
import React from "react";
import { Position } from "@/modules/job-evaluation/types/position";

interface ResultRowsProps {
  positions: Position[];
  visiblePositions: number[];
}

import { useTranslation } from "react-i18next";

const ResultRows: React.FC<ResultRowsProps> = ({
  positions,
  visiblePositions
}) => {
  const { t } = useTranslation("jobEvaluation");

  return (
    <>
      <tr key="results-header" className="border-t border-border/30 bg-secondary/30">
        <td colSpan={visiblePositions.length + 1} className="p-2 text-sm font-medium">
          {t("results.results")}
        </td>
      </tr>
      <tr key="position-class">
        <td className="p-3 align-middle">
          <div className="font-medium text-sm flex items-center">
            {t("results.positionClass")}
          </div>
        </td>
        {visiblePositions.map((posIndex) => (
          <td key={`pos-class-${posIndex}`} className="p-2 align-middle">
            <div className="h-9 flex items-center justify-center px-3 rounded text-sm font-medium">
              {positions[posIndex]?.result ? positions[posIndex].result.positionClass : '-'}
            </div>
          </td>
        ))}
      </tr>
      <tr key="rcs-grade">
        <td className="p-3 align-middle">
          <div className="font-medium text-sm flex items-center">
            {t("results.rcsGrade")}
          </div>
        </td>
        {visiblePositions.map((posIndex) => (
          <td key={`rcs-grade-${posIndex}`} className="p-2 align-middle">
            <div className={`h-9 flex items-center justify-center px-3 rounded text-sm font-bold ${
              positions[posIndex]?.result ? 'bg-primary/20 text-primary' : ''
            }`}>
              {positions[posIndex]?.result ? positions[posIndex].result.rcsGrade : '-'}
            </div>
          </td>
        ))}
      </tr>
    </>
  );
};

export default ResultRows;
