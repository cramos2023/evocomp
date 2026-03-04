import React, { useState, useEffect } from 'react';
import { X, DollarSign, Percent, AlertCircle } from 'lucide-react';
import type { BudgetConfig, BudgetMode } from '../../types/budget';

interface BudgetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BudgetConfig;
  onSave: (config: BudgetConfig) => void;
  isSaving: boolean;
}

export function BudgetConfigModal({ isOpen, onClose, config, onSave, isSaving }: BudgetConfigModalProps) {
  const [mode, setMode] = useState<BudgetMode>(config.mode);
  const [percentCap, setPercentCap] = useState<string>((config.percent_cap * 100).toFixed(1));
  const [fixedCap, setFixedCap] = useState<string>(config.fixed_cap_local.toString());

  useEffect(() => {
    if (isOpen) {
      setMode(config.mode);
      setPercentCap((config.percent_cap * 100).toFixed(1));
      setFixedCap(config.fixed_cap_local.toString());
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSave = () => {
    const pct = parseFloat(percentCap) / 100;
    const fixed = parseFloat(fixedCap) || 0;
    onSave({
      mode,
      percent_cap: isNaN(pct) ? 0.03 : Math.max(0, Math.min(1, pct)),
      fixed_cap_local: Math.max(0, fixed),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !isSaving && onClose()} />

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Budget Cap</h2>
          </div>
          <button onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mode selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cap Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('percent')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  mode === 'percent' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Percent className="w-4 h-4" />
                % of Total Base
              </button>
              <button
                type="button"
                onClick={() => setMode('fixed')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  mode === 'fixed' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Fixed Amount
              </button>
            </div>
          </div>

          {/* Percent input */}
          {mode === 'percent' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Budget as % of Total Guaranteed
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={percentCap}
                  onChange={e => setPercentCap(e.target.value)}
                  className="w-full h-12 px-4 pr-12 border border-slate-200 rounded-xl text-lg font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="3.0"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Cap = sum(total_guaranteed_local) × {percentCap || '0'}%
              </p>
            </div>
          )}

          {/* Fixed amount input */}
          {mode === 'fixed' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Fixed Cap (Local Currency)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={fixedCap}
                  onChange={e => setFixedCap(e.target.value)}
                  className="w-full h-12 pl-8 pr-4 border border-slate-200 rounded-xl text-lg font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="100000"
                />
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
            <strong>Spent formula:</strong> per employee = (calc_total_increase_local ?? calc_merit_increase_amount_local ?? 0) + (input_lump_sum_local ?? 0)
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-xl disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <DollarSign className="w-4 h-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Budget Cap'}
          </button>
        </div>
      </div>
    </div>
  );
}
