import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { SimulationWorkbench } from '../components/SimulationWorkbench';

const SimulationWorkbenchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!id) {
    return <div>Scenario ID missing</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-[rgb(var(--surface-main))]">
      <div className="bg-white dark:bg-slate-900 border-b border-[rgb(var(--border-main))] px-8 py-4 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">
          Simulation Engine / Workbench
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <SimulationWorkbench scenarioId={id} />
      </div>
    </div>
  );
};

export default SimulationWorkbenchPage;
