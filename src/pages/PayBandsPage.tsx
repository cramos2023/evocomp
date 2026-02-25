import React, { useEffect, useState } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, 
  TrendingUp, DollarSign, Layers, ArrowUpDown
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const PayBandsPage = () => {
  const [bands, setBands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBands();
  }, []);

  async function fetchBands() {
    try {
      const { data, error } = await supabase
        .from('pay_bands')
        .select('*')
        .order('job_family', { ascending: true })
        .order('level', { ascending: true });
      
      if (error) throw error;
      setBands(data || []);
    } catch (err) {
      console.error('Error fetching pay bands:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pay Bands</h1>
          <p className="text-slate-500 mt-1">Manage compensation ranges, midpoints, and spreads across job families.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20">
          <Plus className="w-4 h-4" />
          Create Band
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">Total Bands</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">{bands.length}</h3>
            <Layers className="w-5 h-5 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">Avg. Spread</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">45%</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 flex items-center gap-4 bg-blue-50/30 border-blue-100">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-900">Global Currency Policy</p>
            <p className="text-xs text-blue-700">All local currency bands are automatically converted using current FX rates in scenarios.</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              placeholder="Filter by family or level..." 
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Filter className="w-4 h-4" />
            Family
          </button>
          <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
            <ArrowUpDown className="w-4 h-4" />
            Refine
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading bands...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Job Family / Level</th>
                <th className="px-6 py-4">Currency</th>
                <th className="px-6 py-4">Range (Min - Mid - Max)</th>
                <th className="px-6 py-4">Spread</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bands.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No pay bands defined yet. Click "Create Band" to get started.
                  </td>
                </tr>
              ) : (
                bands.map((band) => {
                  const spread = ((band.base_max - band.base_min) / band.base_min * 100).toFixed(0);
                  return (
                    <tr key={band.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{band.job_family}</p>
                        <p className="text-[11px] font-bold text-blue-600 uppercase tracking-tighter mt-0.5">Level {band.level}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded text-[11px]">{band.currency}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 w-full max-w-xs">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400">
                            <span>{band.base_min.toLocaleString()}</span>
                            <span className="text-slate-900">{band.base_mid.toLocaleString()}</span>
                            <span>{band.base_max.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full relative overflow-hidden">
                            <div className="absolute inset-y-0 bg-blue-500 rounded-full" style={{ left: '0%', right: '0%' }}></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-3 bg-slate-900 rounded-full border-2 border-white"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-700">{spread}%</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PayBandsPage;
