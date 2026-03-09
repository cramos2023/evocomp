import React from 'react';
import { BookOpen, Layers, Settings, FileBox, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const PHASE_ICONS: Record<string, React.ElementType> = {
  orgContext: Settings,
  evaluation: Layers,
  results: CheckCircle2
};

export default function JobEvaluationGuidePage() {
  const { t } = useTranslation('jobEvaluationGuide');
  const navigate = useNavigate();

  const title = t('title', { defaultValue: 'Architecture & Evaluation Guide' });
  const subtitle = t('subtitle', { defaultValue: 'Analytical system for job classification and organizational design.' });
  const rawPhases = t('phases', { returnObjects: true }) as any;
  const phases = rawPhases && typeof rawPhases === 'object' ? Object.entries(rawPhases) : [];

  return (
    <div className="p-10 max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="mb-8">
        <button 
          onClick={() => navigate('/workspace/job-evaluation')}
          className="flex items-center gap-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] font-bold text-sm transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back_to_dashboard', { defaultValue: 'Back to Architecture & Evaluation' })}
        </button>
        <div className="flex items-center gap-4 text-[rgb(var(--primary))] mb-4">
          <BookOpen className="w-10 h-10" />
          <h1 className="text-4xl font-black tracking-tighter leading-none">{title}</h1>
        </div>
        <p className="text-[rgb(var(--text-secondary))] text-xl font-bold">{subtitle}</p>
      </div>

      <div className="space-y-12">
        {phases.map(([phaseKey, phaseData]: [string, any], index: number) => {
          const Icon = PHASE_ICONS[phaseKey] || Layers;
          const steps = phaseData.steps && typeof phaseData.steps === 'object' ? Object.entries(phaseData.steps) : [];

          return (
            <div key={phaseKey} className="bg-[rgb(var(--bg-surface))] rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-sm overflow-hidden mt-6">
              <div className="p-8 border-b border-[rgb(var(--border))] bg-gradient-to-r from-[rgba(46,79,210,0.05)] to-transparent flex items-center gap-4">
                <div className="w-14 h-14 bg-[rgb(var(--primary))] rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-[rgba(46,79,210,0.2)]">
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[rgb(var(--text-primary))] tracking-tight">{phaseData.title}</h2>
                  <p className="text-[rgb(var(--text-secondary))] font-bold mt-1">{phaseData.description}</p>
                </div>
              </div>

              <div className="p-8 space-y-10">
                {steps.map(([stepKey, stepData]: [string, any]) => (
                  <div key={stepKey} className="space-y-4">
                    <h3 className="text-lg font-black text-[rgb(var(--text-primary))] flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-[rgb(var(--primary))]"></span>
                      {stepData.title}
                    </h3>
                    <p className="text-[15px] font-medium text-[rgb(var(--text-secondary))] bg-[rgb(var(--bg-surface-2))] p-4 rounded-xl border border-[rgb(var(--border))]">
                      {stepData.summary}
                    </p>
                    
                    {Array.isArray(stepData.bullets) && stepData.bullets.length > 0 && (
                      <ul className="space-y-3 mt-4 ml-2">
                        {stepData.bullets.map((bullet: string, i: number) => (
                          <li key={i} className="text-[15px] font-medium text-[rgb(var(--text-muted))] flex items-start gap-3">
                            <span className="text-emerald-500 mt-1 font-black">✓</span>
                            <span className="flex-1 leading-relaxed">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
