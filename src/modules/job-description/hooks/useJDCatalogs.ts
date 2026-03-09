import { useState, useMemo } from 'react';
import { 
  CAREER_FUNCTIONS, 
  JOB_FAMILIES, 
  CAREER_LEVELS,
  CAREER_STREAMS
} from '@/modules/job-evaluation/utils/organizationData';

export function useJDCatalogs() {
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  
  // Get job families filtered by the selected function
  const filteredJobFamilies = useMemo(() => {
    if (!selectedFunction) return [];
    return (JOB_FAMILIES as any)[selectedFunction] || [];
  }, [selectedFunction]);

  // Flatten career levels for the JD selector
  const allCareerLevels = useMemo(() => {
    return Object.values(CAREER_LEVELS).flat();
  }, []);

  return {
    functions: CAREER_FUNCTIONS,
    jobFamilies: filteredJobFamilies,
    careerLevels: allCareerLevels,
    selectedFunction,
    setSelectedFunction
  };
}
