import React from 'react';
import { ChevronUp, ChevronDown, ListTree, Database, Cpu, FileJson, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AIEvidenceDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
}

const AIEvidenceDrawer: React.FC<AIEvidenceDrawerProps> = ({ isOpen, onToggle }) => {
  const { t } = useTranslation();
  return (
    <div 
      className={`absolute bottom-0 left-0 right-0 bg-[rgba(10,10,12,0.95)] backdrop-blur-3xl border-t border-[rgba(255,255,255,0.1)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-50 overflow-hidden ${
        isOpen ? 'h-[320px]' : 'h-12'
      }`}
    >
      {/* Drawer Header (Click area to toggle) */}
      <div 
        onClick={onToggle}
        className="h-12 px-8 flex items-center justify-between cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors group"
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[rgb(var(--accent-emerald))]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[rgb(var(--accent-emerald))]">
              {t('consult.evidence_drawer.title')}
            </span>
          </div>
          
           {!isOpen && (
            <div className="flex items-center gap-4 animate-in fade-in duration-500">
               <div className="flex items-center gap-1.5 opacity-40">
                  <Cpu className="w-3 h-3" />
                  <span className="text-[10px] font-mono uppercase tracking-tighter">{t('consult.evidence_drawer.tools')}: get_comp_diagnostics, get_equity_risk</span>
               </div>
               <div className="w-1 h-1 rounded-full bg-gray-700" />
               <div className="flex items-center gap-1.5 opacity-40">
                  <Database className="w-3 h-3" />
                  <span className="text-[10px] font-mono uppercase tracking-tighter">{t('consult.evidence_drawer.bundle')}: EBB-7f2a-m1</span>
               </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[rgba(var(--text-secondary),0.4)] group-hover:text-[rgba(var(--text-secondary),0.7)]">
            {isOpen ? t('consult.evidence_drawer.collapse') : t('consult.evidence_drawer.expand')}
          </span>
          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-8 h-[calc(320px-48px)] overflow-y-auto border-t border-[rgba(255,255,255,0.05)] grid grid-cols-4 gap-8 animate-in slide-in-from-bottom-2 duration-500">
          
          {/* Tool usage trace */}
          <div className="space-y-4">
             <label className="text-[10px] font-mono text-[rgba(var(--text-secondary),0.6)] uppercase tracking-[0.2em] flex items-center gap-2">
                <Cpu className="w-3 h-3" /> {t('consult.evidence_drawer.tool_trace')}
             </label>
             <div className="space-y-2">
                {[
                  { name: 'get_comp_diagnostics', time: '142ms', status: 'OK' },
                  { name: 'get_equity_risk', time: '89ms', status: 'OK' },
                  { name: 'run_simulation', time: '210ms', status: 'OK' }
                ].map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-[rgba(255,255,255,0.02)] rounded-lg text-[10px] font-mono">
                    <span className="text-[rgb(var(--accent-blue))]">{t.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="opacity-40">{t.time}</span>
                      <span className="text-[rgb(var(--accent-emerald))]">{t.status}</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Source Data Summary */}
          <div className="space-y-4">
             <label className="text-[10px] font-mono text-[rgba(var(--text-secondary),0.6)] uppercase tracking-[0.2em] flex items-center gap-2">
                <Database className="w-3 h-3" /> {t('consult.evidence_drawer.engine_sources')}
             </label>
             <div className="space-y-1">
                <p className="text-[10px] font-mono text-[rgba(255,255,255,0.5)]">• snapshot_employee_data (154 rows)</p>
                <p className="text-[10px] font-mono text-[rgba(255,255,255,0.5)]">• market_pay_data (USA Reference)</p>
                <p className="text-[10px] font-mono text-[rgba(255,255,255,0.5)]">• pay_bands (Tenant active set)</p>
             </div>
          </div>

          {/* Logic Tree / Graph Preview */}
          <div className="space-y-4">
             <label className="text-[10px] font-mono text-[rgba(var(--text-secondary),0.6)] uppercase tracking-[0.2em] flex items-center gap-2">
                <ListTree className="w-3 h-3" /> {t('consult.evidence_drawer.reasoning_chain')}
             </label>
             <div className="p-3 border border-[rgba(255,255,255,0.1)] rounded-xl bg-black/20">
                <div className="space-y-2 opacity-50 select-none">
                   <div className="w-full h-1.5 bg-gray-800 rounded-full" />
                   <div className="w-[80%] h-1.5 bg-gray-800 rounded-full" />
                   <div className="w-[60%] h-1.5 bg-gray-800 rounded-full" />
                </div>
                <p className="mt-3 text-[9px] font-mono uppercase tracking-tighter text-center italic text-gray-600">
                  {t('consult.evidence_drawer.visual_pending')}
                </p>
             </div>
          </div>

          {/* Raw Payload Tab */}
          <div className="space-y-4">
             <label className="text-[10px] font-mono text-[rgba(var(--text-secondary),0.6)] uppercase tracking-[0.2em] flex items-center gap-2">
                <FileJson className="w-3 h-3" /> {t('consult.evidence_drawer.structured_payload')}
             </label>
             <div className="bg-black/40 border border-[rgba(255,255,255,0.05)] rounded-xl h-[180px] p-3 overflow-hidden">
                <pre className="text-[9px] font-mono text-[rgba(var(--accent-emerald),0.7)] leading-tight">
                  {`{
  "bundle_id": "EBB-7f2a-m1",
  "sources": [
    { "type": "DIAGNOSTICS", "count": 1 },
    { "type": "STRUCTURE", "count": 2 }
  ],
  "confidence": 0.84,
  "audit_ref": "AC-2026-03-12-001"
}`}
                </pre>
             </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AIEvidenceDrawer;
