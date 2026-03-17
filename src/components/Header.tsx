import { Bell, Search, LogOut, User, Zap, Globe, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  profile: any;
}

const Header = ({ profile }: HeaderProps) => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

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
    <header className="h-20 bg-[rgb(var(--surface-shell))] dark:bg-black/60 dark:backdrop-blur-2xl border-b border-[rgb(var(--border))] dark:border-white/10 px-8 flex items-center justify-between sticky top-0 z-50 transition-all duration-500">
      <div className="flex items-center gap-6 flex-1">
        <div className="relative w-full max-w-lg group">
          <div className="relative flex items-center gap-4 bg-[rgb(var(--bg-surface-2))] px-4 py-2.5 rounded-[var(--radius-btn)] border border-[rgb(var(--border))] group-focus-within:ring-[3px] group-focus-within:ring-[rgba(46,79,210,0.18)] group-focus-within:border-[rgb(var(--primary))] transition-all">
            <Search className="w-5 h-5 text-[rgb(var(--text-muted))] group-focus-within:text-[rgb(var(--primary))] transition-colors" />
            <input 
              placeholder={t('header.search_placeholder', { defaultValue: 'Search scenarios, talent, or audit records...' })}
              className="bg-transparent border-none outline-none text-sm w-full text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted))] transition-colors"
            />
            <div className="flex items-center gap-1.5 bg-[rgb(var(--bg-surface))] px-2 py-1 rounded-lg border border-[rgb(var(--border))] shadow-sm transition-colors">
               <span className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase">Cmd</span>
               <span className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase">K</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2.5 bg-[rgb(var(--bg-surface-2))] hover:bg-[rgb(var(--bg-surface))] rounded-[var(--radius-btn)] border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--primary))] transition-all shadow-sm"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* Language Selector */}
        <div className="relative group/lang">
          <button className="flex items-center gap-3 px-4 py-2.5 bg-[rgb(var(--bg-surface-2))] hover:bg-[rgb(var(--bg-surface))] rounded-[var(--radius-btn)] border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] transition-all shadow-sm group-hover/lang:border-[rgb(var(--primary))] group/lang-btn">
            <Globe className="w-4 h-4 text-[rgb(var(--text-muted))] group-hover/lang-btn:text-[rgb(var(--primary))]" />
            <span className="text-xs font-black uppercase tracking-widest">{i18n.language.toUpperCase()}</span>
          </button>
          
          <div className="absolute right-0 mt-3 w-56 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-2xl shadow-[var(--shadow-md)] py-3 opacity-0 invisible group-hover/lang:opacity-100 group-hover/lang:visible transition-all duration-300 z-50">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full flex items-center gap-4 px-6 py-3.5 text-sm font-bold transition-all ${
                  i18n.language === lang.code 
                    ? 'text-[rgb(var(--primary))] bg-[rgba(46,79,210,0.08)]' 
                    : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-2))] hover:text-[rgb(var(--text-primary))]'
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <div className="flex-1 text-left">{lang.name}</div>
                {i18n.language === lang.code && <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--primary))]" />}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-8 bg-[rgb(var(--border))] mx-2" />
        
        <button className="relative p-3 bg-[rgb(var(--bg-surface-2))] hover:bg-[rgb(var(--bg-surface))] rounded-[var(--radius-btn)] border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--primary))] transition-all group shadow-sm">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[rgb(var(--bg-surface))] shadow-sm" />
        </button>

        <div className="flex items-center gap-4 ml-2 group/user relative cursor-pointer">
          <div className="flex flex-col items-end">
            <p className="text-xs font-black text-[rgb(var(--text-primary))] uppercase tracking-widest transition-colors mb-0.5">{profile?.full_name || 'System Admin'}</p>
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-blue-500 fill-blue-500" />
              <p className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest transition-colors">{profile?.role || 'Administrator'}</p>
            </div>
          </div>
          
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl p-0.5 shadow-lg group-hover/user:scale-105 transition-all">
            <div className="w-full h-full bg-[rgb(var(--bg-surface))] rounded-[14px] flex items-center justify-center border border-white/20">
              <User className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <div className="absolute right-0 top-full mt-3 w-64 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] shadow-[var(--shadow-md)] py-3 opacity-0 invisible group-hover/user:opacity-100 group-hover/user:visible transition-all duration-300 z-50 overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgb(var(--border))] mb-2">
              <p className="text-xs font-black text-[rgb(var(--text-muted))] uppercase tracking-tighter mb-1">Signed in as</p>
              <p className="text-sm font-black text-[rgb(var(--text-primary))] truncate">{profile?.email || 'admin@evocomp.com'}</p>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 text-sm font-black text-rose-500 hover:bg-rose-50 transition-all uppercase tracking-[0.2em]"
            >
              <LogOut className="w-4 h-4" /> {t('header.logout')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
