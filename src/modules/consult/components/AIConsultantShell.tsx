import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';

interface AIConsultantShellProps {
  children: React.ReactNode;
}

const AIConsultantShell: React.FC<AIConsultantShellProps> = ({ children }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full bg-[rgb(var(--surface-main))] text-[rgb(var(--text-primary))] font-sans overflow-hidden">
      {/* Premium Header */}
      <header className="h-[72px] px-8 border-b border-[rgba(var(--accent-emerald),0.1)] flex items-center justify-between shrink-0 bg-[rgba(var(--surface-card),0.3)] backdrop-blur-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[rgb(var(--accent-emerald))]" />
            <h1 className="text-xl font-bold tracking-tight uppercase">
              {t('workspace_hub.pillars.consult.title')}
            </h1>
          </div>
          <p className="text-[11px] text-[rgba(var(--text-secondary),0.7)] uppercase tracking-widest font-mono">
            {t('workspace_hub.pillars.consult.desc')}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-[rgba(var(--accent-emerald),0.1)] border border-[rgba(var(--accent-emerald),0.2)] rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent-emerald))] animate-pulse" />
            <span className="text-[10px] font-mono text-[rgb(var(--accent-emerald))] uppercase tracking-tighter">
              {t('workspace_hub.header.badge')}
              </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative">
        {children}
      </div>
    </div>
  );
};

export default AIConsultantShell;
