import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, Search, Eye, EyeOff, AlertTriangle, Link2, ArrowRight } from 'lucide-react';

interface ColumnRow {
  id: string;
  column_key: string;
  label: string;
  data_type: string;
  is_active: boolean;
  depends_on: string[];
  formula_dsl: string | null;
}

interface ManageColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  onColumnsChanged: () => void;
}

export const ManageColumnsModal: React.FC<ManageColumnsModalProps> = ({
  isOpen, onClose, datasetId, onColumnsChanged
}) => {
  const [columns, setColumns] = useState<ColumnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) fetchColumns();
  }, [isOpen]);

  async function fetchColumns() {
    setLoading(true);
    const { data } = await supabase
      .from('column_definitions')
      .select('id, column_key, label, data_type, is_active, depends_on, formula_dsl')
      .eq('dataset_id', datasetId)
      .order('column_key', { ascending: true });
    setColumns((data || []) as ColumnRow[]);
    setLoading(false);
  }

  // Compute "blocked by" (who depends on me) client-side
  const blockedByMap = useMemo(() => {
    const map = new Map<string, string[]>();
    const activeCols = columns.filter(c => c.is_active);
    for (const col of columns) {
      const dependents = activeCols
        .filter(c => c.depends_on?.includes(col.column_key) && c.column_key !== col.column_key)
        .map(c => c.label || c.column_key);
      map.set(col.column_key, dependents);
    }
    return map;
  }, [columns]);

  // Sort: inputs first, then calcs, then rest
  const sortedColumns = useMemo(() => {
    const sorted = [...columns].sort((a, b) => {
      const aGroup = a.column_key.startsWith('input_') ? 0 : a.column_key.startsWith('calc_') ? 1 : 2;
      const bGroup = b.column_key.startsWith('input_') ? 0 : b.column_key.startsWith('calc_') ? 1 : 2;
      if (aGroup !== bGroup) return aGroup - bGroup;
      return a.column_key.localeCompare(b.column_key);
    });
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(c =>
      c.label.toLowerCase().includes(q) || c.column_key.toLowerCase().includes(q)
    );
  }, [columns, search]);

  const handleToggle = async (col: ColumnRow) => {
    setToggleError(null);
    setTogglingId(col.id);

    // If disabling, check dependents
    if (col.is_active) {
      const dependents = blockedByMap.get(col.column_key) || [];
      if (dependents.length > 0) {
        const shown = dependents.slice(0, 3).map(d => `'${d}'`).join(', ');
        const extra = dependents.length > 3 ? ` and ${dependents.length - 3} more` : '';
        setToggleError(`Cannot disable: ${shown}${extra} depend${dependents.length === 1 ? 's' : ''} on this column.`);
        setTogglingId(null);
        return;
      }
    }

    const { error } = await supabase
      .from('column_definitions')
      .update({ is_active: !col.is_active })
      .eq('id', col.id);

    setTogglingId(null);
    if (error) {
      setToggleError(error.message);
    } else {
      await fetchColumns();
      onColumnsChanged();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Manage Columns</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by label or key..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {toggleError && (
          <div className="mx-6 mt-3 p-3 rounded-xl text-sm border bg-amber-50 border-amber-200 text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>{toggleError}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading...</div>
          ) : sortedColumns.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No columns found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3 font-bold">Label / Key</th>
                  <th className="px-4 py-3 font-bold">Type</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Dependencies</th>
                  <th className="px-4 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedColumns.map(col => {
                  const deps = col.depends_on || [];
                  const blockedBy = blockedByMap.get(col.column_key) || [];
                  return (
                    <tr key={col.id} className={`hover:bg-slate-50/50 ${!col.is_active ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-3">
                        <p className="font-bold text-slate-900">{col.label}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{col.column_key}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase">{col.data_type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                          {col.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500 space-y-0.5">
                        {deps.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <ArrowRight className="w-3 h-3 text-blue-400 shrink-0" />
                            {deps.slice(0, 3).map(d => (
                              <span key={d} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-mono text-[9px]">{d}</span>
                            ))}
                            {deps.length > 3 && <span className="text-slate-400">+{deps.length - 3}</span>}
                          </div>
                        )}
                        {blockedBy.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Link2 className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-amber-600 text-[9px]">
                              Used by: {blockedBy.slice(0, 2).join(', ')}{blockedBy.length > 2 ? ` +${blockedBy.length - 2}` : ''}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggle(col)}
                          disabled={togglingId === col.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 ${
                            col.is_active
                              ? 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                              : 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {col.is_active ? <><EyeOff className="w-3.5 h-3.5" /> Disable</> : <><Eye className="w-3.5 h-3.5" /> Enable</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-400">
          {columns.filter(c => c.is_active).length} active · {columns.filter(c => !c.is_active).length} disabled · {columns.length} total
        </div>
      </div>
    </div>
  );
};
