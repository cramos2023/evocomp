import React, { useEffect, useState } from 'react';
import { 
  Settings, Globe, Shield, Info, 
  Save, Loader2, AlertTriangle, Building2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

const TenantSettingsPage = () => {
  const { t } = useTranslation();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'ADVISORY' | 'SYSTEM_OF_RECORD'>('ADVISORY');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    fetchTenant();
  }, []);

  async function fetchTenant() {
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return;

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', profile.user.id)
        .single();
      
      if (!profileData?.tenant_id) return;

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profileData.tenant_id)
        .single();
      
      if (error) throw error;
      setTenant(data);
      setName(data.name);
      setMode(data.mode);
      setCurrency(data.base_currency);
    } catch (err) {
      console.error('Error fetching tenant:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ name, mode, base_currency: currency })
        .eq('id', tenant.id);
      
      if (error) throw error;
      alert("Settings updated successfully.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-10 max-w-5xl mx-auto transition-colors duration-500">
      <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter leading-none mb-3">
          {t('pages.admin.title', 'Organization Settings')}
        </h1>
        <p className="text-[rgb(var(--text-secondary))] text-lg font-bold">{t('pages.admin.subtitle', 'Configure workspace identity and governance.')}</p>
      </div>

      {loading ? (
        <div className="p-32 text-center text-[rgb(var(--text-muted))] flex flex-col items-center gap-6">
          <Loader2 className="w-10 h-10 animate-spin text-[rgb(var(--primary))]" />
          <p className="font-black uppercase tracking-[0.2em] text-xs">Syncing enterprise data...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] overflow-hidden">
            <div className="p-8 bg-[rgb(var(--bg-surface-2))] border-b border-[rgb(var(--border))] flex items-center gap-4">
              <div className="w-12 h-12 bg-[rgb(var(--bg-surface))] rounded-2xl flex items-center justify-center text-[rgb(var(--primary))] border border-[rgb(var(--border))] shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-[rgb(var(--text-primary))] tracking-tight">{t('pages.admin.general', 'General Profile')}</h2>
            </div>
            <div className="p-8 space-y-8">
              <div>
                <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-3">{t('pages.admin.org_name', 'Organization Name')}</label>
                <input 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] p-4 text-sm text-[rgb(var(--text-primary))] font-bold outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-3">{t('pages.admin.base_currency', 'Base Currency')}</label>
                <div className="relative group">
                  <Globe className="w-5 h-5 text-[rgb(var(--text-muted))] absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-[rgb(var(--primary))]" />
                  <select 
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] pl-12 pr-4 py-4 text-sm text-[rgb(var(--text-primary))] font-bold outline-none cursor-pointer focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all appearance-none"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="MXN">MXN - Mexican Peso</option>
                  </select>
                </div>
                <p className="text-[10px] text-[rgb(var(--text-muted))] mt-3 px-1 font-bold uppercase tracking-tight">{t('pages.admin.currency_desc', 'Base for all scenario calculations.')}</p>
              </div>
            </div>
          </div>

          <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] overflow-hidden">
            <div className="p-8 bg-[rgb(var(--bg-surface-2))] border-b border-[rgb(var(--border))] flex items-center gap-4">
              <div className="w-12 h-12 bg-[rgb(var(--bg-surface))] rounded-2xl flex items-center justify-center text-[rgb(var(--primary))] border border-[rgb(var(--border))] shadow-sm">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-[rgb(var(--text-primary))] tracking-tight">{t('pages.admin.governance', 'Operational Governance')}</h2>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  type="button"
                  onClick={() => setMode('ADVISORY')}
                  className={`p-8 rounded-[var(--radius-card)] border-2 text-left transition-all ${
                    mode === 'ADVISORY' 
                      ? 'border-[rgb(var(--primary))] bg-[rgba(46,79,210,0.04)] ring-4 ring-[rgba(46,79,210,0.08)]' 
                      : 'border-[rgb(var(--border))] hover:border-[rgb(var(--text-muted))]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-6 transition-all ${
                    mode === 'ADVISORY' ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-white shadow-lg' : 'border-[rgb(var(--border))]'
                  }`}>
                    {mode === 'ADVISORY' && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </div>
                  <h3 className="text-lg font-black text-[rgb(var(--text-primary))] mb-2 tracking-tight">{t('pages.admin.advisory', 'Advisory Mode')}</h3>
                  <p className="text-sm text-[rgb(var(--text-secondary))] font-bold leading-relaxed">
                    {t('pages.admin.advisory_desc', 'Model without modifying base data.')}
                  </p>
                </button>

                <button 
                  type="button"
                  onClick={() => setMode('SYSTEM_OF_RECORD')}
                  className={`p-8 rounded-[var(--radius-card)] border-2 text-left transition-all ${
                    mode === 'SYSTEM_OF_RECORD' 
                      ? 'border-[rgb(var(--primary))] bg-[rgba(46,79,210,0.04)] ring-4 ring-[rgba(46,79,210,0.08)]' 
                      : 'border-[rgb(var(--border))] hover:border-[rgb(var(--text-muted))]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-6 transition-all ${
                    mode === 'SYSTEM_OF_RECORD' ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-white shadow-lg' : 'border-[rgb(var(--border))]'
                  }`}>
                    {mode === 'SYSTEM_OF_RECORD' && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </div>
                  <h3 className="text-lg font-black text-[rgb(var(--text-primary))] mb-2 tracking-tight">{t('pages.admin.sor', 'System of Record')}</h3>
                  <p className="text-sm text-[rgb(var(--text-secondary))] font-bold leading-relaxed">
                    {t('pages.admin.sor_desc', 'Updates history upon publishing.')}
                  </p>
                </button>
              </div>

              {mode === 'SYSTEM_OF_RECORD' && (
                <div className="mt-8 p-6 bg-orange-50 border border-orange-100 rounded-2xl flex gap-4 text-orange-900 shadow-sm animate-in zoom-in duration-300">
                  <AlertTriangle className="w-6 h-6 shrink-0 text-orange-600" />
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-widest">{t('pages.admin.caution', 'Caution: Full Write Enabled')}</span>
                    <p className="text-sm font-bold leading-relaxed">
                      {t('pages.admin.caution_desc', 'Scenarios will modify persistent records.')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-6 pt-6">
            <button 
              type="button"
              className="px-8 py-4 text-xs font-black text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-all uppercase tracking-widest"
            >
              {t('pages.admin.discard', 'Discard Changes')}
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="btn-premium px-12 py-4 text-xs"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {t('pages.admin.save', 'Save Changes')}
            </button>
          </div>
        </form>
      )}

      <div className="mt-20 p-10 bg-[rgb(var(--bg-surface-2))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] flex items-start gap-8 transition-all hover:bg-[rgb(var(--bg-surface))] group shadow-sm">
        <div className="w-14 h-14 bg-[rgb(var(--bg-surface))] rounded-2xl shadow-sm flex items-center justify-center text-[rgb(var(--primary))] border border-[rgb(var(--border))] shrink-0 group-hover:scale-110 transition-transform duration-500">
          <Info className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-xl font-black text-[rgb(var(--text-primary))] tracking-tighter mb-2">{t('pages.admin.privacy', 'Infrastructure Privacy')}</h3>
          <p className="text-[rgb(var(--text-secondary))] font-bold leading-relaxed max-w-2xl">
            {t('pages.admin.privacy_desc', 'RLS layer guarantees data separation.')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TenantSettingsPage;
