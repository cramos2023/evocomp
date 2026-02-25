import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Users, Database, Calculator, ClipboardCheck, 
  BarChart3, ShieldCheck, Settings, Layers, 
  FileUp, History
} from 'lucide-react';

const Sidebar = () => {
  const sections = [
    {
      title: 'Strategy',
      items: [
        { name: 'Scenarios', icon: Calculator, href: '/app/comp/scenarios' },
        { name: 'Cycles', icon: Layers, href: '/app/comp/cycles' },
        { name: 'Pay Bands', icon: BarChart3, href: '/app/comp/bands' },
      ]
    },
    {
      title: 'Intelligence',
      items: [
        { name: 'Reports', icon: ShieldCheck, href: '/app/reports' },
        { name: 'Approvals', icon: ClipboardCheck, href: '/app/approvals' },
      ]
    },
    {
      title: 'Data Backbone',
      items: [
        { name: 'Imports', icon: FileUp, href: '/app/data/imports' },
        { name: 'Snapshots', icon: History, href: '/app/data/snapshots' },
        { name: 'Audit Log', icon: Database, href: '/app/audit' },
      ]
    },
    {
      title: 'Admin',
      items: [
        { name: 'Tenants', icon: Settings, href: '/app/admin/tenants' },
        { name: 'Users', icon: Users, href: '/app/admin/users' },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">E</div>
          <span className="text-xl font-bold text-white tracking-tight">EvoComp</span>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4 space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800">
          <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">MVP Mode</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Strategic Intelligence Platform v1.0
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
