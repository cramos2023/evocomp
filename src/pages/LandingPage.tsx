import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldCheck, ChevronRight, Lock, Server, ArrowRight, MousePointer2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

gsap.registerPlugin(ScrollTrigger);
const NOISE_SVG = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E`;

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const navbarRef = useRef<HTMLElement>(null);
  const [activeCard, setActiveCard] = useState(0);
  const [terminalStep, setTerminalStep] = useState(0);
  const [cursorStep, setCursorStep] = useState(0);
  const currentYear = new Date().getFullYear();

  const terminalMessages = [
    t('landing.features.card2_m1'),
    t('landing.features.card2_m2'),
    t('landing.features.card2_m3'),
    t('landing.features.card2_m4'),
    t('landing.features.card2_m5')
  ];

  useEffect(() => {
    // Feature 1: Card flipper
    const cardInterval = setInterval(() => {
      setActiveCard(prev => (prev + 1) % 3);
    }, 3000);

    // Feature 2: Terminal Typer
    const termInterval = setInterval(() => {
      setTerminalStep(prev => (prev + 1) % terminalMessages.length);
    }, 2500);

    // Feature 3: Cursor workflow
    const cursorInterval = setInterval(() => {
      setCursorStep(prev => (prev + 1) % 4);
    }, 2000);

    return () => {
      clearInterval(cardInterval);
      clearInterval(termInterval);
      clearInterval(cursorInterval);
    };
  }, [terminalMessages.length]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // Navbar scroll effect
      ScrollTrigger.create({
        start: 'top -50',
        end: 99999,
        toggleClass: { className: 'nav-scrolled', targets: navbarRef.current }
      });

      // Hero Fade
      gsap.from('.hero-text', {
        y: 50, opacity: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out'
      });

      // Manifesto Split Text (Simulated without external plugin by fading children)
      gsap.from('.manifesto-line', {
        scrollTrigger: { trigger: '.manifesto-section', start: 'top 70%' },
        y: 40, opacity: 0, duration: 1, stagger: 0.2, ease: 'power2.out'
      });

      // Archive Stacked Cards
      const cards = gsap.utils.toArray('.archive-card') as HTMLElement[];
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return; // Last card doesn't shrink
        ScrollTrigger.create({
          trigger: card,
          start: 'top top',
          endTrigger: cards[i + 1],
          end: 'top top',
          pin: true,
          pinSpacing: false,
          animation: gsap.to(card, {
            scale: 0.9, opacity: 0.5, filter: 'blur(20px)', ease: 'none'
          }),
          scrub: true
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, [i18n.language]); // Re-run GSAP context if language changes cause layout shifts

  const availableLangs = ['en', 'es', 'pt', 'it', 'fr', 'de'];

  return (
    <div ref={containerRef} className="bg-[#F2F0E9] text-[#1A1A1A] font-sans selection:bg-[#CC5833] selection:text-white relative">
      <div className="pointer-events-none fixed inset-0 z-50 opacity-5 mix-blend-multiply" style={{ backgroundImage: `url("${NOISE_SVG}")` }} />

      {/* Navbar */}
      <nav ref={navbarRef} className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-6xl transition-all duration-500 rounded-full [&.nav-scrolled]:bg-white/90 [&.nav-scrolled]:backdrop-blur-xl [&.nav-scrolled]:shadow-sm [&.nav-scrolled]:shadow-black/5 [&.nav-scrolled]:border [&.nav-scrolled]:border-white [&.nav-scrolled_a]:text-[#2E4036] [&.nav-scrolled_.lang-btn]:text-[#2E4036] [&.nav-scrolled_.lang-btn_span.active]:text-[#CC5833] [&.nav-scrolled_.lang-btn_span]:opacity-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="font-outfit font-black text-xl text-white tracking-tighter transition-colors">EvoComp</div>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-white/90">
            <a href="#services" className="hover:text-[#CC5833] transition-colors">{t('landing.nav.services')}</a>
            <a href="#advantage" className="hover:text-[#CC5833] transition-colors">{t('landing.nav.advantage')}</a>
            <a href="#security" className="hover:text-[#CC5833] transition-colors">{t('landing.nav.security')}</a>
            <a href="#about" className="hover:text-[#CC5833] transition-colors">{t('landing.nav.about')}</a>
          </div>
          <div className="flex items-center gap-4">
            <div className="lang-btn hidden xl:flex items-center gap-3 text-[10px] font-bold text-white transition-colors">
              {availableLangs.map(lang => (
                <button 
                  key={lang}
                  onClick={() => i18n.changeLanguage(lang)}
                  className={`uppercase transition-colors hover:text-[#CC5833] ${i18n.language.startsWith(lang) ? 'active opacity-100 text-white' : 'opacity-40'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
            <Link to="/login" className="bg-[#CC5833] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform duration-300 shadow-xl shadow-[#CC5833]/20 whitespace-nowrap">
              {t('landing.nav.client_workspace')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[100dvh] flex flex-col justify-end p-8 md:p-16 pb-24 overflow-hidden bg-[#1A1A1A]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#2E4036] via-[#1A1A1A]/80 to-[#1A1A1A] z-0" />
        <div className="absolute inset-0 opacity-40 mix-blend-overlay z-0" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?q=80&w=2070&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        
        <div className="relative z-10 max-w-5xl mt-32">
          <h1 className="hero-text text-5xl md:text-7xl lg:text-[100px] leading-[0.9] text-white tracking-tighter mb-8">
            <span className="block font-sans font-bold text-inherit">{t('landing.hero.title_1')}</span>
            <span className="block font-sans font-medium text-white/80 text-inherit">{t('landing.hero.title_2')}</span>
            <span className="block font-serif italic text-[#F2F0E9] mt-2 text-inherit">{t('landing.hero.title_3')}</span>
          </h1>
          
          <p className="hero-text text-lg md:text-xl text-white/70 font-light max-w-2xl mb-10 leading-relaxed">
            {t('landing.hero.subtitle')}
          </p>
          
          <div className="hero-text flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Link to="/login" className="w-full sm:w-auto bg-[#CC5833] text-white px-8 py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#b04a29] transition-colors group">
              {t('landing.hero.cta_workspace')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto bg-white/10 text-white backdrop-blur-md border border-white/20 px-8 py-4 rounded-full text-sm font-bold hover:bg-white/20 transition-colors">
              {t('landing.hero.cta_consultation')}
            </button>
          </div>
          
          <p className="hero-text text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
            {t('landing.hero.mono_text')}
          </p>
        </div>
      </section>

      {/* Features - Micro panels */}
      <section className="py-32 px-6 max-w-7xl mx-auto" id="advantage">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Diagnostic Deck */}
          <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-black/5 min-h-[400px] flex flex-col relative overflow-hidden">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#CC5833] mb-8">{t('landing.features.card1_label')}</div>
            <div className="relative flex-1">
              {[
                { title: t('landing.features.card1_t1') },
                { title: t('landing.features.card1_t2') },
                { title: t('landing.features.card1_t3') }
              ].map((card, i) => (
                <div 
                  key={i} 
                  className={`absolute top-0 left-0 w-full bg-[#F2F0E9] rounded-2xl p-6 border border-black/5 transition-all duration-700 ease-out`}
                  style={{ 
                    opacity: activeCard === i ? 1 : 0.4,
                    transform: `translateY(${(i - activeCard) * 20}px) scale(${activeCard === i ? 1 : 0.95})`,
                    zIndex: activeCard === i ? 10 : 0
                  }}
                >
                  <p className="font-outfit font-bold text-lg text-[#1A1A1A] leading-snug">{card.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Live Telemetry */}
          <div className="bg-[#1A1A1A] rounded-[2rem] p-8 md:p-12 shadow-xl shadow-black/20 min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">{t('landing.features.card2_label')}</div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <div className="flex-1 flex items-end">
              <div className="font-mono text-sm text-white/80 min-h-[2.5rem] w-full relative">
                <span className="text-emerald-400">~/_</span> {terminalMessages[terminalStep]}
                <span className="inline-block w-2 h-4 bg-[#CC5833] ml-1 animate-pulse align-middle" />
              </div>
            </div>
          </div>

          {/* Protocol Automation */}
          <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-black/5 min-h-[400px] flex flex-col relative overflow-hidden">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#2E4036] mb-8">{t('landing.features.card3_label')}</div>
            
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="grid grid-cols-7 gap-2 mb-6 w-full">
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <div key={i} className={`h-8 rounded flex items-center justify-center text-xs font-bold transition-colors duration-300 ${cursorStep >= 1 && i === 2 ? 'bg-[#2E4036] text-white' : 'bg-[#F2F0E9] text-[#1A1A1A]'}`}>
                    {d}
                  </div>
                ))}
              </div>
              
              <div className={`transition-all duration-500 transform ${cursorStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-[#1A1A1A] text-white rounded-full px-6 py-3 font-outfit text-sm font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#CC5833]" /> {t('landing.features.card3_lock')}
                </div>
              </div>

              <div className={`absolute bottom-0 text-[10px] font-mono text-emerald-600 transition-opacity duration-300 w-full text-center ${cursorStep === 3 ? 'opacity-100' : 'opacity-0'}`}>
                {t('landing.features.card3_status')}
              </div>

              {/* Cursor SVG */}
              <MousePointer2 
                className={`w-6 h-6 text-[#1A1A1A] absolute transition-all duration-700 ease-in-out`}
                style={{
                  top: cursorStep === 0 ? '80%' : cursorStep === 1 ? '10%' : cursorStep === 2 ? '55%' : '80%',
                  left: cursorStep === 0 ? '80%' : cursorStep === 1 ? '40%' : cursorStep === 2 ? '50%' : '80%',
                  transform: cursorStep === 1 || cursorStep === 2 ? 'scale(0.8)' : 'scale(1)',
                }}
              />
            </div>
          </div>

        </div>
      </section>

      {/* Manifesto */}
      <section className="manifesto-section h-[100dvh] bg-[#1A1A1A] flex items-center justify-center relative px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2000&auto=format&fit=crop")', backgroundAttachment: 'fixed', backgroundSize: 'cover' }} />
        
        <div className="max-w-4xl relative z-10 text-center">
          <h2 className="manifesto-line text-4xl md:text-6xl font-sans font-bold text-white/40 tracking-tighter mb-4 text-inherit">
            {t('landing.manifesto.t1')}
          </h2>
          <h2 className="manifesto-line text-5xl md:text-7xl font-serif italic text-white tracking-tight mb-16 leading-tight text-inherit">
            {t('landing.manifesto.t2_1')}<br/>{t('landing.manifesto.t2_2')}
          </h2>
          <p className="manifesto-line font-mono text-sm md:text-base text-[#CC5833] uppercase tracking-widest leading-loose">
            {t('landing.manifesto.t3')}
          </p>
        </div>
      </section>

      {/* Archive Cards */}
      <section id="services" className="relative bg-[#F2F0E9] pb-[100px]">
        {[
          {
            title: t('landing.archive.card1_title'),
            bullets: [t('landing.archive.card1_b1'), t('landing.archive.card1_b2'), t('landing.archive.card1_b3')]
          },
          {
            title: t('landing.archive.card2_title'),
            bullets: [t('landing.archive.card2_b1'), t('landing.archive.card2_b2'), t('landing.archive.card2_b3')]
          },
          {
            title: t('landing.archive.card3_title'),
            bullets: [t('landing.archive.card3_b1'), t('landing.archive.card3_b2'), t('landing.archive.card3_b3')]
          }
        ].map((card, i) => (
          <div key={i} className={`archive-card h-[100dvh] w-full flex items-center justify-center p-6 ${i === 0 ? 'bg-[#2E4036] text-white' : i === 1 ? 'bg-[#1A1A1A] text-white' : 'bg-white border-t border-black/10 text-[#1A1A1A]'} will-change-transform rounded-b-[3rem]`}>
            <div className="max-w-5xl w-full grid md:grid-cols-2 gap-16 items-center">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-50 mb-6">{t('landing.archive.label', { num: i + 1 })}</p>
                <h2 className="text-4xl md:text-6xl font-outfit font-bold tracking-tighter mb-8 leading-[1.1] text-inherit">{card.title}</h2>
                <ul className="space-y-6">
                  {card.bullets.map((b, j) => (
                    <li key={j} className="flex gap-4 items-start">
                      <ChevronRight className={`w-5 h-5 shrink-0 mt-0.5 ${i === 2 ? 'text-[#CC5833]' : 'text-emerald-400'}`} />
                      <span className={`text-lg font-light ${i === 2 ? 'text-[#1A1A1A]/80' : 'text-white/80'}`}>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hidden md:flex justify-center">
                <div className={`w-64 h-64 rounded-full border border-current opacity-20 relative animate-[spin_20s_linear_infinite]`}>
                  <div className="absolute top-0 left-1/2 w-4 h-4 bg-current rounded-full -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-current rounded-full -translate-x-1/2 translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Security Handout */}
      <section id="security" className="py-32 px-6 bg-[#1A1A1A] text-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-outfit font-bold tracking-tighter mb-16 text-center text-inherit">{t('landing.security.title')}</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border border-white/10 rounded-[2rem] p-10 bg-white/5 backdrop-blur-sm">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mb-6" />
              <h3 className="text-xl font-bold font-outfit mb-4 text-inherit">{t('landing.security.c1_title')}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{t('landing.security.c1_desc')}</p>
            </div>
            
            <div className="border border-white/10 rounded-[2rem] p-10 bg-white/5 backdrop-blur-sm">
              <Lock className="w-10 h-10 text-[#CC5833] mb-6" />
              <h3 className="text-xl font-bold font-outfit mb-4 text-inherit">{t('landing.security.c2_title')}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{t('landing.security.c2_desc')}</p>
            </div>
            
            <div className="border border-emerald-900 rounded-[2rem] p-10 bg-[#2E4036]/20 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full" />
              <Server className="w-10 h-10 text-emerald-300 mb-6 relative z-10" />
              <h3 className="text-xl font-bold font-outfit mb-4 relative z-10 text-inherit">{t('landing.security.c3_title')}</h3>
              <p className="text-white/60 text-sm leading-relaxed relative z-10">{t('landing.security.c3_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Access Methods */}
      <section className="py-32 px-6 bg-[#F2F0E9] text-[#1A1A1A]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-serif italic text-3xl mb-16 text-[#1A1A1A]/70 text-inherit">{t('landing.pricing.title')}</h2>
          
          <div className="grid md:grid-cols-3 gap-6 items-center">
            <div className="bg-white rounded-[2rem] p-10 border border-black/5">
              <h3 className="font-outfit font-bold text-2xl mb-2 text-inherit">{t('landing.pricing.c1_title')}</h3>
              <ul className="space-y-4 my-10 min-h-[150px]">
                <li className="text-sm font-medium text-[#1A1A1A]/70 flex items-start gap-3"><ChevronRight className="w-4 h-4 shrink-0 text-[#2E4036]" /> {t('landing.pricing.c1_b1')}</li>
                <li className="text-sm font-medium text-[#1A1A1A]/70 flex items-start gap-3"><ChevronRight className="w-4 h-4 shrink-0 text-[#2E4036]" /> {t('landing.pricing.c1_b2')}</li>
                <li className="text-sm font-medium text-[#1A1A1A]/70 flex items-start gap-3"><ChevronRight className="w-4 h-4 shrink-0 text-[#2E4036]" /> {t('landing.pricing.c1_b3')}</li>
              </ul>
              <button className="w-full py-4 rounded-full border border-black/10 font-bold text-sm hover:bg-[#1A1A1A] hover:text-white transition-colors">{t('landing.pricing.c1_btn')}</button>
            </div>
            
            <div className="bg-[#2E4036] rounded-[2rem] p-10 text-white shadow-2xl relative scale-100 md:scale-105 z-10">
              <div className="absolute top-4 right-4 bg-emerald-500 text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full text-[#1A1A1A]">{t('landing.pricing.c2_badge')}</div>
              <h3 className="font-outfit font-bold text-2xl mb-2 text-inherit">{t('landing.pricing.c2_title')}</h3>
              <ul className="space-y-4 my-10 min-h-[150px]">
                <li className="text-sm font-medium text-white/80 flex items-start gap-3"><ChevronRight className="w-4 h-4 shrink-0 text-emerald-400" /> {t('landing.pricing.c2_b1')}</li>
                <li className="text-sm font-medium text-white/80 flex items-start gap-3"><ChevronRight className="w-4 h-4 shrink-0 text-emerald-400" /> {t('landing.pricing.c2_b2')}</li>
                <li className="text-sm font-medium text-white/80 flex items-start gap-3"><ChevronRight className="w-4 h-4 shrink-0 text-emerald-400" /> {t('landing.pricing.c2_b3')}</li>
              </ul>
              <button className="w-full py-4 rounded-full bg-[#CC5833] font-bold text-sm hover:bg-[#b04a29] transition-colors relative overflow-hidden group">
                <span className="relative z-10">{t('landing.pricing.c2_btn')}</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>
            
            <div className="bg-white rounded-[2rem] p-10 border border-black/5">
              <h3 className="font-outfit font-bold text-2xl mb-2 text-inherit">{t('landing.pricing.c3_title')}</h3>
              <ul className="space-y-4 my-10 min-h-[150px]">
                <li className="text-sm font-medium text-[#1A1A1A]/70 flex items-start gap-3"><ChevronRight className="w-4 h-4 shrink-0 text-[#2E4036]" /> {t('landing.pricing.c3_b1')}</li>
                <li className="text-sm font-medium text-[#1A1A1A]/70 flex items-start gap-3"><ChevronRight className="w-4 h-4 shrink-0 text-[#2E4036]" /> {t('landing.pricing.c3_b2')}</li>
                <li className="text-sm font-medium text-[#1A1A1A]/70 flex items-start gap-3"><ChevronRight className="w-4 h-4 shrink-0 text-[#2E4036]" /> {t('landing.pricing.c3_b3')}</li>
              </ul>
              <button className="w-full py-4 rounded-full border border-black/10 font-bold text-sm hover:bg-[#1A1A1A] hover:text-white transition-colors">{t('landing.pricing.c3_btn')}</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="bg-[#1A1A1A] text-white pt-24 pb-8 px-6 rounded-t-[4rem] flex flex-col items-center">
        <div className="max-w-6xl w-full grid md:grid-cols-4 gap-12 mb-24">
          <div className="md:col-span-2">
            <h2 className="text-3xl font-black font-outfit mb-6 text-inherit">EvoComp</h2>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 w-fit px-4 py-2 rounded-full mb-8">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest opacity-80 uppercase">{t('landing.footer.badge')}</span>
            </div>
            <p className="font-mono text-xs text-white/40 max-w-sm">
              {t('landing.footer.desc')}
            </p>
          </div>
          
          <div className="flex flex-col gap-4">
            <h4 className="font-outfit font-bold text-sm opacity-50 mb-2 uppercase tracking-widest text-inherit">{t('landing.footer.sitemap')}</h4>
            <a href="#" className="text-sm hover:text-[#CC5833] transition-colors">{t('landing.footer.home')}</a>
            <a href="#services" className="text-sm hover:text-[#CC5833] transition-colors">{t('landing.footer.services')}</a>
            <a href="#advantage" className="text-sm hover:text-[#CC5833] transition-colors">{t('landing.footer.advantage')}</a>
            <a href="#security" className="text-sm hover:text-[#CC5833] transition-colors">{t('landing.footer.security')}</a>
            <a href="#about" className="text-sm hover:text-[#CC5833] transition-colors">{t('landing.footer.about')}</a>
          </div>
          
          <div className="flex flex-col gap-4">
            <h4 className="font-outfit font-bold text-sm opacity-50 mb-2 uppercase tracking-widest text-inherit">{t('landing.footer.legal')}</h4>
            <a href="#" className="text-sm hover:text-[#CC5833] transition-colors">{t('landing.footer.privacy')}</a>
            <a href="#" className="text-sm hover:text-[#CC5833] transition-colors">{t('landing.footer.terms')}</a>
            <a href="#" className="text-sm hover:text-[#CC5833] transition-colors mt-4">{t('landing.footer.contact')}</a>
            
            <div className="flex flex-wrap gap-3 text-[10px] font-mono font-bold text-white/30 mt-4">
              {availableLangs.map(lang => (
                <button 
                  key={lang}
                  onClick={() => i18n.changeLanguage(lang)}
                  className={`uppercase transition-colors hover:text-white ${i18n.language.startsWith(lang) ? 'text-[#CC5833]' : ''}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="text-center font-mono text-[10px] text-white/20 border-t border-white/10 w-full max-w-6xl pt-8">
          {t('landing.footer.rights', { year: currentYear })}
        </div>
      </footer>
    </div>
  );
}
