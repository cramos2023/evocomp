import React, { useEffect, useState } from 'react';
import { 
  Settings, Globe, Shield, Info, 
  Save, Loader2, AlertTriangle, Building2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const TenantSettingsPage = () => {
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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Organization Settings</h1>
        <p className="text-slate-500 mt-1">Configure your workspace identity, core currency, and operational governance mode.</p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          Loading settings...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-slate-900">General Profile</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Organization Name</label>
                <input 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Base Currency</label>
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <select 
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none cursor-pointer"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="MXN">MXN - Mexican Peso</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 px-1">This currency is used as the global baseline for all scenario calculations and reporting.</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-slate-900">Operational Governance</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={() => setMode('ADVISORY')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all relative ${
                    mode === 'ADVISORY' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mb-4 ${
                    mode === 'ADVISORY' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                  }`}>
                    {mode === 'ADVISORY' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <h3 className="font-bold text-slate-900">Advisory Mode</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Model scenarios without modifying core employee data. Ideal for planning and "what-if" analysis.
                  </p>
                </button>

                <button 
                  type="button"
                  onClick={() => setMode('SYSTEM_OF_RECORD')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all relative ${
                    mode === 'SYSTEM_OF_RECORD' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mb-4 ${
                    mode === 'SYSTEM_OF_RECORD' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                  }`}>
                    {mode === 'SYSTEM_OF_RECORD' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <h3 className="font-bold text-slate-900">System of Record</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Directly updates employee history and persistent records upon scenario publication.
                  </p>
                </button>
              </div>

              {mode === 'SYSTEM_OF_RECORD' && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-xl flex gap-3 text-orange-800">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p className="text-xs leading-relaxed">
                    <span className="font-bold block">Caution: Full Write Access Enabled</span>
                    Published scenarios will modify `employees` and `employee_compensation` tables. 
                    Ensure your data imports are accurate before enabling this mode.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button"
              className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              Discard Changes
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      )}

      <div className="mt-12 p-8 border border-white/40 bg-white/40 backdrop-blur-sm rounded-3xl flex items-start gap-4">
        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Infrastructure Privacy</h3>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
            Your organization ID (UUID) is protected by our zero-trust RLS layer. No data is shared between tenants 
            even when operating in a shared database instance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TenantSettingsPage;
