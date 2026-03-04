
import { useState, useEffect } from "react";
import { Position } from "@/modules/job-evaluation/types/position";

export const useFilterOptions = (positions: Position[] = []) => {
  const getUniqueValues = (field: keyof Position): (string | number)[] => {
    if (!positions || positions.length === 0) return [];
    
    const uniqueValues = new Set<string | number>();
    
    positions.forEach(position => {
      const value = position[field];
      if (value !== undefined && value !== null) {
        uniqueValues.add(value as string | number);
      }
    });
    
    return Array.from(uniqueValues).sort();
  };

  const getAvailableOptions = (field: keyof Position, filters?: any): (string | number)[] => {
    if (!positions || positions.length === 0) return [];
    
    if (field === "careerLevel" && filters?.careerStream) {
      const availableLevels = new Set<string>();
      
      positions.forEach(position => {
        if (position.careerStream === filters.careerStream && position.careerLevel) {
          availableLevels.add(position.careerLevel as string);
        }
      });
      
      return Array.from(availableLevels).sort();
    }
    
    if (field === "jobFamily" && filters?.careerFunction) {
      const availableFamilies = new Set<string>();
      
      positions.forEach(position => {
        if (position.careerFunction === filters.careerFunction && position.jobFamily) {
          availableFamilies.add(position.jobFamily as string);
        }
      });
      
      return Array.from(availableFamilies).sort();
    }
    
    return getUniqueValues(field);
  };

  return {
    getUniqueValues,
    getAvailableOptions
  };
};
