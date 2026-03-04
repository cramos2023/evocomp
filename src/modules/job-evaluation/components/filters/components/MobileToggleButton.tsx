
import React from "react";
import { Button } from "@/modules/job-evaluation/components/ui/button";
import { FilterIcon } from "lucide-react";

interface MobileToggleButtonProps {
  onToggle: () => void;
}

const MobileToggleButton: React.FC<MobileToggleButtonProps> = ({ onToggle }) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className="fixed left-4 top-20 z-40 md:hidden"
    >
      <FilterIcon className="h-4 w-4 mr-2" />
      Filters
    </Button>
  );
};

export default MobileToggleButton;
