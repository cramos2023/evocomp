
import React from "react";
import { useToast } from "@/modules/job-evaluation/hooks/use-toast";
import ExportButtons from "./ExportButtons";
import { exportToPDF, exportToCSV } from "@/modules/job-evaluation/utils/exportUtils";
import { Position } from "@/modules/job-evaluation/types/position";


interface TableHeaderProps {
  positions: Position[];
  positionCount: number;
  onPositionCountChange: (count: number) => void;
}

import { useTranslation } from "react-i18next";

const TableHeader: React.FC<TableHeaderProps> = ({ 
  positions, 
  positionCount,
  onPositionCountChange
}) => {
  const { toast } = useToast();
  const { t } = useTranslation("jobEvaluation");
  
  const handleExportToPDF = () => {
    const calculatedPositions = positions.filter(position => position.result);
    
    if (calculatedPositions.length === 0) {
      toast({
        title: t("toast.no_data_title"),
        description: t("toast.no_data_desc"),
        variant: "destructive",
      });
      return;
    }
    
    const success = exportToPDF(positions);
    
    if (success) {
      toast({
        title: t("toast.export_success_title"),
        description: t("toast.export_success_desc"),
      });
    } else {
      toast({
        title: t("toast.export_error_title"),
        description: t("toast.export_error_desc"),
        variant: "destructive",
      });
    }
  };

  const handleExportToCSV = () => {
    const calculatedPositions = positions.filter(position => position.result);
    
    if (calculatedPositions.length === 0) {
      toast({
        title: t("toast.no_data_title"),
        description: t("toast.no_data_desc"),
        variant: "destructive",
      });
      return;
    }
    
    const success = exportToCSV(positions);
    
    if (success) {
      toast({
        title: t("toast.export_success_title"),
        description: t("toast.export_success_desc"),
      });
    } else {
      toast({
        title: t("toast.export_error_title"),
        description: t("toast.export_error_desc"),
        variant: "destructive",
      });
    }
  };

  // Create an array of options from 1 to 10 for position count dropdown
  const positionCountOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h2 className="text-2xl font-display font-bold tracking-tight">{t("calculator.title")}</h2>
        <p className="text-muted-foreground">
          {t("calculator.description")}
        </p>
      </div>
      <div className="flex gap-2 items-center">
        <div className="mr-2">
          <label className="text-sm mr-2">{t("calculator.position")}:</label>
          <select 
            className="rounded border px-2 py-1"
            value={positionCount}
            onChange={(e) => onPositionCountChange(parseInt(e.target.value))}
          >
            {positionCountOptions.map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        <ExportButtons onExportPDF={handleExportToPDF} onExportCSV={handleExportToCSV} />
      </div>
    </div>
  );
};

export default TableHeader;
