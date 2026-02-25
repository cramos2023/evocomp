import React, { useState } from 'react';
import { Building2, ArrowRight, Loader2, Sparkles, Globe } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface OnboardingPageProps {
  onComplete: () => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found");

      // Use the RPC for atomic onboarding
      const { data: tenantId, error: rpcError } = await supabase
        .rpc('onboard_tenant', { tenant_name: name.trim() });
      
      if (rpcError) throw rpcError;

      onComplete();
    } catch (err: any) {
      console.error('Onboarding error:', err);
      alert(err.message || "An unexpected error occurred during onboarding.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -ml-64 -mb-64" />
      
      <div className="m-auto w-full max-w-[480px] p-8 relative z-10">
        <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-10 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-600/20 rotate-3">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-3">Initialize Workspace</h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-[280px]">
              EvoComp uses a multi-tenant architecture. Let's create your private workspace.
            </p>
          </div>

          <form onSubmit={handleCreateTenant} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Organization Name</label>
              <div className="relative group">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  required
                  placeholder="e.g. Acme Strategic Lab"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Workspace...
                </>
              ) : (
                <>
                  Launch Platform
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-slate-800/50">
            <div className="flex gap-4">
               <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center shrink-0">
                 <Sparkles className="w-5 h-5 text-blue-400" />
               </div>
               <div>
                 <p className="text-xs font-bold text-white">Advisory First</p>
                 <p className="text-[11px] text-slate-500 mt-0.5">Your organization starts in advisory mode for secure scenario modeling.</p>
               </div>
            </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-600 text-[11px] uppercase tracking-widest font-bold">
          Powered by EvoComp Engine v1.0
        </p>
      </div>
    </div>
  );
};

export default OnboardingPage;
