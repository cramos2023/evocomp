import React, { useEffect, useState } from 'react';
import { X, BookOpen, Layers, Settings, CheckCircle2, HelpCircle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export type ScenariosGuidePhase = 'createScenario' | 'resultsAndAdjustments' | 'execution';

interface ScenariosGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhase?: ScenariosGuidePhase;
}

const PHASE_ICONS: Record<string, React.ElementType> = {
  createScenario: Layers,
  resultsAndAdjustments: Settings,
  execution: CheckCircle2
};

export default function ScenariosGuideDrawer({ isOpen, onClose, initialPhase }: ScenariosGuideDrawerProps) {
  const { t } = useTranslation('scenarios_guide');
  const navigate = useNavigate();
  const [activePhase, setActivePhase] = useState<string | null>(initialPhase || null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialPhase) setActivePhase(initialPhase);
    } else {
      document.body.style.overflow = 'auto';
      setTimeout(() => setActivePhase(null), 300);
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen, initialPhase]);

  const title = t('scenarios.guide.title', { defaultValue: 'Compensation Scenarios' });
  const subtitle = t('scenarios.guide.subtitle', { defaultValue: 'Model, distribute, and execute pay actions.' });

  const rawPhases = t('scenarios.guide.phases', { returnObjects: true }) as any;
  const phases = rawPhases && typeof rawPhases === 'object' ? Object.entries(rawPhases) : [];
  
  const rawGlossary = t('scenarios.guide.glossary', { returnObjects: true }) as any;
  const glossaryItems = rawGlossary && typeof rawGlossary === 'object' ? Object.entries(rawGlossary) : [];

  const handleDeepLink = (path: string) => {
    onClose();
    setTimeout(() => {
      navigate(path);
    }, 150);
  };

  const getPathForCTA = (ctaKey: string) => {
    if (ctaKey === 'go_to_scenarios') return '/app/comp/scenarios';
    // results and workbench routes typically require an ID, 
    // for general navigation we'll go to the list if ID is not available in context.
    // In a more advanced version, we could pass scenarioId to this component.
    return '/app/comp/scenarios';
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 z-[101] w-full max-w-md bg-[rgb(var(--bg-surface))] border-l border-[rgb(var(--border))] shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex-none p-6 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-surface-2))]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 text-[rgb(var(--primary))]">
              <HelpCircle className="w-6 h-6" />
              <h2 className="text-xl font-black tracking-tight">{title}</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-surface))] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm font-bold text-[rgb(var(--text-secondary))] leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Glossary Section */}
          <div className="bg-[rgba(var(--primary-rgb),0.05)] border border-[rgba(var(--primary-rgb),0.1)] rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--primary))] flex items-center gap-2">
              <Info className="w-4 h-4" />
              {t('scenarios.guide.glossary_title', { defaultValue: 'Key Concepts' })}
            </h3>
            <div className="space-y-2">
              {glossaryItems.map(([key, value]: [string, any]) => (
                <div key={key} className="text-xs font-medium text-[rgb(var(--text-secondary))] leading-snug">
                  {value}
                </div>
              ))}
            </div>
          </div>

          {/* Phases Accordion */}
          <div className="space-y-4">
            {phases.map(([phaseKey, phaseData]: [string, any], index: number) => {
              const Icon = PHASE_ICONS[phaseKey] || Layers;
              const isExpanded = activePhase === phaseKey || (!activePhase && index === 0);
              const steps = Array.isArray(phaseData.steps) ? phaseData.steps : [];

              return (
                <div key={phaseKey} className="border border-[rgb(var(--border))] rounded-2xl overflow-hidden bg-[rgb(var(--bg-surface))] shadow-sm transition-all duration-300">
                  <button 
                    onClick={() => setActivePhase(isExpanded ? null : phaseKey)}
                    className="w-full flex items-start gap-4 p-5 hover:bg-[rgb(var(--bg-surface-2))] transition-colors text-left"
                  >
                    <div className={`mt-0.5 shrink-0 ${isExpanded ? 'text-[rgb(var(--primary))]' : 'text-[rgb(var(--text-muted))]'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-base font-black tracking-tight ${isExpanded ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))]'}`}>
                        {phaseData.title}
                      </h3>
                      <p className="text-xs font-medium text-[rgb(var(--text-muted))] mt-1 leading-relaxed">
                        {phaseData.description}
                      </p>
                    </div>
                  </button>

                  <div 
                    className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
                  >
                    <div className="p-5 pt-0 space-y-4">
                      <div className="w-full h-px bg-[rgb(var(--border))] mb-4" />
                      
                      <ul className="space-y-3">
                        {steps.map((step: string, i: number) => (
                          <li key={i} className="text-sm font-medium text-[rgb(var(--text-secondary))] flex items-start gap-3">
                            <span className="text-[rgb(var(--primary))] font-black mt-0.5 shrink-0">{i + 1}.</span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-[rgb(var(--border))]">
            <button
               onClick={() => handleDeepLink('/app/comp/scenarios/guide')}
               className="w-full flex justify-between items-center px-5 py-4 bg-[rgb(var(--primary))] text-white rounded-xl font-black text-sm uppercase tracking-wide hover:opacity-90 transition-opacity shadow-lg shadow-[rgba(46,79,210,0.2)]"
            >
              <span>{t('view_full_guide', { defaultValue: 'View Immersive Guide' })}</span>
              <BookOpen className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
