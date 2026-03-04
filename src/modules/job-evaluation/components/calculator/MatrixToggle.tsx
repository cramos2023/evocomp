
import React from "react";
import { Button } from "@/modules/job-evaluation/components/ui/button";
import { Eye, EyeOff } from "lucide-react";


interface MatrixToggleProps {
  showMatrix: boolean;
  onToggleMatrix: () => void;
  matrixName: string;
}

import { useTranslation } from "react-i18next";

const MatrixToggle: React.FC<MatrixToggleProps> = ({ 
  showMatrix, 
  onToggleMatrix,
  matrixName
}) => {
  const { t } = useTranslation("jobEvaluation");

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggleMatrix}
      className="flex items-center gap-2 h-10 px-4 py-2 min-w-[200px] justify-center"
    >
      {showMatrix ? (
        <>
          <EyeOff className="h-4 w-4" />
          <span>{t("matrix.hide", { name: t(`matrix.${matrixName}`) })}</span>
        </>
      ) : (
        <>
          <Eye className="h-4 w-4" />
          <span>{t("matrix.show", { name: t(`matrix.${matrixName}`) })}</span>
        </>
      )}
    </Button>
  );
};

export default MatrixToggle;
