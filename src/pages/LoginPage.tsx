import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { 
  Eye, EyeOff, Mail, Lock, Sparkles, 
  ArrowRight, ShieldCheck, Github, Chrome
} from "lucide-react";
import { useTranslation } from "react-i18next";

type Mode = "signIn" | "signUp";

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.trim().length >= 6 && !loading;
  }, [email, password, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (!supabase) throw new Error("Supabase client is not available.");

      if (mode === "signIn") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (data.session) {
          navigate("/", { replace: true });
        } else {
          setMessage({ text: "Signed in, but no session returned.", type: 'error' });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (data.session) {
          navigate("/", { replace: true });
        } else {
          setMessage({ 
            text: "Account created. Please check your inbox to confirm your email before signing in.", 
            type: 'success' 
          });
        }
      }
    } catch (err: any) {
      let errorMessage = typeof err?.message === "string" ? err.message : "Unexpected error.";
      
      if (errorMessage.toLowerCase().includes("rate limit")) {
        errorMessage = "Security throttle active: Too many attempts. Please wait 60 seconds or verify your email settings in Supabase.";
      }

      setMessage({ 
        text: errorMessage, 
        type: 'error' 
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setMessage(null);
    if (!email.trim()) {
      setMessage({ text: "Enter your email first.", type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage({ text: "Security link sent! Check your inbox.", type: 'success' });
    } catch (err: any) {
      console.error('Password recovery debug info:', {
        message: err?.message,
        error: err,
        stack: err?.stack
      });
      
      let errorMessage = err?.message ?? "Failed to send reset email.";
      
      // Handle specific SMTP/Auth errors from Supabase
      if (errorMessage.includes("550") || errorMessage === "Error sending recovery email") {
        errorMessage = "Identity Proof Required: Resend is in testing mode. You can only send to the account owner (carlos_ramos20@hotmail.com) until a domain is verified. See Browser Console for 'debug info'.";
      } else if (errorMessage.includes("535")) {
        errorMessage = "SMTP Authentication Failed: Check if username is set to 'resend' in Supabase Dashboard.";
      } else if (errorMessage.toLowerCase().includes("rate limit")) {
        errorMessage = "Email limit reached. Please wait a moment or check your Supabase SMTP limits.";
      }

      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Cinematic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
      </div>

      <div className="relative z-10 w-full max-w-[480px]">
        {/* Branding */}
        <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500 group pointer-events-none">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">EvoComp</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Strategic Intelligence Vault</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-10 relative overflow-hidden group animate-in zoom-in-95 duration-700">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 opacity-50 group-hover:opacity-100 transition-opacity" />
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {mode === "signIn" ? t('auth.sign_in') : t('auth.sign_up')}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {mode === "signIn" 
                ? t('auth.sign_in_subtitle', { defaultValue: 'Enter your credentials to access the console.' })
                : t('auth.sign_up_subtitle', { defaultValue: 'Create your secure account to begin.' })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('auth.email')}</label>
              <div className="relative group/field">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/field:text-blue-500 transition-colors" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="w-full bg-slate-900/50 border border-white/5 rounded-[18px] pl-12 pr-4 py-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('auth.password')}</label>
                {mode === "signIn" && (
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest transition-colors"
                  >
                    {t('auth.forgot_password_short', { defaultValue: 'Reset?' })}
                  </button>
                )}
              </div>
              <div className="relative group/field">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/field:text-blue-500 transition-colors" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900/50 border border-white/5 rounded-[18px] pl-12 pr-12 py-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-sm"
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

            <button 
              type="submit" 
              disabled={!canSubmit} 
              className="btn-premium w-full py-4 justify-center group"
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? t('auth.loading') : mode === "signIn" ? t('auth.sign_in') : t('auth.sign_up')}
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

          {/* Social Auth Divider */}
          <div className="mt-10 flex items-center gap-4">
            <div className="h-px bg-white/5 flex-1" />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Enterprise Sign-In</span>
            <div className="h-px bg-white/5 flex-1" />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 bg-slate-900 border border-white/5 px-4 py-3 rounded-[16px] text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs font-bold uppercase tracking-tight">
              <Chrome className="w-4 h-4" /> Google
            </button>
            <button className="flex items-center justify-center gap-2 bg-slate-900 border border-white/5 px-4 py-3 rounded-[16px] text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs font-bold uppercase tracking-tight">
              <Github className="w-4 h-4" /> GitHub
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="mt-8 text-center animate-in fade-in duration-1000 [animation-delay:0.5s]">
          <p className="text-sm text-slate-500">
            {mode === "signIn" ? "New to the platform?" : "Already established identity?"}
            <button
              type="button"
              onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
              className="ml-2 text-blue-500 hover:text-blue-400 font-bold underline-offset-4 hover:underline transition-all"
            >
              {mode === "signIn" ? "Initialize credentials" : "Secure sign-in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
