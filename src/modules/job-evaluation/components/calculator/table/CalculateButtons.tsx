
import React from "react";
import { Button } from "@/modules/job-evaluation/components/ui/button";
import { Calculator } from "lucide-react";

interface CalculateButtonsProps {
  visiblePositions: number[];
  onCalculatePosition: (index: number) => void;
}

import { useTranslation } from "react-i18next";

const CalculateButtons: React.FC<CalculateButtonsProps> = ({ 
  visiblePositions, 
  onCalculatePosition 
}) => {
  const { t } = useTranslation("jobEvaluation");

  return (
    <tr key="calculate-buttons" className="border-t border-border/30">
      <td className="p-3 align-middle">
        <div className="font-medium text-sm flex items-center">
          {t("calculator.calculate_individual")}
        </div>
      </td>
      {visiblePositions.map((posIndex) => (
        <td key={`calc-${posIndex}`} className="p-2 align-middle">
          <Button 
            onClick={() => onCalculatePosition(posIndex)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {t("calculator.calculate")}
          </Button>
        </td>
      ))}
    </tr>
  );
};

export default CalculateButtons;
