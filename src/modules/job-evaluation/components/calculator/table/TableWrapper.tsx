
import React from "react";

interface TableWrapperProps {
  children: React.ReactNode;
}

const TableWrapper: React.FC<TableWrapperProps> = ({ children }) => {
  return (
    <div className="relative border rounded-lg bg-background shadow-sm w-full">
      {children}
    </div>
  );
};

export default TableWrapper;
