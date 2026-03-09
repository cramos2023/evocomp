
import React from "react";
import { Label } from "@/modules/job-evaluation/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/modules/job-evaluation/components/ui/select";
import { FilterState } from "../types";
import { normalizeOptionKey } from "@/modules/job-evaluation/utils/translationUtils";

interface CareerInformationSectionProps {
  filters: FilterState;
  handleChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  getAvailableOptions: (field: string) => (string | number)[];
}

import { useTranslation } from "react-i18next";

const CareerInformationSection: React.FC<CareerInformationSectionProps> = ({
  filters,
  handleChange,
  getAvailableOptions
}) => {
  const { t } = useTranslation("jobEvaluation");

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-medium">{t("filters.career_info")}</h3>
      <div className="space-y-2">
        <Label htmlFor="directReports">{t("filters.direct_reports")}</Label>
        <Select
          value={filters.directReports}
          onValueChange={(value) => handleChange("directReports", value === "none" ? undefined : value)}
        >
          <SelectTrigger id="directReports" className="bg-muted">
            <SelectValue placeholder={t("filters.select_option")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {getAvailableOptions("directReports").map((option) => (
              <SelectItem key={option.toString()} value={option.toString()}>
                {t(`options.${normalizeOptionKey(option)}`, option.toString())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="careerStream">{t("filters.career_stream")}</Label>
        <Select
          value={filters.careerStream}
          onValueChange={(value) => handleChange("careerStream", value === "none" ? undefined : value)}
          disabled={getAvailableOptions("careerStream").length === 0}
        >
          <SelectTrigger id="careerStream" className="bg-muted">
            <SelectValue placeholder={t("filters.select_stream")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {getAvailableOptions("careerStream").map((stream) => (
              <SelectItem key={stream.toString()} value={stream.toString()}>
                {t(`options.${normalizeOptionKey(stream)}`, stream.toString())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="careerFunction">{t("filters.career_function")}</Label>
        <Select
          value={filters.careerFunction}
          onValueChange={(value) => handleChange("careerFunction", value === "none" ? undefined : value)}
        >
          <SelectTrigger id="careerFunction" className="bg-muted">
            <SelectValue placeholder={t("filters.select_function")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {getAvailableOptions("careerFunction").map((func) => (
              <SelectItem key={func.toString()} value={func.toString()}>
                {t(`options.${normalizeOptionKey(func)}`, func.toString())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="jobFamily">{t("filters.job_family")}</Label>
        <Select
          value={filters.jobFamily}
          onValueChange={(value) => handleChange("jobFamily", value === "none" ? undefined : value)}
          disabled={getAvailableOptions("jobFamily").length === 0}
        >
          <SelectTrigger id="jobFamily" className="bg-muted">
            <SelectValue placeholder={t("filters.select_family")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {getAvailableOptions("jobFamily").map((family) => (
              <SelectItem key={family.toString()} value={family.toString()}>
                {t(`options.${normalizeOptionKey(family)}`, family.toString())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="careerLevel">{t("filters.career_level")}</Label>
        <Select
          value={filters.careerLevel}
          onValueChange={(value) => handleChange("careerLevel", value === "none" ? undefined : value)}
          disabled={getAvailableOptions("careerLevel").length === 0}
        >
          <SelectTrigger id="careerLevel" className="bg-muted">
            <SelectValue placeholder={t("filters.select_level")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {getAvailableOptions("careerLevel").map((level) => (
              <SelectItem key={level.toString()} value={level.toString()}>
                {t(`options.${normalizeOptionKey(level)}`, level.toString())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CareerInformationSection;
