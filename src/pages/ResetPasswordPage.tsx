import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { 
  Eye, EyeOff, Lock, Sparkles, 
  ArrowRight, ShieldCheck, Key
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: 'error' });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: "Password must be at least 6 characters.", type: 'error' });
      return;
    }

    setMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setMessage({ text: "Security credentials updated! Redirecting...", type: 'success' });
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setMessage({ text: err?.message ?? "Failed to update password.", type: 'error' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden text-slate-200">
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-[480px]">
        <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-6 group pointer-events-none">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">{t('auth.reset_password')}</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">{t('auth.reset_password_subtitle', { defaultValue: 'Override Access Keys' })}</p>
        </div>

        <div className="glass-card p-10 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 opacity-50" />
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">{t('auth.new_password')}</h2>
            <p className="text-slate-500 text-sm mt-1">{t('auth.new_password_subtitle', { defaultValue: 'Establish a fresh high-entropy access key.' })}</p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('auth.new_password')}</label>
              <div className="relative group/field">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/field:text-blue-500 transition-colors" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900/50 border border-white/5 rounded-[18px] pl-12 pr-12 py-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  title={showPassword ? t('auth.hide_password') : t('auth.show_password')}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('auth.confirm_password')}</label>
              <div className="relative group/field">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/field:text-blue-500 transition-colors" />
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900/50 border border-white/5 rounded-[18px] pl-12 pr-12 py-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-sm"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !password} 
              className="btn-premium w-full py-4 justify-center group"
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? t('auth.loading') : t('auth.reset_password')}
                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </span>
            </button>
          </form>

          {message && (
            <div className={`mt-6 p-4 rounded-2xl border flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              message.type === 'error' 
                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <ShieldCheck className={`w-5 h-5 shrink-0 ${message.type === 'error' ? 'hidden' : 'block'}`} />
              <p className="text-xs font-semibold leading-relaxed">{message.text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
