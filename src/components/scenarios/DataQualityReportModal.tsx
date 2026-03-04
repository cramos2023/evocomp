import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, FileCheck, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface QualityReport {
  id: string;
  snapshot_id: string;
  total_rows: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  created_at: string;
  report: {
    missing_columns: string[];
    missing_values: Record<string, string>;
    derived_fields_status: Record<string, string>;
    impact_on_presets_v2: string[];
  };
}

interface DataQualityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotId: string;
}

export const DataQualityReportModal: React.FC<DataQualityReportModalProps> = ({
  isOpen, onClose, snapshotId
}) => {
  const [report, setReport] = useState<QualityReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && snapshotId) fetchReport();
  }, [isOpen, snapshotId]);

  async function fetchReport() {
    setLoading(true);
    const { data } = await supabase
      .from('snapshot_import_quality_reports')
      .select('*')
      .eq('snapshot_id', snapshotId)
      .maybeSingle();
    setReport(data as QualityReport | null);
    setLoading(false);
  }

  if (!isOpen) return null;

  const statusConfig = {
    PASS: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: CheckCircle, label: 'PASS — No data gaps' },
    WARN: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: AlertTriangle, label: 'WARN — Some fields missing' },
    FAIL: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: XCircle, label: 'FAIL — Critical fields missing' },
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-bold text-slate-900">Data Quality Report</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading...</div>
          ) : !report ? (
            <div className="p-12 text-center text-slate-400">
              <FileCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-500">No report available</p>
              <p className="text-sm">A data quality report will be generated when a snapshot is imported.</p>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              {(() => {
                const cfg = statusConfig[report.status];
                const Icon = cfg.icon;
                return (
                  <div className={`p-4 rounded-xl border ${cfg.bg} flex items-center gap-3`}>
                    <Icon className={`w-6 h-6 ${cfg.text}`} />
                    <div>
                      <p className={`font-bold ${cfg.text}`}>{cfg.label}</p>
                      <p className="text-sm text-slate-600">{report.total_rows} rows imported · {new Date(report.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Missing Columns */}
              {report.report.missing_columns.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">Missing Columns</h3>
                  <div className="flex flex-wrap gap-2">
                    {report.report.missing_columns.map(col => (
                      <span key={col} className="px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg text-[11px] font-mono text-red-700">{col}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Values */}
              {Object.keys(report.report.missing_values).length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">Missing Values (%)</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-100">
                      <th className="text-left py-2 text-[10px] uppercase text-slate-400 font-bold">Column</th>
                      <th className="text-right py-2 text-[10px] uppercase text-slate-400 font-bold">% Missing</th>
                    </tr></thead>
                    <tbody>
                      {Object.entries(report.report.missing_values).map(([col, pct]) => (
                        <tr key={col} className="border-b border-slate-50">
                          <td className="py-2 font-mono text-slate-700">{col}</td>
                          <td className={`py-2 text-right font-bold ${pct === '0.0%' ? 'text-green-600' : 'text-amber-600'}`}>{pct}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Derived Fields */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-2">Derived Fields</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(report.report.derived_fields_status).map(([field, status]) => (
                      <tr key={field} className="border-b border-slate-50">
                        <td className="py-2 font-mono text-slate-700">{field}</td>
                        <td className={`py-2 text-right font-bold ${status.includes('Not') ? 'text-red-500' : 'text-green-600'}`}>{status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Impact on Presets v2 */}
              {report.report.impact_on_presets_v2.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">Impact on Calculated Outputs</h3>
                  <ul className="space-y-1">
                    {report.report.impact_on_presets_v2.map((impact, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        {impact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
