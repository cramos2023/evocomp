
import React from "react";
import MatrixToggle from "../MatrixToggle";

interface MatrixTogglesSectionProps {
  showImpactMatrix: boolean;
  showCommunicationMatrix: boolean;
  showInnovationMatrix: boolean;
  showKnowledgeMatrix: boolean;
  setShowImpactMatrix: (show: boolean) => void;
  setShowCommunicationMatrix: (show: boolean) => void;
  setShowInnovationMatrix: (show: boolean) => void;
  setShowKnowledgeMatrix: (show: boolean) => void;
}

const MatrixTogglesSection: React.FC<MatrixTogglesSectionProps> = ({
  showImpactMatrix,
  showCommunicationMatrix,
  showInnovationMatrix,
  showKnowledgeMatrix,
  setShowImpactMatrix,
  setShowCommunicationMatrix,
  setShowInnovationMatrix,
  setShowKnowledgeMatrix
}) => {
  return (
    <div className="flex flex-wrap gap-3">
      <MatrixToggle 
        showMatrix={showImpactMatrix}
        onToggleMatrix={() => setShowImpactMatrix(!showImpactMatrix)}
        matrixName="impactContribution"
      />
      
      <MatrixToggle 
        showMatrix={showCommunicationMatrix}
        onToggleMatrix={() => setShowCommunicationMatrix(!showCommunicationMatrix)}
        matrixName="communicationFrame"
      />
      
      <MatrixToggle 
        showMatrix={showInnovationMatrix}
        onToggleMatrix={() => setShowInnovationMatrix(!showInnovationMatrix)}
        matrixName="innovationComplexity"
      />
      
      <MatrixToggle 
        showMatrix={showKnowledgeMatrix}
        onToggleMatrix={() => setShowKnowledgeMatrix(!showKnowledgeMatrix)}
        matrixName="knowledgeTeams"
      />
    </div>
  );
};

export default MatrixTogglesSection;
