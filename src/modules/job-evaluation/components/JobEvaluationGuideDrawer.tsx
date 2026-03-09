import React, { useEffect, useState } from 'react';
import { X, BookOpen, Layers, Settings, FileBox, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export type JobGuidePhase = 'orgContext' | 'evaluation' | 'results';

interface JobEvaluationGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhase?: JobGuidePhase;
}

const PHASE_ICONS: Record<string, React.ElementType> = {
  orgContext: Settings,
  evaluation: Layers,
  results: CheckCircle2
};

export default function JobEvaluationGuideDrawer({ isOpen, onClose, initialPhase }: JobEvaluationGuideDrawerProps) {
  const { t } = useTranslation('jobEvaluationGuide');
  const navigate = useNavigate();
  const [activePhase, setActivePhase] = useState<string | null>(initialPhase || null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialPhase) setActivePhase(initialPhase);
    } else {
      document.body.style.overflow = 'auto';
      // Add slight delay before resetting phase to allow animation to finish
      setTimeout(() => setActivePhase(null), 300);
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen, initialPhase]);

  const title = t('title', { defaultValue: 'Architecture & Evaluation Guide' });
  const subtitle = t('subtitle', { defaultValue: 'Analytical system for job classification.' });

  // Dynamically extract phases from the translation object
  const rawPhases = t('phases', { returnObjects: true }) as any;
  const phases = rawPhases && typeof rawPhases === 'object' ? Object.entries(rawPhases) : [];

  const handleDeepLink = (stepData: any) => {
    onClose();
    
    // Check if we have an anchor for internal scrolling
    if (stepData.anchor) {
      setTimeout(() => {
        const element = document.getElementById(stepData.anchor);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Highlight effect
          element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-4', 'transition-all');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-4');
          }, 2000);
        }
      }, 300);
      return;
    }

    // Fallback to route navigation
    const path = '/workspace/job-evaluation';
    setTimeout(() => {
      navigate(path);
    }, 150);
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
              <BookOpen className="w-6 h-6" />
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
          
          <div className="space-y-4">
            {phases.map(([phaseKey, phaseData]: [string, any], index: number) => {
              const Icon = PHASE_ICONS[phaseKey] || FileBox;
              const isExpanded = activePhase === phaseKey || (!activePhase && index === 0);
              const stepsList = phaseData.steps && typeof phaseData.steps === 'object' ? Object.entries(phaseData.steps) : [];

              return (
                <div key={phaseKey} className="border border-[rgb(var(--border))] rounded-2xl overflow-hidden bg-[rgb(var(--bg-surface))] shadow-sm transition-all duration-300">
                  {/* Phase Header (Accordion Toggle) */}
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
                      <p className="text-sm font-medium text-[rgb(var(--text-muted))] mt-1 leading-relaxed line-clamp-2">
                        {phaseData.description}
                      </p>
                    </div>
                  </button>

                  {/* Phase Content (Expanded) */}
                  <div 
                    className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
                  >
                    <div className="p-5 pt-0 space-y-6">
                      <div className="w-full h-px bg-[rgb(var(--border))] mb-4" />
                      
                      {stepsList.map(([stepKey, stepData]: [string, any]) => (
                        <div key={stepKey} className="space-y-3">
                          <h4 className="text-sm font-black text-[rgb(var(--text-primary))] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--primary))]"></span>
                            {stepData.title}
                          </h4>
                          <p className="text-sm font-medium text-[rgb(var(--text-secondary))] bg-[rgba(46,79,210,0.04)] p-3 rounded-lg border border-[rgba(46,79,210,0.08)]">
                            {stepData.summary}
                          </p>
                          
                          {Array.isArray(stepData.bullets) && stepData.bullets.length > 0 && (
                            <ul className="space-y-2 mt-2 ml-1">
                              {stepData.bullets.map((bullet: string, i: number) => (
                                <li key={i} className="text-sm font-medium text-[rgb(var(--text-muted))] flex items-start gap-2">
                                  <span className="text-indigo-500 mt-0.5 font-bold">✓</span>
                                  <span className="flex-1 leading-relaxed">{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {stepData.cta && (
                            <div className="pt-2">
                              <button 
                                onClick={() => handleDeepLink(stepData)}
                                className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 text-indigo-700 transition-all text-xs font-black uppercase tracking-widest rounded-xl text-center flex items-center justify-center gap-2 group/cta"
                              >
                                {stepData.cta} 
                                <span className="text-[14px] group-hover/cta:translate-x-1 transition-transform">→</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-[rgb(var(--border))]">
            <button
               onClick={() => {
                 onClose();
                 setTimeout(() => navigate('/workspace/job-evaluation/guide'), 150);
               }}
               className="w-full flex justify-between items-center px-5 py-4 bg-[rgb(var(--primary))] text-white rounded-xl font-black text-sm uppercase tracking-wide hover:opacity-90 transition-opacity shadow-lg shadow-[rgba(46,79,210,0.2)]"
            >
              <span>{t('view_full_guide', { defaultValue: 'View Full Onboarding' })}</span>
              <BookOpen className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
