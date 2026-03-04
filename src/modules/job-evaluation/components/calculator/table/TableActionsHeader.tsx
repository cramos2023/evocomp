
import React from "react";
import PositionControls from "../PositionControls";

interface TableActionsHeaderProps {
  onCalculateAll: () => void;
  onAddPosition: () => void;
}

const TableActionsHeader: React.FC<TableActionsHeaderProps> = ({
  onCalculateAll,
  onAddPosition
}) => {
  return (
    <PositionControls 
      onCalculateAll={onCalculateAll} 
      onAddPosition={onAddPosition} 
    />
  );
};

export default TableActionsHeader;
