import React, { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LogOut, Calculator, BarChart3, Layers, DollarSign, 
  Activity, ChevronRight, Sparkles, FileText, 
  TrendingUp, AlertCircle, PlayCircle, Cpu, 
  Search, Briefcase, LayoutGrid, ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import gsap from 'gsap';
import { useTranslation } from 'react-i18next';

export default function WorkspaceHome({ profile }: { profile: any }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // document.documentElement.classList.add('dark');
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (!prefersReducedMotion) {
        // Set initial state via GSAP instead of class to avoid 'clearProps' issues
        gsap.set('.stagger-fade', { opacity: 0, y: 20 });
        
        gsap.to('.stagger-fade', { 
          y: 0, 
          opacity: 1, 
          duration: 0.8, 
          stagger: 0.1, 
          ease: 'power3.out',
          delay: 0.1
        });
      }
    }, containerRef);
    
    return () => {
      ctx.revert();
    };
  }, [i18n.language]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  const pillars = [
    {
      id: 'design',
      title: t('workspace_hub.pillars.design.title'),
      description: t('workspace_hub.pillars.design.desc'),
      icon: Briefcase,
      color: 'emerald',
      modules: [
        { title: t('workspace_hub.modules.job_profiles.title'), icon: FileText, link: '/workspace/job-description/profiles', status: 'Active' },
        { title: t('workspace_hub.modules.m3.title'), icon: LayoutGrid, link: '/workspace/job-evaluation', status: 'Active' },
        { title: t('workspace_hub.modules.m2.title'), icon: BarChart3, link: '/app/pay-bands', status: 'Active' },
      ]
    },
    {
      id: 'diagnose',
      title: t('workspace_hub.pillars.diagnose.title'),
      description: t('workspace_hub.pillars.diagnose.desc'),
      icon: ShieldCheck,
      color: 'blue',
      modules: [
        { title: t('sidebar.intelligence'), icon: BarChart3, link: '/app/reports', status: 'Active' },
        { title: t('workspace_hub.modules.risk_radar.title'), icon: Activity, link: '#', status: 'Concept' },
        { title: t('workspace_hub.modules.market_alignment.title'), icon: Search, link: '#', status: 'Concept' },
      ]
    },
    {
      id: 'simulate',
      title: t('workspace_hub.pillars.simulate.title'),
      description: t('workspace_hub.pillars.simulate.desc'),
      icon: Calculator,
      color: 'orange',
      modules: [
        { title: t('workspace_hub.modules.m1.title'), icon: Calculator, link: '/app/comp/scenarios', status: 'Active' },
        { title: t('workspace_hub.modules.simulation_workbench.title'), icon: LayoutGrid, link: '#', status: 'Concept' },
        { title: t('workspace_hub.modules.scenario_comparison.title'), icon: Layers, link: '#', status: 'Concept' },
      ]
    },
    {
      id: 'consult',
      title: t('workspace_hub.pillars.consult.title'),
      description: t('workspace_hub.pillars.consult.desc'),
      icon: Cpu,
      color: 'purple',
      isCenterpiece: true,
      modules: [
        { title: t('workspace_hub.modules.ai_consultant.title'), icon: Sparkles, link: '#', status: 'Active' },
        { title: t('workspace_hub.modules.ai_reasoning.explain_mode'), icon: FileText, link: '#', status: 'Concept' },
        { title: t('workspace_hub.modules.ai_reasoning.recommend_mode'), icon: TrendingUp, link: '#', status: 'Concept' },
      ]
    }
  ];

  const executiveMetrics = [
    { label: t('workspace_hub.executive_summary.payroll'), value: '$142.5M', trend: '+2.1%', icon: DollarSign },
    { label: t('workspace_hub.executive_summary.market_alignment'), value: '92.4%', trend: 'Optimum', icon: Search },
    { label: t('workspace_hub.executive_summary.equity_risk'), value: t('common.risk_levels.medium'), trend: '-5%', icon: AlertCircle, color: 'text-orange-400' },
    { label: t('workspace_hub.executive_summary.active_scenarios'), value: '4', trend: t('workspace_hub.modules.badges.active'), icon: PlayCircle },
  ];

  const availableLangs = ['en', 'es', 'pt', 'it', 'fr', 'de'];

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0A0A0A] !text-[#F2F0E9] font-sans selection:bg-[#CC5833] selection:text-white relative overflow-hidden">
      {/* SVG Noise Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
      
      {/* Header */}
      <header className="relative z-50 border-b border-white/10 bg-black/60 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 stagger-fade group cursor-pointer">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-2xl flex items-center justify-center border border-white/10 shadow-xl group-hover:border-emerald-500/50 transition-colors">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-outfit tracking-tight !text-white group-hover:text-emerald-400 transition-colors">{t('workspace_hub.header.title')}</h1>
              <p className="text-[10px] font-mono !text-white/40 uppercase tracking-widest mt-0.5 transition-colors group-hover:!text-white/60">{t('workspace_hub.header.subtitle')}</p>
            </div>
          </Link>
          <div className="flex items-center gap-6 stagger-fade">
            
            {/* Language Selector */}
            <div className="hidden lg:flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md">
               {availableLangs.map(lang => (
                 <button 
                   key={lang}
                   onClick={() => i18n.changeLanguage(lang)}
                   className={`text-[10px] font-mono uppercase font-bold transition-all hover:text-[#CC5833] ${i18n.language.startsWith(lang) ? '!text-white scale-110' : '!text-white/30'}`}
                 >
                   {lang}
                 </button>
               ))}
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 backdrop-blur-md">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-wider !text-emerald-400 uppercase">{t('workspace_hub.header.badge')}</span>
            </div>
            
            <div className="w-px h-6 bg-white/10 hidden sm:block" />
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm !text-white/40 hover:!text-white transition-all group"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-outfit font-medium hidden sm:block">{t('workspace_hub.header.logout')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Header */}
        <div className="mb-16 stagger-fade max-w-4xl">
          <h2 className="text-4xl sm:text-6xl font-bold font-outfit tracking-tighter mb-6 !text-white leading-[1.1]">
            {t('workspace_hub.hero.welcome')}<span className="font-serif italic font-normal text-[#CC5833]">{t('workspace_hub.hero.highlight')}</span>
          </h2>
          <p className="text-lg sm:text-xl !text-white/40 leading-relaxed max-w-2xl font-light">
            {t('workspace_hub.hero.desc')}
          </p>
        </div>

        {/* Executive Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 stagger-fade">
          {executiveMetrics.map((metric, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-sm hover:bg-white/[0.05] transition-colors group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <metric.icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${metric.trend.includes('+') ? 'text-emerald-400' : metric.trend.includes('-') ? 'text-orange-400' : 'text-blue-400'}`}>
                  {metric.trend}
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40 mb-1">{metric.label}</p>
              <p className={`text-3xl font-bold font-outfit !text-white ${metric.color || ''}`}>{metric.value}</p>
            </div>
          ))}
        </div>

        {/* Four Pillars Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {pillars.map((pillar, i) => (
            <div 
              key={pillar.id}
              className={`stagger-fade group relative rounded-[3rem] border border-white/10 overflow-hidden bg-white/[0.02] backdrop-blur-xl transition-all duration-700 hover:border-white/20 p-8 sm:p-12 ${pillar.isCenterpiece ? 'lg:col-span-2 border-emerald-500/20 bg-emerald-500/[0.02]' : ''}`}
            >
              {/* Pillar Header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-10">
                <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center border shadow-2xl transition-transform duration-700 group-hover:scale-110 group-hover:rotate-3 ${
                  pillar.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  pillar.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                  pillar.color === 'orange' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                  'bg-purple-500/10 border-purple-500/20 text-purple-400'
                }`}>
                  <pillar.icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold font-outfit !text-white mb-2">{pillar.title}</h3>
                  <p className="text-sm !text-white/40 max-w-sm">{pillar.description}</p>
                </div>
              </div>

              {/* Pillar Modules */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {pillar.modules.map((mod, j) => {
                  const isActive = mod.status === 'Active';
                  return (
                    <Link
                      key={j}
                      to={isActive ? mod.link : '#'}
                      className={`p-6 rounded-[2rem] border transition-all duration-300 flex flex-col gap-4 group/mod ${
                        isActive 
                          ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30 cursor-pointer' 
                          : 'bg-transparent border-dashed border-white/5 opacity-40 grayscale cursor-default'
                      }`}
                      onClick={(e) => !isActive && e.preventDefault()}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-white/5 text-white/60 group-hover/mod:text-emerald-400' : 'bg-white/5 text-white/20'}`}>
                        <mod.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold font-outfit !text-white mb-1 group-hover/mod:!text-emerald-400 transition-colors">{mod.title}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-mono tracking-widest uppercase py-0.5 px-2 rounded-full border ${
                            isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40'
                          }`}>
                            {isActive ? t('workspace_hub.modules.badges.active') : t('workspace_hub.modules.badges.concept')}
                          </span>
                        </div>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-white/20 group-hover/mod:text-emerald-400 group-hover/mod:translate-x-1 transition-all" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Lower Panels: Insights & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 stagger-fade">
          {/* Critical Insights */}
          <div className="lg:col-span-1 bg-white/[0.02] border border-white/10 rounded-[3rem] p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold font-outfit !text-white flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-400" />
                {t('workspace_hub.insights.title')}
              </h3>
            </div>
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/10 group cursor-default">
                <p className="text-xs font-mono text-orange-400 uppercase tracking-widest mb-2 font-bold">{t('workspace_hub.insights.priority_high')}</p>
                <p className="text-sm !text-white/80 leading-relaxed font-bold">
                  {t('workspace_hub.insights.compression', { hierarchy: 'Engineering' })}
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-xs font-mono text-blue-400 uppercase tracking-widest mb-2 font-bold">{t('workspace_hub.insights.internal_audit')}</p>
                <p className="text-sm !text-white/80 leading-relaxed font-bold">
                  {t('workspace_hub.insights.below_midpoint', { count: 12 })}
                </p>
              </div>
            </div>
          </div>

          {/* Active Scenarios */}
          <div className="lg:col-span-2 bg-white/[0.02] border border-white/10 rounded-[3rem] p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold font-outfit !text-white flex items-center gap-3">
                <PlayCircle className="w-5 h-5 text-emerald-400" />
                {t('workspace_hub.scenarios.title')}
              </h3>
              <Link to="/app/comp/scenarios" className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#CC5833] hover:text-emerald-400 transition-colors">
                {t('dashboard.explore_all')}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'Merit Review Q1 - Americas', status: t('plan_status.in_review'), date: t('common.time.hours_ago', { count: 2 }) },
                { name: 'Equity Equalization 2026', status: t('plan_status.draft'), date: t('common.time.hours_ago', { count: 5 }) }
              ].map((scenario, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer group">
                  <div>
                    <p className="text-sm font-bold !text-white mb-1 group-hover:text-emerald-400 transition-colors">{scenario.name}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{scenario.date}</span>
                      <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-black">{scenario.status}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


