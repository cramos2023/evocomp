
import React from "react";
import { Info } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/job-evaluation/components/ui/tooltip";

interface DimensionSectionHeaderProps {
  visiblePositions: number[];
}

import { useTranslation } from "react-i18next";

const DimensionSectionHeader: React.FC<DimensionSectionHeaderProps> = ({ visiblePositions }) => {
  const { t } = useTranslation("jobEvaluation");

  return (
    <tr key="dimensions-header" className="border-t border-border/30 bg-secondary/30">
      <td 
        colSpan={1} 
        className="sticky left-0 z-10 bg-secondary/30 p-2 text-sm font-medium border-r shadow-[1px_0_0_#e5e7eb]"
      >
        <div className="flex items-center gap-2">
          <span>{t("evaluation.dimensions")}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground h-5 w-5">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent 
                side="right" 
                className="max-w-md p-4 z-[100]"
                avoidCollisions
              >
                <h4 className="mb-2 font-medium">{t("evaluation.process")}</h4>
                <p className="text-sm mb-2">
                  {t("evaluation.process_desc")}
                </p>
                <ul className="space-y-1 text-xs">
                  <li>• {t("evaluation.impact_contribution_desc")}</li>
                  <li>• {t("evaluation.size_desc")}</li>
                  <li>• {t("evaluation.communication_frame_desc")}</li>
                  <li>• {t("evaluation.innovation_complexity_desc")}</li>
                  <li>• {t("evaluation.knowledge_teams_breadth_desc")}</li>
                  <li>• {t("evaluation.risk_environment_desc")}</li>
                </ul>
                <p className="text-xs mt-2">
                  {t("evaluation.process_footer")}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </td>
      <td colSpan={visiblePositions.length} className="p-2 text-sm font-medium">
        {/* Empty cell that spans all position columns */}
      </td>
    </tr>
  );
};

export default DimensionSectionHeader;
