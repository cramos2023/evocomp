import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, AlertTriangle, Info, Loader2, Gauge, ChevronDown, ChevronUp, Activity, CheckCircle2, ChevronRight, Calculator, FileText, CheckCircle, AlertCircle, History } from 'lucide-react';
import type { JDVersion, AdvisoryLog } from '../types/jd';
import { jdService } from '../services/jdService';

interface AdvisoryCardProps {
  version: Partial<JDVersion> | null;
  onRunAdvisory: () => Promise<void>;
  isBuilderMode?: boolean; // If true, implies unsaved changes could exist
}

export function AdvisoryCard({ version, onRunAdvisory, isBuilderMode = false }: AdvisoryCardProps) {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [advisoryLog, setAdvisoryLog] = useState<AdvisoryLog | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [levelMappings, setLevelMappings] = useState<any[]>([]);
  
  useEffect(() => {
    jdService.getClassificationLevelMappings().then(setLevelMappings).catch(console.error);
  }, []);

  const bp = 'pages.job_description.advisor';

  const hasScore = !!version?.advisory_classification_level;
  const isBlocked = !version?.career_level;
  
  // Calculate if stale
  let isStale = false;
  if (hasScore && version?.advisory_run_at && version?.updated_at) {
    const runTime = new Date(version.advisory_run_at).getTime();
    const updateTime = new Date(version.updated_at).getTime();
    isStale = updateTime > (runTime + 5000);
  }

  useEffect(() => {
    if (hasScore && version?.id) {
      loadAdvisoryLog();
    } else {
      setAdvisoryLog(null);
    }
  }, [version?.id, hasScore, version?.advisory_run_at]);

  const loadAdvisoryLog = async () => {
    if (!version?.id) return;
    setLoadingLog(true);
    try {
      const log = await jdService.getAdvisoryLog(version.id);
      setAdvisoryLog(log);
    } catch (err) {
      console.error('Failed to load advisory log:', err);
    } finally {
      setLoadingLog(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      await onRunAdvisory();
      // Reload log after run
      setTimeout(loadAdvisoryLog, 1500);
    } finally {
      setRunning(false);
    }
  };

  const renderConfidenceBadge = (label?: string) => {
    if (!label) return null;
    const l = label.toUpperCase();
    if (l === 'HIGH') return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs border border-emerald-500/30 font-medium">{t(`${bp}.high_confidence`)}</span>;
    if (l === 'MEDIUM') return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs border border-amber-500/30 font-medium">{t(`${bp}.medium_confidence`)}</span>;
    return <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 text-xs border border-red-500/30 font-medium">{t(`${bp}.low_confidence`)}</span>;
  };

  // Guidance logic
  const guidanceMessages: string[] = [];
  const warnings = advisoryLog?.output_json?.warnings || [];
  if (warnings.length > 0) {
    if (warnings.includes('GEO_DEFAULTED')) guidanceMessages.push(t(`${bp}.guidance.geo_inferred`));
    if (warnings.includes('COMPLEXITY_DEFAULTED')) guidanceMessages.push(t(`${bp}.guidance.problem_solving_defaulted`));
    if (warnings.includes('EXPERIENCE_DEFAULTED')) guidanceMessages.push(t(`${bp}.guidance.experience_inferred`));
  }

  const getMappedLabel = (internalLevel?: string) => {
    if (!internalLevel || internalLevel.trim() === '') return t(`${bp}.mapping.not_available`, 'Not available');
    const mapping = levelMappings.find(m => m.internal_level === internalLevel);
    if (mapping) return `${mapping.client_level} (${mapping.client_label})`;
    return internalLevel;
  };

  const getMappedBand = (band?: string) => {
    if (!band || band.trim() === '') return t(`${bp}.mapping.not_available`, 'Not available');
    return band;
  };

  return (
    <div className="p-5 bg-[rgb(var(--surface-card))]/70 border border-indigo-500/30 dark:border-emerald-500/30 rounded-xl relative overflow-hidden transition-all duration-300">
      {/* Decorative gradient background element */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 dark:bg-emerald-500/10 rounded-lg">
            <Brain className="w-5 h-5 text-indigo-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-[rgb(var(--text-primary))]">
            {t(`${bp}.title`)}
          </h3>
        </div>

        {/* Action Button */}
        {!isBlocked && (
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-emerald-600 hover:bg-indigo-500 dark:hover:bg-emerald-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gauge className="w-4 h-4" />}
            {running ? t(`${bp}.running`) : t(`${bp}.trigger`)}
          </button>
        )}
      </div>

      <p className="text-sm text-[rgb(var(--text-secondary))] mb-5 relative z-10">
        {t(`${bp}.description`)}
      </p>

      {/* Warnings */}
      {isBlocked ? (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <span className="text-sm text-amber-700 font-medium">{t(`${bp}.blocked_warning`)}</span>
        </div>
      ) : isStale && hasScore ? (
        <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-start gap-2">
          <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <span className="text-sm text-indigo-700 font-medium">{t(`${bp}.stale_warning`)}</span>
        </div>
      ) : null}

      {/* Guidance Messages */}
      {guidanceMessages.map((msg, i) => (
        <div key={i} className="mb-3 p-2 bg-indigo-500/5 border border-indigo-500/10 rounded flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs text-indigo-700 font-medium">{msg}</span>
        </div>
      ))}

      {/* Results */}
      {hasScore && (
        <div className={`space-y-4 relative z-10 ${isStale ? 'opacity-60 grayscale-[30%]' : ''}`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] rounded-lg">
              <span className="block text-xs text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.level`)}</span>
              <span className="text-xl font-bold text-indigo-600 dark:text-emerald-400">{getMappedLabel(version.advisory_classification_level)}</span>
            </div>
            <div className="p-3 bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] rounded-lg">
              <span className="block text-xs text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.band`)}</span>
              <span className="text-sm font-medium text-[rgb(var(--text-primary))]">{version.advisory_band_reference}</span>
            </div>
            <div className="p-3 bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] rounded-lg">
              <span className="block text-xs text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.score`)}</span>
              <span className="text-xl font-bold text-[rgb(var(--text-primary))]">{version.advisory_job_size_score}</span>
            </div>
            <div className="p-3 bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] rounded-lg">
              <span className="block text-xs text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.confidence`)}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold text-[rgb(var(--text-primary))]">{version.advisory_confidence_score}</span>
                {renderConfidenceBadge(version.advisory_confidence_label)}
              </div>
            </div>
          </div>

          {/* Trace Expandable */}
          {advisoryLog && (
            <div className="border-t border-indigo-500/10 pt-4">
              <button 
                onClick={() => setShowTrace(!showTrace)}
                className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-emerald-400 hover:text-indigo-500 dark:hover:text-emerald-300 transition-colors"
              >
                {showTrace ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {t(`${bp}.show_trace`)}
              </button>

              {showTrace && (
                <div className="mt-4 space-y-6 animate-in slide-in-from-top-1 duration-200">
                  {/* Signals */}
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> {t(`${bp}.trace.signals_title`)}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {['S', 'D', 'L', 'B', 'G', 'P', 'E'].map(sig => {
                        const val = advisoryLog.output_json?.dimensions?.[sig] || 0;
                        return (
                          <div key={sig} className="px-2 py-1 bg-indigo-500/5 dark:bg-emerald-500/5 border border-indigo-500/10 dark:border-emerald-500/10 rounded flex items-center gap-1.5 min-w-[3rem]">
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-emerald-400">{sig}</span>
                            <span className="text-xs text-[rgb(var(--text-primary))] font-medium">{val}</span>
                            {advisoryLog && warnings.includes(sig === 'G' ? 'GEO_DEFAULTED' : sig === 'P' ? 'COMPLEXITY_DEFAULTED' : sig === 'E' ? 'EXPERIENCE_DEFAULTED' : 'NONE') && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-in fade-in zoom-in duration-300 font-medium">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                {t(`${bp}.guidance.${sig === 'G' ? 'geo_inferred' : sig === 'P' ? 'problem_solving_defaulted' : 'experience_inferred'}`, 'Data was inferred')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Calculations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">
                        {t(`${bp}.trace.breakdown_title`)}
                      </h4>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[rgb(var(--text-secondary))]">{t(`${bp}.trace.base_score`)}</span>
                          <span className="font-mono text-[rgb(var(--text-primary))]">{advisoryLog.output_json?.scoring?.base_weighted?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[rgb(var(--text-secondary))]">{t(`${bp}.trace.normalization`)}</span>
                          <span className="font-mono text-[rgb(var(--text-primary))]">{advisoryLog.output_json?.scoring?.normalization?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs pb-1 border-b border-indigo-500/10">
                          <span className="text-[rgb(var(--text-secondary))]">{t(`${bp}.trace.adjustments`)}</span>
                          <span className="font-mono text-[rgb(var(--text-primary))]">{advisoryLog.output_json?.scoring?.adjustments?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1 font-bold text-indigo-600 dark:text-emerald-400">
                          <span>{t(`${bp}.trace.final_score`)}</span>
                          <span className="font-mono">{advisoryLog.output_json?.scoring?.final_score?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">
                        {t(`${bp}.trace.mapping_title`)}
                      </h4>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[rgb(var(--text-secondary))]">{t(`${bp}.trace.mapped_level`)}</span>
                          <span className="text-indigo-600 dark:text-emerald-400 font-bold">{getMappedLabel(advisoryLog.output_json?.recommendation?.classification_level)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[rgb(var(--text-secondary))]">{t(`${bp}.trace.mapped_band`)}</span>
                          <span className="text-[rgb(var(--text-primary))] font-medium">{getMappedBand(advisoryLog.output_json?.recommendation?.band_reference)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

