import React from 'react';
import { Bell, Search, LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface HeaderProps {
  profile: any;
}

const Header = ({ profile }: HeaderProps) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 flex-1 max-w-md">
        <Search className="w-4 h-4 text-slate-400" />
        <input 
          placeholder="Search scenarios, employees..." 
          className="bg-transparent border-none outline-none text-sm w-full text-slate-600"
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="text-slate-400 hover:text-slate-600 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="h-8 w-px bg-slate-200"></div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{profile?.full_name || 'User'}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Admin</p>
          </div>
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
            <User className="w-5 h-5 text-slate-400" />
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
