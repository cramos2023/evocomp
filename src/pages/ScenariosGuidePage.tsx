import React from 'react';
import { BookOpen, Layers, Settings, CheckCircle2, ArrowLeft, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const PHASE_ICONS: Record<string, React.ElementType> = {
  createScenario: Layers,
  resultsAndAdjustments: Settings,
  execution: CheckCircle2
};

export default function ScenariosGuidePage() {
  const { t } = useTranslation('scenarios_guide');
  const navigate = useNavigate();

  const title = t('scenarios.guide.title', { defaultValue: 'Compensation Scenarios' });
  const subtitle = t('scenarios.guide.subtitle', { defaultValue: 'Model, distribute, and execute pay actions.' });
  
  const rawPhases = t('scenarios.guide.phases', { returnObjects: true }) as any;
  const phases = rawPhases && typeof rawPhases === 'object' ? Object.entries(rawPhases) : [];
  
  const rawGlossary = t('scenarios.guide.glossary', { returnObjects: true }) as any;
  const glossaryItems = rawGlossary && typeof rawGlossary === 'object' ? Object.entries(rawGlossary) : [];

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      {/* Navigation & Header */}
      <div className="mb-12">
        <button 
          onClick={() => navigate('/app/comp/scenarios')}
          className="flex items-center gap-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] font-bold text-sm transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {t('back_to_scenarios', { defaultValue: 'Back to Scenarios' })}
        </button>
        
        <div className="flex items-center gap-5 text-[rgb(var(--primary))] mb-6">
          <BookOpen className="w-12 h-12" />
          <h1 className="text-5xl font-black tracking-tighter leading-none">{title}</h1>
        </div>
        <p className="text-[rgb(var(--text-secondary))] text-2xl font-bold max-w-2xl">{subtitle}</p>
      </div>

      {/* Glossary / Key Concepts Card */}
      <div className="bg-[rgb(var(--bg-surface-2))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] p-8 shadow-sm">
        <div className="flex items-center gap-3 text-[rgb(var(--primary))] mb-6">
          <Info className="w-6 h-6" />
          <h2 className="text-xl font-black uppercase tracking-tight">
            {t('scenarios.guide.glossary_title', { defaultValue: 'Key Concepts & Glossary' })}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          {glossaryItems.map(([key, value]: [string, any]) => (
            <div key={key} className="space-y-1">
              <p className="text-sm font-medium text-[rgb(var(--text-secondary))] leading-relaxed">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Phases Content */}
      <div className="space-y-16">
        {phases.map(([phaseKey, phaseData]: [string, any]) => {
          const Icon = PHASE_ICONS[phaseKey] || Layers;
          const steps = Array.isArray(phaseData.steps) ? phaseData.steps : [];

          return (
            <div key={phaseKey} className="group">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-16 bg-[rgb(var(--primary))] text-white rounded-2xl flex items-center justify-center shadow-xl shadow-[rgba(46,79,210,0.2)] group-hover:scale-110 transition-transform duration-500">
                  <Icon className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-[rgb(var(--text-primary))] tracking-tight">{phaseData.title}</h2>
                  <p className="text-[rgb(var(--text-secondary))] text-lg font-bold mt-1">{phaseData.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 relative">
                {/* Vertical Line for timeline effect */}
                <div className="absolute left-[31px] top-4 bottom-4 w-0.5 bg-[rgb(var(--border))] opacity-50 hidden md:block" />
                
                {steps.map((step: string, i: number) => (
                  <div key={i} className="flex items-start gap-6 relative">
                    <div className="w-16 flex justify-center shrink-0 pt-1 pointer-events-none z-10">
                       <span className="w-8 h-8 rounded-full bg-[rgb(var(--bg-surface))] border-2 border-[rgb(var(--primary))] text-[rgb(var(--primary))] flex items-center justify-center font-black text-xs">
                         {i + 1}
                       </span>
                    </div>
                    <div className="flex-1 bg-[rgb(var(--bg-surface))] p-6 rounded-2xl border border-[rgb(var(--border))] shadow-sm group-hover:border-[rgba(var(--primary-rgb),0.2)] transition-colors">
                      <p className="text-[17px] font-medium text-[rgb(var(--text-primary))] leading-relaxed">
                        {step}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="pt-12 border-t border-[rgb(var(--border))] text-center">
        <p className="text-[rgb(var(--text-muted))] font-bold italic">
          {t('scenarios.guide.notes.safe_changes', { defaultValue: 'Only locked allocations are protected from automatic adjustments like Scale to Budget.' })}
        </p>
      </div>
    </div>
  );
}
