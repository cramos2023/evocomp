
import React from "react";
import { Button } from "@/modules/job-evaluation/components/ui/button";
import { PlusCircle } from "lucide-react";

interface PositionControlsProps {
  onCalculateAll: () => void;
  onAddPosition: () => void;
}

import { useTranslation } from "react-i18next";

const PositionControls: React.FC<PositionControlsProps> = ({
  onCalculateAll,
  onAddPosition,
}) => {
  const { t } = useTranslation("jobEvaluation");

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <Button 
          onClick={onCalculateAll}
          variant="default"
          size="sm"
          className="font-medium"
        >
          {t("calculator.calculateAll")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddPosition}
          className="flex items-center gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{t("calculator.addPosition")}</span>
        </Button>
      </div>
    </div>
  );
};

export default PositionControls;
