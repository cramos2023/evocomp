
import React from "react";

interface OrgSectionHeaderProps {
  visiblePositions: number[];
}

import { useTranslation } from "react-i18next";

const OrgSectionHeader: React.FC<OrgSectionHeaderProps> = ({ visiblePositions }) => {
  const { t } = useTranslation("jobEvaluation");

  return (
    <tr key="org-header" className="bg-secondary/30">
      <td className="sticky left-0 z-10 bg-secondary/30 border-r shadow-[1px_0_0_#e5e7eb] w-[200px] min-w-[200px] p-2 text-sm font-medium">
        {t("org.information")}
      </td>
      {visiblePositions.map((index) => (
        <td key={`org-header-pos-${index}`} className="p-2 min-w-[250px] w-[250px]"></td>
      ))}
    </tr>
  );
};

export default OrgSectionHeader;
