import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, AlertCircle } from 'lucide-react';
import { CompMapping } from '../types';

interface Props {
  mapping: Partial<CompMapping> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (mapping: Partial<CompMapping>) => Promise<void>;
  saving: boolean;
  error: string | null;
}

const MappingFormDialog: React.FC<Props> = ({ mapping, isOpen, onClose, onSave, saving, error }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<CompMapping>>({
    internal_level: '',
    pay_grade: '',
    job_family_group: 'GLOBAL',
    band_structure_id: 'STANDARD',
    is_active: true
  });

  useEffect(() => {
    if (mapping) {
      setFormData(mapping);
    } else {
      setFormData({
        internal_level: '',
        pay_grade: '',
        job_family_group: 'GLOBAL',
        band_structure_id: 'STANDARD',
        is_active: true
      });
    }
  }, [mapping, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Dialog Body */}
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[rgb(var(--text-primary))]">
              {mapping?.id ? t('compensation.mappings.form.edit_title', 'Edit Mapping') : t('compensation.mappings.form.add_title', 'New Mapping')}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-bold leading-tight">
                {error === 'DUPLICATE_ACTIVE_MAPPING' 
                  ? t('compensation.mappings.errors.duplicate', 'An active mapping already exists for this level/family.')
                  : error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Internal Level */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  {t('compensation.mappings.form.internal_level', 'Internal Level')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.internal_level || ''}
                  onChange={e => setFormData(prev => ({ ...prev, internal_level: e.target.value }))}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black italic focus:border-[rgb(var(--primary))] focus:bg-white outline-none transition-all"
                  placeholder="e.g. M2.5 Senior Manager"
                />
              </div>

              {/* Pay Grade */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  {t('compensation.mappings.form.pay_grade', 'Market Pay Grade')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.pay_grade || ''}
                  onChange={e => setFormData(prev => ({ ...prev, pay_grade: e.target.value.toUpperCase() }))}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black italic focus:border-[rgb(var(--primary))] focus:bg-white outline-none transition-all"
                  placeholder="e.g. M"
                  maxLength={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {/* Family Group */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                    {t('compensation.mappings.form.family_group', 'Family Group')}
                  </label>
                  <select
                    value={formData.job_family_group || 'GLOBAL'}
                    onChange={e => setFormData(prev => ({ ...prev, job_family_group: e.target.value }))}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs focus:border-[rgb(var(--primary))] focus:bg-white outline-none transition-all"
                  >
                    <option value="GLOBAL">GLOBAL</option>
                  </select>
                </div>

                {/* Structure */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                    {t('compensation.mappings.form.structure', 'Structure')}
                  </label>
                  <select
                    value={formData.band_structure_id || 'STANDARD'}
                    onChange={e => setFormData(prev => ({ ...prev, band_structure_id: e.target.value }))}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs focus:border-[rgb(var(--primary))] focus:bg-white outline-none transition-all"
                  >
                    <option value="STANDARD">STANDARD</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[rgb(var(--primary))] text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-[rgba(var(--primary-rgb),0.3)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
              >
                <Save className="w-5 h-5" />
                {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save Mapping')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MappingFormDialog;
