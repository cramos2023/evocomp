
import React from "react";
import { Position } from "@/modules/job-evaluation/types/position";
import OrgSelectField from "./OrgSelectField";

interface OrgFieldRowProps {
  field: string;
  displayName: string;
  positions: Position[];
  onUpdatePosition: (index: number, field: keyof Position, value: string | number) => void;
  getOptions: (position: Position) => (string | number)[];
  isDisabled: (position: Position) => boolean;
  getPlaceholder: (position: Position) => string;
}

const OrgFieldRow: React.FC<OrgFieldRowProps> = ({
  field,
  displayName,
  positions,
  onUpdatePosition,
  getOptions,
  isDisabled,
  getPlaceholder
}) => {
  return (
    <tr key={field} className="border-b border-border/50 hover:bg-muted/30">
      <td className="sticky left-0 z-10 bg-background border-r shadow-[1px_0_0_#e5e7eb] w-[200px] min-w-[200px] p-0">
        <div className="py-2 px-4">
          <div className="flex items-center gap-1">
            <span className="text-sm">{displayName}</span>
          </div>
        </div>
      </td>
      {positions.map((position, posIndex) => {
        const options = getOptions(position);
        const isFieldDisabled = isDisabled(position);
        const placeholder = getPlaceholder(position);
        const fieldValue = position[field as keyof Position];
          
        return (
          <td key={posIndex} className="min-w-[250px] p-0">
            <div className="py-2 px-4">
              <OrgSelectField
                field={field}
                label=""
                options={options}
                value={fieldValue as string | number | undefined}
                onChange={(value) => onUpdatePosition(posIndex, field as keyof Position, value)}
                placeholder={placeholder}
                disabled={isFieldDisabled}
                hideLabel
              />
            </div>
          </td>
        );
      })}
    </tr>
  );
};

export default OrgFieldRow;
