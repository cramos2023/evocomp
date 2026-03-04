import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Users, Database, Calculator, ClipboardCheck, 
  BarChart3, ShieldCheck, Settings, Layers, 
  FileUp, History, Sparkles, ChevronRight, Inbox,
  HelpCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { approvalsApi } from '../services/approvalsApi';
import { supabase } from '../lib/supabaseClient';

interface SidebarItem {
  name: string;
  icon: any;
  href?: string;
  onClick?: () => void;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

const Sidebar = ({ onStartTour }: { onStartTour?: () => void }) => {
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

  const sections: SidebarSection[] = [
    {
      title: t('sidebar.strategy'),
      items: [
        { name: t('dashboard.title'), icon: Sparkles, href: '/app' },
        { name: t('sidebar.scenarios'), icon: Calculator, href: '/app/comp/scenarios' },
        ...(isAdmin ? [
          { name: t('sidebar.cycles'), icon: Layers, href: '/app/comp/cycles' },
        ] : []),
        { name: t('sidebar.pay_bands'), icon: BarChart3, href: '/app/pay-bands' },
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
        ...(isAdmin ? [
          { name: t('sidebar.snapshots'), icon: History, href: '/app/data/snapshots' },
        ] : []),
        { name: t('sidebar.audit_log'), icon: Database, href: '/app/audit-log' },
      ]
    },
    ...(isAdmin ? [{
      title: t('sidebar.admin'),
      items: [
        { name: t('sidebar.tenants'), icon: Settings, href: '/app/admin/tenants' },
        { name: t('sidebar.users'), icon: Users, href: '/app/admin/users' },
        { name: t('merit_admin.sidebar_label'), icon: ShieldCheck, href: '/app/admin/merit-cycle' },
      ]
    }] : []),
    {
      title: t('sidebar.resources', { defaultValue: 'RESOURCES' }),
      items: [
        { name: t('sidebar.take_tour', { defaultValue: 'Take a Tour' }), icon: HelpCircle, onClick: onStartTour } as SidebarItem,
      ]
    }
  ];

  return (
    <aside className="w-[280px] bg-[rgb(var(--surface-shell))] border-r border-[rgb(var(--border))] flex flex-col h-screen sticky top-0 z-50 overflow-hidden transition-colors duration-500">
      
      <div className="p-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[rgb(var(--primary))] rounded-xl flex items-center justify-center shadow-lg shadow-[rgba(46,79,210,0.2)] rotate-3 group cursor-pointer hover:rotate-0 transition-transform duration-300">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-black text-[rgb(var(--text-primary))] tracking-tighter block transition-colors leading-none mb-0.5">EvoComp</span>
            <span className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest block">Intelligence</span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-8 relative z-10">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="px-4 text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em] transition-colors">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item: SidebarItem) => (
                <NavLink
                  key={item.href || item.name}
                  to={item.href || '#'}
                  onClick={(e) => {
                    if (item.onClick) {
                      e.preventDefault();
                      item.onClick();
                    }
                  }}
                  className={({ isActive }) => 
                    `flex items-center justify-between group px-4 py-2.5 rounded-[var(--radius-btn)] text-sm font-bold transition-all duration-200 ${
                      isActive && item.href && item.href !== '#'
                        ? 'bg-[rgba(46,79,210,0.08)] text-[rgb(var(--primary))]' 
                        : 'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-surface-2))]'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-[18px] h-[18px] transition-transform group-hover:scale-110 ${
                      item.name === t('sidebar.reports') || item.name === t('sidebar.scenarios') || item.name === t('sidebar.pay_bands') 
                        ? '' 
                        : ''
                    }`} />
                    {item.name}
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-all opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0`} />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      
      <div className="p-6 relative z-10">
        <div className="bg-[rgb(var(--bg-surface-2))] rounded-[20px] p-4 border border-[rgb(var(--border))] relative group cursor-pointer overflow-hidden transition-colors">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-[rgb(var(--primary))] uppercase tracking-widest">{t('sidebar.platform_status')}</span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              </div>
            </div>
            <p className="text-xs text-[rgb(var(--text-primary))] font-black leading-relaxed transition-colors tracking-tight">
              {t('sidebar.mvp_mode')}
            </p>
            <p className="text-[10px] text-[rgb(var(--text-muted))] mt-1 font-bold transition-colors">
              {t('sidebar.secure_engine')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
