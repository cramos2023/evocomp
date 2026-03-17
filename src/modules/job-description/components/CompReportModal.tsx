import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronDown, 
  ChevronRight, 
  BarChart3, 
  TrendingUp, 
  Target, 
  ShieldAlert,
  Info,
  History,
  Activity,
  Layout
} from 'lucide-react';
import { CompensationDiagnosticOutput } from '../types/comp';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalTitle, 
  ModalDescription, 
  ModalBody, 
  ModalFooter 
} from '@/components/ui/Modal';

interface CompReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CompensationDiagnosticOutput | null;
}

export function CompReportModal({ isOpen, onClose, data }: CompReportModalProps) {
  const { t } = useTranslation();
  const [showRaw, setShowRaw] = useState(false);
  const bp = 'modules.compensation.diagnostics';

  if (!data) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="xl" className="bg-slate-900 border-slate-800">
        
        {/* Header */}
        <ModalHeader className="border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <ModalTitle className="text-white">
                {t(`${bp}.modal.title`)}
              </ModalTitle>
              <ModalDescription className="flex items-center gap-4 mt-1 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5" />
                  {t(`${bp}.modal.scope`)}: <span className="text-slate-300 font-medium">{data.scope.toUpperCase()}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  {t(`${bp}.modal.run_at`)}: <span className="text-slate-300">{formatDate(data.metadata.run_at)}</span>
                </span>
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        {/* Content */}
        <ModalBody className="p-6 space-y-8 bg-slate-900/30 custom-scrollbar">
          
          {/* Main Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Internal Equity */}
            <section className="bg-slate-800/40 border border-slate-800/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4 text-slate-300 font-medium">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                {t(`${bp}.internal_equity`)}
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="text-sm text-slate-400">{t(`${bp}.modal.matching_source`)}</div>
                  <div className="text-sm font-medium text-white bg-slate-700/50 px-2 py-0.5 rounded">
                    {data.internal_equity.peer_group_level}
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-slate-700/50 pt-3">
                  <div className="text-sm text-slate-400">{t(`${bp}.peers`)}</div>
                  <div className="text-lg font-semibold text-white">
                    {data.internal_equity.sample_size}
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-slate-700/50 pt-3">
                  <div className="text-sm text-slate-400">{t(`${bp}.modal.median_peer`)} {t(`${bp}.matched_p50`)}</div>
                  <div className="text-lg font-semibold text-white">
                    {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(data.internal_equity.median_peer_salary)}
                  </div>
                </div>
                <div className="pt-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                    data.internal_equity.status === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    data.internal_equity.status === 'OUTLIER' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {t(`${bp}.statuses.${data.internal_equity.status}`)}
                  </span>
                </div>
              </div>
            </section>

            {/* Band Fit */}
            <section className="bg-slate-800/40 border border-slate-800/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4 text-slate-300 font-medium">
                <Target className="w-4 h-4 text-rose-400" />
                {t(`${bp}.band_fit`)}
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="text-sm text-slate-400">{t(`${bp}.modal.compa_ratio`)}</div>
                  <div className="text-xl font-bold text-white">{(data.band_fit.compa_ratio * 100).toFixed(1)}%</div>
                </div>
                <div className="flex justify-between items-end border-t border-slate-700/50 pt-3">
                  <div className="text-sm text-slate-400">{t(`${bp}.modal.range_penetration`)}</div>
                  <div className="text-lg font-semibold text-white">{(data.band_fit.range_penetration * 100).toFixed(1)}%</div>
                </div>
                <div className="pt-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                    data.band_fit.status === 'IN_RANGE_MID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    data.band_fit.status === 'BELOW_BAND' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    data.band_fit.status === 'ABOVE_BAND' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {t(`${bp}.statuses.${data.band_fit.status}`)}
                  </span>
                </div>
              </div>
            </section>

            {/* Market Alignment */}
            <section className="bg-slate-800/40 border border-slate-800/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4 text-slate-300 font-medium">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                {t(`${bp}.market_gap`)}
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="text-sm text-slate-400">{t(`${bp}.modal.market_benchmark`)}</div>
                  <div className="text-lg font-semibold text-white">
                    {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(data.market_alignment.benchmark_value)}
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-slate-700/50 pt-3">
                  <div className="text-sm text-slate-400">{t(`${bp}.gap_vs_mid`)}</div>
                  <div className={`text-lg font-bold ${data.market_alignment.market_gap_percent < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {data.market_alignment.market_gap_percent > 0 ? '+' : ''}{(data.market_alignment.market_gap_percent).toFixed(1)}%
                  </div>
                </div>
                <div className="pt-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                    data.market_alignment.status === 'COMPETITIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    data.market_alignment.status === 'LAGGING' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {t(`${bp}.statuses.${data.market_alignment.status}`)}
                  </span>
                </div>
              </div>
            </section>

            {/* Compression Risk */}
            <section className="bg-slate-800/40 border border-slate-800/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4 text-slate-300 font-medium">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                {t(`${bp}.compression_risk`)}
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="text-sm text-slate-400">{t(`${bp}.manager_gap`)}</div>
                  <div className={`text-lg font-bold ${data.compression.gap_percent < 0.1 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {(data.compression.gap_percent).toFixed(1)}%
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-slate-700/50 pt-3">
                  <div className="text-sm text-slate-400">{t(`${bp}.modal.scope`)} ({t(`${bp}.peers`)})</div>
                  <div className="text-lg font-semibold text-white">
                    {data.compression.subordinate_count}
                  </div>
                </div>
                <div className="pt-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                    data.compression.risk_level === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    data.compression.risk_level === 'WATCH' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    data.compression.risk_level === 'MODERATE_COMPRESSION' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {t(`${bp}.statuses.${data.compression.risk_level}`)}
                  </span>
                </div>
              </div>
            </section>

          </div>

          {/* Recommendation Section */}
          <section className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-400" />
              {t(`${bp}.primary_recommendation`)}
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 font-medium text-lg">
                  {t(`${bp}.recommendations.${data.primary_recommendation.type_code}`, data.primary_recommendation.type_code.replace(/_/g, ' '))}
                </p>
                <p className="text-indigo-300/70 text-sm mt-1">
                  {t(`${bp}.modal.priority_level`)}: {data.primary_recommendation.priority}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-lg font-bold ${
                data.primary_recommendation.priority <= 2 ? 'bg-rose-500/20 text-rose-400' :
                data.primary_recommendation.priority <= 5 ? 'bg-amber-500/20 text-amber-400' :
                'bg-indigo-500/20 text-indigo-400'
              }`}>
                P{data.primary_recommendation.priority}
              </div>
            </div>
          </section>

          {/* Raw JSON Collapsible */}
          <div className="border-t border-slate-800 pt-6">
            <button 
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showRaw ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {t(`${bp}.modal.raw_data`)}
            </button>
            {showRaw && (
              <div className="mt-4 bg-slate-950 p-4 rounded-lg overflow-x-auto border border-slate-800">
                <pre className="text-[10px] text-indigo-300/80 leading-relaxed">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
          </div>

        </ModalBody>

        {/* Footer */}
        <ModalFooter className="border-t border-slate-800 bg-slate-900/50">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-all"
          >
            {t(`${bp}.modal.close`)}
          </button>
        </ModalFooter>

      </ModalContent>
    </Modal>
  );
}
