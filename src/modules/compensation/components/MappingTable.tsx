import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Trash2, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { CompMapping } from '../types';

interface Props {
  mappings: CompMapping[];
  onEdit: (mapping: CompMapping) => void;
  onDeactivate: (id: string) => void;
  loading?: boolean;
}

const MappingTable: React.FC<Props> = ({ mappings, onEdit, onDeactivate, loading }) => {
  const { t } = useTranslation();
  const [filterActive, setFilterActive] = React.useState<boolean | 'all'>('all');

  const filteredMappings = mappings.filter(m => {
    if (filterActive === 'all') return true;
    return m.is_active === filterActive;
  });

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-[rgb(var(--bg-surface-2))] rounded-2xl w-full" />
        ))}
      </div>
    );
  }

  if (mappings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[rgb(var(--bg-surface))] rounded-[var(--radius-card)] border border-dashed border-[rgb(var(--border))]">
        <Filter className="w-12 h-12 text-[rgb(var(--text-muted))] mb-4" />
        <p className="text-[rgb(var(--text-secondary))] font-bold">{t('compensation.mappings.empty', 'No mappings found')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Table Filter Bar */}
      <div className="flex justify-end gap-2">
        <button 
          onClick={() => setFilterActive('all')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterActive === 'all' ? 'bg-[rgb(var(--primary))] text-white' : 'bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-3))]'}`}
        >
          {t('compensation.mappings.filter.all', 'ALL')}
        </button>
        <button 
          onClick={() => setFilterActive(true)}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterActive === true ? 'bg-emerald-500 text-white' : 'bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-3))]'}`}
        >
          {t('compensation.mappings.filter.active', 'ACTIVE')}
        </button>
        <button 
          onClick={() => setFilterActive(false)}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterActive === false ? 'bg-slate-400 text-white' : 'bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-3))]'}`}
        >
          {t('compensation.mappings.filter.inactive', 'INACTIVE')}
        </button>
      </div>

      <div className="bg-[rgb(var(--bg-surface))] rounded-[var(--radius-card)] border border-[rgb(var(--border))] overflow-hidden shadow-[var(--shadow-sm)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[rgb(var(--bg-surface-2))] border-b border-[rgb(var(--border))]">
              <th className="px-6 py-4 text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{t('compensation.mappings.columns.internal_level', 'Internal Level')}</th>
              <th className="px-6 py-4 text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{t('compensation.mappings.columns.job_family_group', 'Family Group')}</th>
              <th className="px-6 py-4 text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{t('compensation.mappings.columns.pay_grade', 'Market Grade')}</th>
              <th className="px-6 py-4 text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{t('compensation.mappings.columns.status', 'Status')}</th>
              <th className="px-6 py-4 text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest text-right">{t('compensation.mappings.columns.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--border))]">
            {filteredMappings.map((mapping) => (
              <tr key={mapping.id} className="hover:bg-[rgb(var(--bg-surface-2))] transition-colors group">
                <td className="px-6 py-5 font-black text-[rgb(var(--text-primary))] text-sm italic">{mapping.internal_level}</td>
                <td className="px-6 py-5">
                  <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase tracking-tight">
                    {mapping.job_family_group}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="w-10 h-10 bg-[rgba(var(--primary-rgb),0.1)] border border-[rgba(var(--primary-rgb),0.2)] rounded-xl flex items-center justify-center text-[rgb(var(--primary))] font-black text-sm">
                    {mapping.pay_grade}
                  </div>
                </td>
                <td className="px-6 py-5">
                  {mapping.is_active ? (
                    <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                      <CheckCircle2 className="w-3 h-3" />
                      {t('compensation.mappings.status.active', 'Active')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <XCircle className="w-3 h-3" />
                      {t('compensation.mappings.status.inactive', 'Inactive')}
                    </div>
                  )}
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(mapping)}
                      className="p-2 bg-white border border-[rgb(var(--border))] rounded-lg text-slate-400 hover:text-[rgb(var(--primary))] hover:border-[rgb(var(--primary))] transition-all shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {mapping.is_active && (
                      <button 
                        onClick={() => onDeactivate(mapping.id)}
                        className="p-2 bg-white border border-[rgb(var(--border))] rounded-lg text-slate-400 hover:text-red-500 hover:border-red-500 transition-all shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MappingTable;
