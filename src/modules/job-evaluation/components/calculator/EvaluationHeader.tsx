
import React from "react";
import ExportButtons from "./ExportButtons";

interface EvaluationHeaderProps {
  exportToPDF: () => void;
  exportToCSV: () => void;
}

const EvaluationHeader: React.FC<EvaluationHeaderProps> = ({ exportToPDF, exportToCSV }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Position Evaluation System</h2>
        <p className="text-muted-foreground">
          Evaluate job positions based on multiple criteria to determine position classification.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ExportButtons onExportPDF={exportToPDF} onExportCSV={exportToCSV} />
      </div>
    </div>
  );
};

export default EvaluationHeader;
