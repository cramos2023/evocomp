import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Sparkles, 
  History, 
  Network, 
  Globe, 
  Download,
  Terminal,
  Cpu,
  ShieldCheck
} from 'lucide-react';

const JobDescriptionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const capabilities = [
    {
      id: 'ai_builder',
      icon: Sparkles,
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400'
    },
    {
      id: 'compliance',
      icon: ShieldCheck,
      color: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400'
    },
    {
      id: 'versioning',
      icon: History,
      color: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400'
    },
    {
      id: 'org_chart',
      icon: Network,
      color: 'from-orange-500/20 to-amber-500/20',
      iconColor: 'text-orange-400'
    },
    {
      id: 'multilingual',
      icon: Globe,
      color: 'from-indigo-500/20 to-blue-500/20',
      iconColor: 'text-indigo-400'
    },
    {
      id: 'export',
      icon: Download,
      color: 'from-rose-500/20 to-red-500/20',
      iconColor: 'text-rose-400'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] text-slate-900 dark:text-white font-sans selection:bg-[#CC5833] selection:text-white pb-20 transition-colors duration-500">
      {/* Hero Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 pt-10">
        {/* Navigation */}
        <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <Link 
            to="/workspace" 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-all font-bold text-xs uppercase tracking-widest group"
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-500">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </div>
            {t('pages.job_description.landing.actions.back_to_workspace')}
          </Link>
        </div>

        {/* Hero Section */}
        <div className="max-w-4xl mb-24 animate-in fade-in slide-in-from-left-4 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-emerald-400 mb-8 shadow-2xl shadow-emerald-500/10 scale-in duration-700">
            <Cpu className="w-3.5 h-3.5 animate-pulse" />
            {t('pages.job_description.landing.hero.badge')}
          </div>
          
          <h1 className="text-6xl sm:text-8xl font-bold font-outfit tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-500 dark:from-white dark:to-white/40 leading-[1.1]">
            {t('pages.job_description.landing.hero.title')}
          </h1>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-10">
            <h2 className="text-2xl sm:text-3xl font-serif italic text-[#CC5833]">
              {t('pages.job_description.landing.hero.subtitle')}
            </h2>
            <div className="hidden sm:block w-12 h-px bg-slate-900/10 dark:bg-white/10" />
            <div className="flex items-center gap-2 text-slate-500 dark:text-white/40 font-mono text-xs uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-500/50" />
              {t('pages.job_description.landing.hero.badge')}
            </div>
          </div>

          <p className="text-xl sm:text-2xl text-slate-600 dark:text-white/40 leading-relaxed font-light mb-12 border-l-2 border-emerald-500/30 dark:border-emerald-500/20 pl-8">
            {t('pages.job_description.landing.hero.strategy_text')}
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/workspace/job-description/profiles')}
              className="px-8 py-4 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-black font-bold text-sm hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-colors flex items-center gap-3 group"
            >
              {t('pages.job_description.landing.actions.cta_repository')}
              <Terminal className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/workspace/job-description/profiles/new')}
              className="px-8 py-4 rounded-2xl border border-slate-900/20 dark:border-white/20 text-slate-900 dark:text-white font-bold text-sm hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all flex items-center gap-3"
            >
              {t('pages.job_description.landing.actions.cta_create')}
            </button>
          </div>
        </div>

        {/* Capabilities Grid */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-12 stagger-fade">
            <h2 className="text-2xl font-bold font-outfit uppercase tracking-widest text-slate-800 dark:text-white/80">
              {t('pages.job_description.landing.capabilities_title')}
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-900/10 dark:from-white/10 to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap, i) => (
              <div 
                key={cap.id}
                className="group relative p-8 rounded-[2rem] border border-slate-900/5 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] shadow-sm dark:shadow-none backdrop-blur-xl transition-all duration-700 hover:bg-white dark:hover:bg-white/[0.06] hover:shadow-md hover:border-slate-900/10 dark:hover:border-white/20 hover:-translate-y-2 overflow-hidden animate-in fade-in slide-in-from-bottom-8"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Accent Glow */}
                <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${cap.color} blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000`} />
                
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 ${cap.iconColor}`}>
                    <cap.icon className="w-7 h-7" />
                  </div>
                  
                  <h3 className="text-xl font-bold font-outfit mb-4 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
                    {t(`pages.job_description.landing.capabilities.${cap.id}.title`)}
                  </h3>
                  
                  <p className="text-slate-600 dark:text-white/30 leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white/60 transition-colors">
                    {t(`pages.job_description.landing.capabilities.${cap.id}.desc`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Footer Decoration */}
        <div className="pt-20 border-t border-slate-900/10 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 opacity-60 dark:opacity-20 text-slate-900 dark:text-white">
           <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 sm:gap-6 font-mono text-[10px] uppercase tracking-[0.3em]">
             <span>{t('pages.job_description.landing.footer.auth')}</span>
             <span className="hidden sm:block w-1 h-1 bg-slate-900 dark:bg-white rounded-full opacity-30" />
             <span>{t('pages.job_description.landing.footer.drafting')}</span>
           </div>
           <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-500 animate-pulse uppercase tracking-[0.3em]">
             {t('pages.job_description.landing.footer.status')} _
           </div>
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionPage;
