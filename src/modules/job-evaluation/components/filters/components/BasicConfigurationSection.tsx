
import React from "react";
import { Input } from "@/modules/job-evaluation/components/ui/input";
import { Label } from "@/modules/job-evaluation/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/modules/job-evaluation/components/ui/select";
import { FilterState } from "../types";

interface BasicConfigurationSectionProps {
  filters: FilterState;
  handleChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  getAvailableOptions: (field: string) => (string | number)[];
}

import { useTranslation } from "react-i18next";

const BasicConfigurationSection: React.FC<BasicConfigurationSectionProps> = ({
  filters,
  handleChange,
  getAvailableOptions
}) => {
  const { t } = useTranslation("jobEvaluation");

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-medium">{t("filters.basic_config")}</h3>
      <div className="space-y-2">
        <Label htmlFor="initialRows">{t("filters.num_roles")}</Label>
        <Input
          id="initialRows"
          type="number"
          value={filters.initialRows || ""}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value) && value >= 2 && value <= 100) {
              handleChange("initialRows", value);
            }
          }}
          min={2}
          max={100}
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">{t("filters.min_roles")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">{t("filters.country")}</Label>
        <Select
          value={filters.country}
          onValueChange={(value) => handleChange("country", value === "none" ? undefined : value)}
        >
          <SelectTrigger id="country" className="bg-muted">
            <SelectValue placeholder={t("filters.select_country")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {getAvailableOptions("country").map((country) => (
              <SelectItem key={country.toString()} value={country.toString()}>
                {country.toString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="orgSize">{t("filters.org_size")}</Label>
        <Select
          value={filters.orgSize?.toString()}
          onValueChange={(value) => {
            if (value === "none") {
              handleChange("orgSize", undefined);
            } else {
              handleChange("orgSize", parseInt(value));
            }
          }}
        >
          <SelectTrigger id="orgSize" className="bg-muted">
            <SelectValue placeholder={t("filters.select_size")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {getAvailableOptions("orgSize").map((size) => (
              <SelectItem key={size.toString()} value={size.toString()}>
                {size.toString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default BasicConfigurationSection;
