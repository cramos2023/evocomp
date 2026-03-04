
import React, { useEffect, useState } from "react";
import { Button } from "@/modules/job-evaluation/components/ui/button";
import { FilterX } from "lucide-react";
import { FilterState, SidebarFilterProps } from "./types";
import { useFilterOptions } from "./hooks/useFilterOptions";
import BasicConfigurationSection from "./components/BasicConfigurationSection";
import CareerInformationSection from "./components/CareerInformationSection";
import MobileToggleButton from "./components/MobileToggleButton";

import { useTranslation } from "react-i18next";

const SidebarFilter: React.FC<SidebarFilterProps> = ({ 
  onFilterChange, 
  isOpen,
  onToggle,
  positions = []
}) => {
  const { t } = useTranslation("jobEvaluation");
  const [filters, setFilters] = useState<FilterState>({
    initialRows: 2,
    country: undefined,
    orgSize: undefined,
    directReports: undefined,
    careerStream: undefined,
    careerFunction: undefined,
    jobFamily: undefined,
    careerLevel: undefined,
  });

  const { getAvailableOptions } = useFilterOptions(positions);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      if (key === "directReports") {
        newFilters.careerStream = undefined;
        newFilters.careerLevel = undefined;
      } else if (key === "careerStream") {
        newFilters.careerLevel = undefined;
      } else if (key === "careerFunction") {
        newFilters.jobFamily = undefined;
      }
      
      return newFilters;
    });
  };

  const resetFilters = () => {
    setFilters({
      initialRows: 2,
      country: undefined,
      orgSize: undefined,
      directReports: undefined,
      careerStream: undefined,
      careerFunction: undefined,
      jobFamily: undefined,
      careerLevel: undefined,
    });
  };

  const getFieldOptions = (field: string) => {
    return getAvailableOptions(field as any, filters);
  };

  return (
    <>
      <MobileToggleButton onToggle={onToggle} />

      <div className={`md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onToggle}></div>
      
      <div className={`md:static md:block fixed inset-y-0 left-0 z-30 w-[280px] ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out`}>
        <div className="h-full md:h-auto bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold">{t("filters.dynamic")}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="md:hidden"
            >
              <FilterX className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-200px)] p-0">
            <div className="divide-y">
              <BasicConfigurationSection 
                filters={filters} 
                handleChange={handleChange} 
                getAvailableOptions={getFieldOptions} 
              />
              <CareerInformationSection 
                filters={filters} 
                handleChange={handleChange} 
                getAvailableOptions={getFieldOptions} 
              />
            </div>
          </div>

          <div className="p-4 border-t">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={resetFilters}
            >
              <FilterX className="h-4 w-4 mr-2" />
              {t("filters.reset")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SidebarFilter;
