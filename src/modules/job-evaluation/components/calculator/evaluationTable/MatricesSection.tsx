
import React from "react";
import ImpactContributionMatrix from "../ImpactContributionMatrix";
import CommunicationMatrix from "../CommunicationMatrix";
import InnovationComplexityMatrix from "../InnovationComplexityMatrix";
import KnowledgeTeamsMatrix from "../KnowledgeTeamsMatrix";

interface MatricesSectionProps {
  showImpactMatrix: boolean;
  showCommunicationMatrix: boolean;
  showInnovationMatrix: boolean;
  showKnowledgeMatrix: boolean;
}

const MatricesSection: React.FC<MatricesSectionProps> = ({
  showImpactMatrix,
  showCommunicationMatrix,
  showInnovationMatrix,
  showKnowledgeMatrix
}) => {
  return (
    <>
      {/* Impact/Contribution Reference Matrix - Conditionally rendered */}
      {showImpactMatrix && (
        <div className="my-4">
          <ImpactContributionMatrix />
        </div>
      )}

      {/* Communication/Frame Reference Matrix - Conditionally rendered */}
      {showCommunicationMatrix && (
        <div className="my-4">
          <CommunicationMatrix />
        </div>
      )}

      {/* Innovation/Complexity Reference Matrix - Conditionally rendered */}
      {showInnovationMatrix && (
        <div className="my-4">
          <InnovationComplexityMatrix />
        </div>
      )}
      
      {/* Knowledge/Teams Reference Matrix - Conditionally rendered */}
      {showKnowledgeMatrix && (
        <div className="my-4">
          <KnowledgeTeamsMatrix />
        </div>
      )}
    </>
  );
};

export default MatricesSection;
