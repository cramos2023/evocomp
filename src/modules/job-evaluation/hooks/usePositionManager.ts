import { useState, useEffect } from "react";
import { useToast } from "@/modules/job-evaluation/hooks/use-toast";
import { Position } from "@/modules/job-evaluation/types/position";

// Default position values
const createDefaultPosition = (): Position => ({
  jobTitle: "",
  dimensions: {
    impact: { value: 3, points: 0 },
    communication: { value: 3, points: 0 },
    innovation: { value: 2, points: 0 },
    knowledge: { value: 3, points: 0 },
    risk: { value: 1.5, points: 0 },
    operational: { value: 2, points: 0 }
  },
  // Direct evaluation fields
  impact: 3,
  contribution: 3,
  size: 5,
  communication: 3,
  frame: 2,
  innovation: 2,
  complexity: 2,
  knowledge: 3,
  teams: 2,
  breadth: 2,
  risk: 1.5,
  environment: 2,
  result: undefined
});

export const usePositionManager = () => {
  const { toast } = useToast();
  // Initialize with 2 positions by default (changed from 3)
  const [positions, setPositions] = useState<Position[]>([
    createDefaultPosition(),
    createDefaultPosition()
  ]);

  const addPosition = () => {
    // Add a new position without any limit
    setPositions([...positions, createDefaultPosition()]);
    
    toast({
      title: "Position Added",
      description: "A new position has been added to the evaluation.",
    });
  };

  const removePosition = (index: number) => {
    if (positions.length <= 1) {
      toast({
        title: "Cannot Remove",
        description: "You must keep at least one position for evaluation.",
        variant: "destructive",
      });
      return;
    }
    
    const updatedPositions = [...positions];
    updatedPositions.splice(index, 1);
    setPositions(updatedPositions);
    
    toast({
      title: "Position Removed",
      description: "The position has been removed from the evaluation.",
    });
  };

  const updatePosition = (index: number, field: keyof Position, value: any) => {
    const newPositions = [...positions];
    const position = { ...newPositions[index] };
    
    // Special handling for organization fields that need conditional logic
    if (field === "directReports") {
      position[field] = value as string;
      // Reset career stream when direct reports changes
      position.careerStream = undefined;
      position.careerLevel = undefined;
    } 
    else if (field === "careerStream") {
      position[field] = value as string;
      // Reset career level when career stream changes
      position.careerLevel = undefined;
    }
    else if (field === "careerFunction") {
      position[field] = value as string;
      // Reset job family when career function changes
      position.jobFamily = undefined;
    }
    else if (field === "jobTitle") {
      position[field] = value as string;
    } 
    else if (field === "orgSize") {
      position[field] = Number(value);
      // Sync size field with orgSize when orgSize changes
      position.size = Number(value);
    } 
    else if (field === "size") {
      position[field] = Number(value);
      // Sync orgSize field with size when size changes
      position.orgSize = Number(value);
    } 
    else {
      // For all other fields, just set the value directly
      (position[field] as any) = typeof value === "string" ? value : Number(value);
    }
    
    newPositions[index] = position;
    setPositions(newPositions);
  };

  return {
    positions,
    setPositions,
    addPosition,
    removePosition,
    updatePosition
  };
};
