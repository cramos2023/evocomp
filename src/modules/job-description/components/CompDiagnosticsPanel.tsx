import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Info,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert
} from 'lucide-react';
import { CompensationDiagnosticOutput } from '../types/comp';
import { compService } from '../services/compService';
import { CompReportModal } from './CompReportModal';

interface CompDiagnosticsPanelProps {
  scope: 'position' | 'employee';
  id: string;
  tenantId: string;
  isVisible: boolean;
  metadata?: {
    level: string;
    family: string;
    function: string;
    country: string;
  };
}

export function CompDiagnosticsPanel({ scope, id, tenantId, isVisible, metadata }: CompDiagnosticsPanelProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<CompensationDiagnosticOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const bp = 'modules.compensation.diagnostics';

  useEffect(() => {
    if (isVisible && id && tenantId) {
      handleRun();
    }
  }, [isVisible, id, tenantId]);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await compService.runDiagnostic(scope, id, tenantId, metadata);
      setData(result);
    } catch (err: any) {
      console.error('Failed to run comp diagnostics:', err);
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  const renderStatus = (status: string) => {
    const isHealthy = status === 'HEALTHY' || status === 'COMPETITIVE' || status === 'IN_RANGE_MID';
    const isWarning = status === 'OUTLIER' || status === 'LAGGING' || status === 'SEVERE_COMPRESSION' || status === 'PAY_INVERSION' || status === 'BELOW_BAND';
    
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        isHealthy ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
        isWarning ? 'bg-red-500/10 text-red-600 border-red-500/20' :
        'bg-amber-500/10 text-amber-600 border-amber-500/20'
      }`}>
        {t(`${bp}.statuses.${status}`)}
      </span>
    );
  };

  return (
    <div className="space-y-6 p-6 bg-[rgb(var(--surface-card))]/50 border border-[rgb(var(--border-primary))] dark:border-emerald-500/20 rounded-2xl backdrop-blur-sm shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 dark:bg-emerald-500/10 rounded-xl">
            <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[rgb(var(--text-primary))]">
              {t(`${bp}.title`)}
            </h3>
            <p className="text-xs text-[rgb(var(--text-muted))]">
              {t(`${bp}.subtitle`)}
            </p>
          </div>
        </div>
        
        {loading && <div className="animate-pulse flex items-center gap-2 text-xs text-indigo-600 font-medium">
          <Activity className="w-4 h-4 animate-spin" /> {t(`${bp}.running`)}
        </div>}
      </div>

      {error ? (
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Internal Equity */}
          <div className="p-4 bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-xl hover:border-indigo-500/30 dark:hover:border-emerald-500/30 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-4 h-4 text-indigo-500 dark:text-emerald-400" />
              {renderStatus(data.internal_equity.status)}
            </div>
            <span className="block text-[10px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-bold mb-1">{t(`${bp}.internal_equity`)}</span>
            <div className="text-xl font-bold text-[rgb(var(--text-primary))] flex items-baseline gap-1">
              {data.internal_equity.delta_percent > 0 ? '+' : ''}{data.internal_equity.delta_percent.toFixed(1)}%
              <span className="text-[10px] font-normal text-[rgb(var(--text-muted))] ml-1">{t(`${bp}.vs_peers`)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-[rgb(var(--text-muted))]">
              <span>n={data.internal_equity.sample_size} {t(`${bp}.peers`)}</span>
              <span className="capitalize">{data.internal_equity.peer_group_level}</span>
            </div>
          </div>

          {/* Band Fit */}
          <div className="p-4 bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-xl hover:border-indigo-500/30 dark:hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <Target className="w-4 h-4 text-indigo-500 dark:text-emerald-400" />
              {renderStatus(data.band_fit.status)}
            </div>
            <span className="block text-[10px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-bold mb-1">{t(`${bp}.band_fit`)}</span>
            <div className="text-xl font-bold text-[rgb(var(--text-primary))]">
              {(data.band_fit.compa_ratio * 100).toFixed(1)}%
              <span className="text-[10px] font-normal text-[rgb(var(--text-muted))] ml-1">Compa-Ratio</span>
            </div>
            <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-indigo-500 transition-all duration-500" 
                 style={{ width: `${Math.min(100, data.band_fit.range_penetration * 100)}%` }} 
               />
            </div>
          </div>

          {/* Market Alignment */}
          <div className="p-4 bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-xl hover:border-indigo-500/30 dark:hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-4 h-4 text-indigo-500 dark:text-emerald-400" />
              {renderStatus(data.market_alignment.status)}
            </div>
            <span className="block text-[10px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-bold mb-1">{t(`${bp}.market_gap`)}</span>
            <div className="text-xl font-bold text-[rgb(var(--text-primary))] flex items-baseline gap-1">
              {data.market_alignment.market_gap_percent > 0 ? '+' : ''}{data.market_alignment.market_gap_percent.toFixed(1)}%
              <span className="text-[10px] font-normal text-[rgb(var(--text-muted))] ml-1">{t(`${bp}.gap_vs_mid`)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-[rgb(var(--text-muted))]">
              <span className="flex items-center gap-1 uppercase font-bold text-[9px]">
                <ShieldAlert className="w-2.5 h-2.5" /> {data.market_alignment.match_type}
              </span>
              <span>{t(`${bp}.matched_p50`)}</span>
            </div>
          </div>

          {/* Compression Risk */}
          <div className="p-4 bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-xl hover:border-indigo-500/30 dark:hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <Activity className="w-4 h-4 text-indigo-500 dark:text-emerald-400" />
              {renderStatus(data.compression.risk_level)}
            </div>
            <span className="block text-[10px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-bold mb-1">{t(`${bp}.compression_risk`)}</span>
            <div className="text-xl font-bold text-[rgb(var(--text-primary))]">
              {data.compression.gap_percent.toFixed(1)}%
              <span className="text-[10px] font-normal text-[rgb(var(--text-muted))] ml-1">{t(`${bp}.manager_gap`)}</span>
            </div>
            <div className="mt-2 text-[10px] text-[rgb(var(--text-muted))]">
               {t(`${bp}.vs_reports`, { count: data.compression.subordinate_count })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-2xl bg-slate-50/30">
          <Info className="w-8 h-8 text-[rgb(var(--text-muted))] mb-3" />
          <p className="text-sm text-[rgb(var(--text-muted))] font-medium">{t(`${bp}.no_data`)}</p>
          <button 
            onClick={handleRun}
            className="mt-4 px-6 py-2 bg-indigo-600 dark:bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 dark:hover:bg-emerald-500 transition-colors shadow-lg shadow-indigo-500/20 dark:shadow-emerald-900/20"
          >
            {t(`${bp}.run_engine`)}
          </button>
        </div>
      )}

      {/* Primary Recommendation Footer */}
      {data && (
        <div className="mt-6 pt-6 border-t border-[rgb(var(--border-primary))] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
               <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-bold">{t(`${bp}.primary_recommendation`)}</span>
              <span className="text-sm font-bold text-[rgb(var(--text-primary))] transition-all">
                {t(`${bp}.recommendations.${data.primary_recommendation.type_code}`, data.primary_recommendation.type_code.replace(/_/g, ' '))}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 group text-sm font-bold text-indigo-600 dark:text-emerald-400 hover:text-indigo-500 dark:hover:text-emerald-300 transition-all"
          >
            {t(`${bp}.view_full_report`)} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      <CompReportModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={data}
      />
    </div>
  );
}
