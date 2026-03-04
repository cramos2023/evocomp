
import { CAREER_STREAMS, JOB_FAMILIES, CAREER_LEVELS } from "@/modules/job-evaluation/utils/organizationData";

export const useOrganizationOptions = () => {
  // Helper to get available career stream options based on direct reports
  const getCareerStreamOptions = (directReports?: string) => {
    if (!directReports) return [];
    return CAREER_STREAMS[directReports as "Yes" | "No"] || [];
  };

  // Helper to get available job family options based on career function
  const getJobFamilyOptions = (careerFunction?: string) => {
    if (!careerFunction) return [];
    return JOB_FAMILIES[careerFunction as keyof typeof JOB_FAMILIES] || [];
  };

  // Helper to get available career level options based on career stream
  const getCareerLevelOptions = (careerStream?: string) => {
    if (!careerStream) return [];
    return CAREER_LEVELS[careerStream as keyof typeof CAREER_LEVELS] || [];
  };

  return {
    getCareerStreamOptions,
    getJobFamilyOptions,
    getCareerLevelOptions
  };
};
