import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Sparkles, 
  Target, 
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

  const capabilities = [
    {
      id: 'ai_drafting',
      icon: Sparkles,
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400'
    },
    {
      id: 'competency_mapping',
      icon: Target,
      color: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400'
    },
    {
      id: 'version_control',
      icon: History,
      color: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400'
    },
    {
      id: 'org_chart_alignment',
      icon: Network,
      color: 'from-orange-500/20 to-amber-500/20',
      iconColor: 'text-orange-400'
    },
    {
      id: 'multilingual_support',
      icon: Globe,
      color: 'from-indigo-500/20 to-blue-500/20',
      iconColor: 'text-indigo-400'
    },
    {
      id: 'professional_export',
      icon: Download,
      color: 'from-rose-500/20 to-red-500/20',
      iconColor: 'text-rose-400'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#CC5833] selection:text-white pb-20">
      {/* Hero Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 pt-10">
        {/* Navigation */}
        <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <Link 
            to="/workspace" 
            className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-all font-bold text-xs uppercase tracking-widest group"
          >
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-500">
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
          
          <h1 className="text-6xl sm:text-8xl font-bold font-outfit tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 leading-[1.1]">
            {t('pages.job_description.landing.hero.title')}
          </h1>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-10">
            <h2 className="text-2xl sm:text-3xl font-serif italic text-[#CC5833]">
              {t('pages.job_description.landing.hero.subtitle')}
            </h2>
            <div className="hidden sm:block w-12 h-px bg-white/10" />
            <div className="flex items-center gap-2 text-white/40 font-mono text-xs uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-emerald-500/50" />
              Secure Enterprise AI
            </div>
          </div>

          <p className="text-xl sm:text-2xl text-white/40 leading-relaxed font-light mb-12 border-l-2 border-emerald-500/20 pl-8">
            {t('pages.job_description.landing.hero.strategy_text')}
          </p>

          <div className="flex flex-wrap gap-4">
            <div className="px-8 py-4 rounded-2xl bg-white text-black font-bold text-sm hover:bg-emerald-400 transition-colors cursor-not-allowed opacity-50 flex items-center gap-3 group">
              {t('pages.job_description.landing.actions.coming_soon')}
              <Terminal className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Capabilities Grid */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-12 stagger-fade">
            <h2 className="text-2xl font-bold font-outfit uppercase tracking-widest text-white/80">
              {t('pages.job_description.landing.capabilities.title')}
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap, i) => (
              <div 
                key={cap.id}
                className="group relative p-8 rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl transition-all duration-700 hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-2 overflow-hidden animate-in fade-in slide-in-from-bottom-8"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Accent Glow */}
                <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${cap.color} blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000`} />
                
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 ${cap.iconColor}`}>
                    <cap.icon className="w-7 h-7" />
                  </div>
                  
                  <h3 className="text-xl font-bold font-outfit mb-4 text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
                    {t(`pages.job_description.landing.capabilities.${cap.id}.title`)}
                  </h3>
                  
                  <p className="text-white/30 leading-relaxed group-hover:text-white/60 transition-colors">
                    {t(`pages.job_description.landing.capabilities.${cap.id}.desc`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Footer Decoration */}
        <div className="pt-20 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-8 opacity-20">
           <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.3em]">
             <span>Auth: RLS Protected</span>
             <span className="w-1 h-1 bg-white rounded-full" />
             <span>Drafting: GPT-4o Optimized</span>
             <span className="w-1 h-1 bg-white rounded-full" />
             <span>Status: Concept Validation</span>
           </div>
           <div className="text-[10px] font-mono text-emerald-500 animate-pulse">
             System Ready _
           </div>
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionPage;
