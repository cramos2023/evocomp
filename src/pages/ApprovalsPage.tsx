import React from 'react';
import { 
  CheckCircle2, Clock, XCircle, Users, 
  ArrowRight, ShieldCheck, Filter, Search
} from 'lucide-react';

const ApprovalsPage = () => {
  // Demo data for approval requests
  const requests = [
    {
      id: 'req-1',
      scenario: 'Merit Cycle 2026 - Americas',
      owner: 'Carlos Ramos',
      amount: '$1.2M',
      status: 'PENDING',
      level: 1,
      date: '2 hours ago',
      flags: 12
    },
    {
      id: 'req-2',
      scenario: 'Executive Bonus Model v2',
      owner: 'Jane Smith',
      amount: '$450K',
      status: 'APPROVED',
      level: 2,
      date: '1 day ago',
      flags: 2
    },
    {
      id: 'req-3',
      scenario: 'Engineering Re-levelling Q2',
      owner: 'Mark Thompson',
      amount: '$89K',
      status: 'REJECTED',
      level: 1,
      date: '3 days ago',
      flags: 45
    }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Governance & Approvals</h1>
          <p className="text-slate-500 mt-1">Review, approve, or reject compensation scenario proposals before publishing.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button className="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" /> My Actions
          </button>
          <button className="px-4 py-2 text-slate-500 rounded-lg text-sm font-bold hover:text-slate-900 transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" /> All Requests
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Queue Stats</h3>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Wait Time (Avg)</span>
                <span className="text-sm font-bold text-slate-900">4.2 hrs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Pending Amount</span>
                <span className="text-sm font-bold text-blue-600">$1,650,000</span>
              </div>
              <div className="pt-4 border-t border-slate-50">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500 h-full w-[60%]" />
                  <div className="bg-green-500 h-full w-[20%]" />
                  <div className="bg-red-500 h-full w-[20%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 text-white text-center relative overflow-hidden group">
            <ShieldCheck className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <h4 className="text-lg font-bold">Policy Guardrails</h4>
            <p className="text-slate-400 text-xs mt-1">Automatic RLS enforcement ensures multi-level privacy during approval flows.</p>
            <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="relative w-full max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  placeholder="Filter by scenario or owner..." 
                  className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4 text-balance">Proposed Scenario</th>
                  <th className="px-6 py-4">Financials</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{req.scenario}</p>
                      <p className="text-xs text-slate-400 mt-0.5">By {req.owner} • {req.date}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="bg-slate-100 text-[9px] font-bold text-slate-500 px-1.5 py-0.5 rounded tracking-tighter">LV {req.level} APPROVAL</span>
                        {req.flags > 10 && (
                          <span className="bg-orange-50 text-[9px] font-bold text-orange-600 px-1.5 py-0.5 rounded tracking-tighter">HIGH RISK ({req.flags} FLAGS)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{req.amount}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Budget Delta</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                        req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {req.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                        {req.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        {req.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="bg-white border border-slate-200 p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:border-slate-400 transition-all shadow-sm">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalsPage;
