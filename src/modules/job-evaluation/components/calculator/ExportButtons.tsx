
import React from "react";
import { Button } from "@/modules/job-evaluation/components/ui/button";
import { FileText, Download } from "lucide-react";

interface ExportButtonsProps {
  onExportPDF: () => void;
  onExportCSV: () => void;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({
  onExportPDF,
  onExportCSV,
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onExportPDF}
        className="flex items-center gap-1"
      >
        <FileText className="h-4 w-4" />
        <span>Export PDF</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onExportCSV}
        className="flex items-center gap-1"
      >
        <Download className="h-4 w-4" />
        <span>Export CSV</span>
      </Button>
    </div>
  );
};

export default ExportButtons;
