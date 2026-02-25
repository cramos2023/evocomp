import { Bell, Search, LogOut, User, Zap, Globe } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  profile: any;
}

const Header = ({ profile }: HeaderProps) => {
  const { t, i18n } = useTranslation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  ];

  return (
    <header className="h-20 bg-slate-950/50 backdrop-blur-xl border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-6 flex-1">
        <div className="relative w-full max-w-lg group">
          <div className="absolute inset-0 bg-blue-600/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-4 bg-slate-900/50 px-4 py-2.5 rounded-2xl border border-white/5 group-focus-within:border-blue-500/50 transition-all">
            <Search className="w-5 h-5 text-slate-500 group-focus-within:text-blue-500" />
            <input 
              placeholder={t('header.search_placeholder', { defaultValue: 'Search scenarios, talent, or audit records...' })}
              className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-slate-600"
            />
            <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
               <span className="text-[10px] font-bold text-slate-400">⌘</span>
               <span className="text-[10px] font-bold text-slate-400">K</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Language Selector */}
        <div className="relative group/lang mr-2">
          <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all text-xs font-bold">
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="uppercase">{i18n.language.split('-')[0]}</span>
          </button>
          
          <div className="absolute top-full right-0 pt-2 w-40 opacity-0 translate-y-2 pointer-events-none group-hover/lang:opacity-100 group-hover/lang:translate-y-0 group-hover/lang:pointer-events-auto transition-all z-50">
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2">
              {languages.map((lng) => (
                <button
                  key={lng.code}
                  onClick={() => changeLanguage(lng.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/5 ${
                    i18n.language.startsWith(lng.code) ? 'text-blue-400 bg-blue-500/5' : 'text-slate-400'
                  }`}
                >
                  <span className="text-base">{lng.flag}</span>
                  {lng.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all text-xs font-bold uppercase tracking-wider">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            {t('header.quick_actions')}
          </button>
          
          <button className="relative p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all group">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-slate-950 group-hover:scale-110 transition-transform"></span>
          </button>
        </div>

        <div className="h-10 w-px bg-white/5"></div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white tracking-tight">{profile?.full_name || 'System Administrator'}</p>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
               <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
               <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.1em]">{t('header.verified_admin')}</p>
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-600/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-blue-500/50 transition-all cursor-pointer">
              <User className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/20 text-red-400 hover:text-red-300 transition-all"
            title={t('header.sign_out')}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
