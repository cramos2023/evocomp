import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Database, ArrowLeft, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { compService } from '../services/compService';
import { CompMapping } from '../types';
import MappingTable from '../components/MappingTable';
import MappingFormDialog from '../components/MappingFormDialog';

const MappingAdminPage: React.FC = () => {
  const { t } = useTranslation();
  const [mappings, setMappings] = useState<CompMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<CompMapping | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await compService.getMappings();
      setMappings(result);
    } catch (err) {
      console.error('Failed to fetch mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setSelectedMapping(null);
    setError(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (mapping: CompMapping) => {
    setSelectedMapping(mapping);
    setError(null);
    setIsDialogOpen(true);
  };

  const handleDeactivate = async (id: string) => {
    if (window.confirm(t('compensation.mappings.confirm_deactivate', 'Are you sure you want to deactivate this mapping?'))) {
      try {
        await compService.deactivateMapping(id);
        fetchData();
      } catch (err) {
        console.error('Failed to deactivate mapping:', err);
      }
    }
  };

  const handleSave = async (formData: Partial<CompMapping>) => {
    setSaving(true);
    setError(null);
    try {
      const { error: saveError } = await compService.saveMapping(formData);
      if (saveError) {
        setError(saveError);
      } else {
        setIsDialogOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to save mapping:', err);
      setError('Unknown error occurred');
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: mappings.length,
    active: mappings.filter(m => m.is_active).length,
    inactive: mappings.filter(m => !m.is_active).length,
  };

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="space-y-4">
          <Link 
            to="/workspace/compensation/intelligence"
            className="inline-flex items-center gap-2 text-[10px] font-black text-[rgb(var(--primary))] uppercase tracking-widest hover:translate-x-[-4px] transition-transform"
          >
            <ArrowLeft className="w-3 h-3" />
            {t('common.back_to_dashboard', 'Back to Dashboard')}
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter leading-none uppercase italic">
              {t('compensation.mappings.admin_title', 'Mapping Admin')}
            </h1>
            <span className="px-3 py-1 bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
              Phase 2.3B
            </span>
          </div>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-3 px-8 py-4 bg-[rgb(var(--primary))] text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-[rgba(var(--primary-rgb),0.3)] hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 font-black" />
          {t('compensation.mappings.add_cta', 'Add Mapping')}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{t('compensation.mappings.stats.total', 'Total Mappings')}</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{stats.total}</h3>
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
              <Database className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-3">{t('compensation.mappings.stats.active', 'Active')}</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{stats.active}</h3>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 text-xs font-black uppercase tracking-tighter italic">
              ON
            </div>
          </div>
        </div>
        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{t('compensation.mappings.stats.inactive', 'Inactive')}</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{stats.inactive}</h3>
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
              <LayoutGrid className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <MappingTable 
        mappings={mappings} 
        onEdit={handleEdit} 
        onDeactivate={handleDeactivate}
        loading={loading}
      />

      {/* Form Modal */}
      <MappingFormDialog 
        isOpen={isDialogOpen}
        mapping={selectedMapping}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        saving={saving}
        error={error}
      />
    </div>
  );
};

export default MappingAdminPage;
