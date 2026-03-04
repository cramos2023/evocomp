import React, { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Calculator, BarChart3, Layers, DollarSign, Activity, ChevronRight, Sparkles } from 'lucide-react';
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

  const modules = [
    {
      title: t('workspace_hub.modules.m1.title'),
      description: t('workspace_hub.modules.m1.desc'),
      icon: Calculator,
      status: 'Active',
      link: '/app/comp/scenarios',
      className: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
    },
    {
      title: t('workspace_hub.modules.m2.title'),
      description: t('workspace_hub.modules.m2.desc'),
      icon: BarChart3,
      status: 'Coming Soon',
      link: '#',
      className: 'bg-white/10 border-white/20 text-white/50'
    },
    {
      title: t('workspace_hub.modules.m3.title'),
      description: t('workspace_hub.modules.m3.desc'),
      icon: Layers,
      status: 'Active',
      link: '/workspace/job-evaluation',
      className: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
    },
    {
      title: t('workspace_hub.modules.m4.title'),
      description: t('workspace_hub.modules.m4.desc'),
      icon: DollarSign,
      status: 'Coming Soon',
      link: '#',
      className: 'bg-white/10 border-white/20 text-white/50'
    },
    {
      title: t('workspace_hub.modules.m5.title'),
      description: t('workspace_hub.modules.m5.desc'),
      icon: Activity,
      status: 'Coming Soon',
      link: '#',
      className: 'bg-white/10 border-white/20 text-white/50'
    }
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
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="mb-20 stagger-fade max-w-4xl">
          <h2 className="text-5xl sm:text-7xl font-bold font-outfit tracking-tighter mb-8 !text-white leading-[1.1]">
            {t('workspace_hub.hero.welcome')}<span className="font-serif italic font-normal text-[#CC5833]">{t('workspace_hub.hero.highlight')}</span>
          </h2>
          <p className="text-xl sm:text-2xl !text-white/40 leading-relaxed max-w-2xl font-light">
            {t('workspace_hub.hero.desc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((mod, i) => {
            const isClickable = mod.status === 'Active';
            return (
              <Link 
                key={i} 
                to={mod.link}
                className={`stagger-fade group relative rounded-[2.5rem] border border-white/10 overflow-hidden bg-white/[0.04] backdrop-blur-md transition-all duration-700 hover:bg-white/[0.08] hover:border-white/30 hover:-translate-y-3 ${isClickable ? 'cursor-pointer' : 'cursor-default opacity-40 grayscale shadow-none'}`}
                onClick={(e) => {
                  if (!isClickable) e.preventDefault();
                }}
              >
                {/* Visual Highlight for Active */}
                {isClickable && (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-30 group-hover:opacity-60 transition-opacity duration-1000" />
                )}
                
                <div className="p-10 h-full flex flex-col relative z-20">
                  <div className="flex items-start justify-between mb-12">
                    <div className={`w-14 h-14 rounded-3xl flex items-center justify-center border shadow-2xl transition-transform duration-700 group-hover:scale-110 group-hover:rotate-3 ${mod.className}`}>
                      <mod.icon className="w-7 h-7" />
                    </div>
                    {isClickable ? (
                      <div className="bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase tracking-widest px-4 py-1.5 rounded-full !text-emerald-400 shadow-lg shadow-emerald-500/10">
                        {t('workspace_hub.modules.badges.active')}
                      </div>
                    ) : (
                      <div className="bg-white/5 border border-white/10 text-[10px] font-mono font-bold uppercase tracking-widest px-4 py-1.5 rounded-full !text-white/20">
                        {t('workspace_hub.modules.badges.concept')}
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-bold font-outfit mb-4 !text-white group-hover:!text-emerald-400 transition-colors uppercase tracking-tight">{mod.title}</h3>
                  <p className="text-base !text-white/30 leading-relaxed mb-12 flex-1 group-hover:!text-white/60 transition-colors">
                    {mod.description}
                  </p>
                  
                  <div className={`mt-auto flex items-center gap-2 text-sm font-bold font-outfit tracking-wider transition-all duration-700 ${isClickable ? 'text-[#CC5833] opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0' : '!text-white/10'}`}>
                    {isClickable ? t('workspace_hub.modules.actions.launch') : t('workspace_hub.modules.actions.preview')}
                    {isClickable && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}


