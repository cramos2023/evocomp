
import React from "react";
import { ScrollArea } from "@/modules/job-evaluation/components/ui/scroll-area";

interface TableScrollContainerProps {
  children: React.ReactNode;
}

const TableScrollContainer: React.FC<TableScrollContainerProps> = ({ children }) => {
  return (
    <div className="relative w-full overflow-x-auto">
      <div className="w-full" style={{ maxWidth: '100%', overflowX: 'auto' }}>
        {children}
      </div>
    </div>
  );
};

export default TableScrollContainer;
