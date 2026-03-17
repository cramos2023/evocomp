import React, { useState } from 'react';
import AIConsultantShell from '../components/AIConsultantShell';
import AIControlRail from '../components/AIControlRail';
import AIConsultingStage from '../components/AIConsultingStage';
import AIEvidenceDrawer from '../components/AIEvidenceDrawer';
import { InteractionMode } from '../types/evidence';

interface AIConsultantPageProps {
  profile: any;
}

const AIConsultantPage: React.FC<AIConsultantPageProps> = ({ profile }) => {
  const [mode, setMode] = useState<InteractionMode>('ASK');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <AIConsultantShell>
      <div className="flex flex-1 overflow-hidden h-full relative">
        {/* Left Control Rail */}
        <AIControlRail 
          mode={mode} 
          onModeChange={setMode} 
        />

        {/* Main Consulting Stage */}
        <AIConsultingStage 
          mode={mode} 
          profile={profile} 
        />

        {/* Persistent Evidence Drawer */}
        <AIEvidenceDrawer 
          isOpen={isDrawerOpen} 
          onToggle={() => setIsDrawerOpen(!isDrawerOpen)} 
        />
      </div>
    </AIConsultantShell>
  );
};

export default AIConsultantPage;
