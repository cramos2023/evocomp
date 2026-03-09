import React, { useEffect, useState } from 'react';
import { X, BookOpen, Layers, Settings, FileBox, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export type GuidePhase = 'prepareData' | 'buildScenario' | 'reviewPublish';

interface PayBandsGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhase?: GuidePhase;
}

const PHASE_ICONS: Record<string, React.ElementType> = {
  prepareData: FileBox,
  buildScenario: Settings,
  reviewPublish: CheckCircle2
};

export default function PayBandsGuideDrawer({ isOpen, onClose, initialPhase }: PayBandsGuideDrawerProps) {
  const { t } = useTranslation('guide');
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

  // If translation is missing or loading, we shouldn't crash, but TS types dictate string returns.
  const title = t('title', { defaultValue: 'Pay Bands Guide' });
  const subtitle = t('subtitle', { defaultValue: 'Build and publish market-aligned salary structures.' });

  // Dynamically extract phases from the translation object
  const rawPhases = t('phases', { returnObjects: true }) as any;
  const phases = rawPhases && typeof rawPhases === 'object' ? Object.entries(rawPhases) : [];

  const handleDeepLink = (path: string) => {
    onClose();
    // Allow animation to start before navigating
    setTimeout(() => {
      navigate(path);
    }, 150);
  };

  const getPathForCTA = (ctaText: string) => {
    // A robust mapping mechanism could map translation keys to paths, 
    // but a simple text matcher or explicit deep linking dictionary works here assuming standard CTAs.
    const text = ctaText.toLowerCase();
    if (text.includes('import')) return '/workspace/paybands/imports';
    if (text.includes('mapping')) return '/workspace/paybands/mappings';
    if (text.includes('scenario') || text.includes('cenário') || text.includes('escenario') || text.includes('scénario') || text.includes('szenario')) return '/workspace/paybands/builder/new';
    return '/workspace/paybands';
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
              const Icon = PHASE_ICONS[phaseKey] || Layers;
              const isExpanded = activePhase === phaseKey || (!activePhase && index === 0);
              const steps = phaseData.steps && typeof phaseData.steps === 'object' ? Object.entries(phaseData.steps) : [];

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
                    className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
                  >
                    <div className="p-5 pt-0 space-y-6">
                      <div className="w-full h-px bg-[rgb(var(--border))] mb-4" />
                      
                      {steps.map(([stepKey, stepData]: [string, any]) => (
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
                                  <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
                                  <span className="flex-1 leading-relaxed">{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {stepData.cta && (
                            <div className="pt-2">
                              <button 
                                onClick={() => handleDeepLink(getPathForCTA(stepData.cta))}
                                className="w-full py-2.5 px-4 bg-[rgb(var(--bg-surface-2))] hover:bg-[rgba(46,79,210,0.08)] border border-[rgb(var(--border))] hover:border-[rgba(46,79,210,0.2)] text-[rgb(var(--text-primary))] hover:text-[rgb(var(--primary))] transition-all text-xs font-black uppercase tracking-widest rounded-xl text-center flex items-center justify-center gap-2"
                              >
                                {stepData.cta} <span className="text-[14px]">→</span>
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
               onClick={() => handleDeepLink('/workspace/paybands/guide')}
               className="w-full flex justify-between items-center px-5 py-4 bg-[rgb(var(--primary))] text-white rounded-xl font-black text-sm uppercase tracking-wide hover:opacity-90 transition-opacity shadow-lg shadow-[rgba(46,79,210,0.2)]"
            >
              <span>{t('view_full_guide', { defaultValue: 'View Full Guide PDF/Doc' })}</span>
              <BookOpen className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
