
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/modules/job-evaluation/components/ui/select";
import InfoTooltip from "./InfoTooltip";

interface OrgSelectFieldProps {
  field: string;
  label: string;
  options: (string | number)[] | { value: string | number; label?: string }[];
  value: string | number | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hideLabel?: boolean;
}

const OrgSelectField: React.FC<OrgSelectFieldProps> = ({
  field,
  label,
  options,
  value,
  onChange,
  placeholder = `Select ${label}`,
  disabled = false,
  hideLabel = false
}) => {
  // Convert simple array to object array format if needed
  const formattedOptions = options.map(option => 
    typeof option === 'object' ? option : { value: option }
  );

  // If no options available, show appropriate message
  const effectivePlaceholder = formattedOptions.length === 0 
    ? "No options available" 
    : placeholder;

  return (
    <div className="flex-grow">
      {!hideLabel && (
        <div className="flex items-center mb-1">
          <label className="text-xs text-muted-foreground mr-1">{label}</label>
          <InfoTooltip dimensionKey={field} />
        </div>
      )}
      <Select
        value={value?.toString() || ""}
        onValueChange={onChange}
        disabled={disabled || formattedOptions.length === 0}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder={effectivePlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {formattedOptions.map((option) => (
            <SelectItem 
              key={option.value.toString()} 
              value={option.value.toString()}
            >
              {option.label 
                ? `${option.value} - ${option.label}` 
                : option.value.toString()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default OrgSelectField;
