import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Users, Database, Calculator, ClipboardCheck, 
  BarChart3, ShieldCheck, Settings, Layers, 
  FileUp, History, Sparkles, ChevronRight, Inbox
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { approvalsApi } from '../services/approvalsApi';
import { supabase } from '../lib/supabaseClient';

const Sidebar = () => {
  const { t } = useTranslation();
  const [visibility, setVisibility] = React.useState({ hasMyPlan: false, hasInbox: false });
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const checkAccess = async () => {
      try {
        const vis = await approvalsApi.checkVisibility();
        setVisibility(vis);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          
          const adminRoles = ['TENANT_ADMIN', 'COMP_ADMIN'];
          setIsAdmin(roles?.some(r => adminRoles.includes(r.role)) || false);
        }
      } catch (err) {
        console.error('Sidebar access check failed:', err);
      }
    };
    checkAccess();
  }, []);

  const sections = [
    {
      title: t('sidebar.strategy'),
      items: [
        { name: t('sidebar.scenarios'), icon: Calculator, href: '/app/comp/scenarios' },
        { name: t('sidebar.cycles'), icon: Layers, href: '/app/comp/cycles' },
        { name: t('sidebar.pay_bands'), icon: BarChart3, href: '/app/comp/bands' },
      ]
    },
    {
      title: t('sidebar.intelligence'),
      items: [
        { name: t('sidebar.reports'), icon: ShieldCheck, href: '/app/reports' },
        { 
          name: t('sidebar.approvals'), 
          icon: ClipboardCheck, 
          href: isAdmin || visibility.hasInbox ? '/app/approvals/inbox' : '/app/approvals/my-plan' 
        },
      ]
    },
    {
      title: t('sidebar.approvals_section'),
      items: [
        ...(visibility.hasMyPlan ? [{ name: t('sidebar.my_plan'), icon: Calculator, href: '/app/approvals/my-plan' }] : []),
        ...(visibility.hasInbox || isAdmin ? [{ name: t('sidebar.inbox'), icon: Inbox, href: '/app/approvals/inbox' }] : []),
      ].filter(Boolean)
    },
    {
      title: t('sidebar.data_backbone'),
      items: [
        { name: t('sidebar.imports'), icon: FileUp, href: '/app/data/imports' },
        { name: t('sidebar.snapshots'), icon: History, href: '/app/data/snapshots' },
        { name: t('sidebar.audit_log'), icon: Database, href: '/app/audit' },
      ]
    },
    {
      title: t('sidebar.admin'),
      items: [
        { name: t('sidebar.tenants'), icon: Settings, href: '/app/admin/tenants' },
        { name: t('sidebar.users'), icon: Users, href: '/app/admin/users' },
        { name: t('merit_admin.sidebar_label'), icon: ShieldCheck, href: '/app/admin/merit-cycle' },
      ]
    }
  ];

  return (
    <aside className="w-[280px] bg-slate-950 border-r border-white/5 flex flex-col h-screen sticky top-0 z-50 overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full" />
      
      <div className="p-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 rotate-3 group cursor-pointer hover:rotate-0 transition-transform duration-300">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-tight block">EvoComp</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest -mt-1 block">Intelligence</span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-8 relative z-10">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) => 
                    `flex items-center justify-between group px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-blue-600/10 text-white border border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.05)]' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-[18px] h-[18px] transition-transform group-hover:scale-110" />
                    {item.name}
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-all opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 cursor-pointer`} />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      
      <div className="p-6 relative z-10">
        <div className="bg-slate-900/40 backdrop-blur-md rounded-[20px] p-4 border border-white/5 relative group cursor-pointer overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{t('sidebar.platform_status')}</span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              </div>
            </div>
            <p className="text-xs text-slate-300 font-semibold leading-relaxed">
              {t('sidebar.mvp_mode')}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              {t('sidebar.secure_engine')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
