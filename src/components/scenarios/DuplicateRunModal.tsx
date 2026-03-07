import React, { useState } from 'react';
import { X, Copy, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';

interface DuplicateRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioId: string;
  sourceRunId: string;
  onSuccess: (newRunId: string) => void;
}

export function DuplicateRunModal({ isOpen, onClose, scenarioId, sourceRunId, onSuccess }: DuplicateRunModalProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDuplicate = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('duplicate-scenario-run', {
        body: { scenario_id: scenarioId, source_run_id: sourceRunId },
      });

      if (fnError) {
        // Extract detailed error info from FunctionsHttpError
        const status = (fnError as any).status ?? (fnError as any).context?.status ?? 'unknown';
        let bodyMsg = fnError.message || 'Unknown error';
        try {
          const ctx = (fnError as any).context;
          if (ctx) {
            const bodyText = await ctx.text?.();
            if (bodyText) {
              const parsed = JSON.parse(bodyText);
              bodyMsg = parsed?.message || parsed?.error || bodyText;
            }
          }
        } catch (_) { /* use message as-is */ }
        console.error(`[DuplicateRunModal] fn error status=${status}:`, fnError);
        throw new Error(`[HTTP ${status}] ${bodyMsg}`);
      }
      // Edge fn returns { ok, new_run_id } on success or { ok: false, message } on error
      if (!data?.ok) throw new Error(data?.message || 'Duplicate failed: edge function returned ok=false');

      if (data?.new_run_id) {

        onSuccess(data.new_run_id);
      } else {
        throw new Error('Invalid response from duplication service');
      }
    } catch (err: any) {
      console.error('Duplication error:', err);
      setError(err.message || 'Failed to duplicate the run.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
        onClick={() => !isSubmitting && onClose()}
      />

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Copy className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Duplicate Run</h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-slate-600 mb-6">
            Are you sure you want to duplicate this run? A new editable draft run will be created with all current input values. This allows you to model changes without affecting the original run.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Duplicating...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Confirm Duplicate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
