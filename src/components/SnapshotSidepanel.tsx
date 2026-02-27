import React, { useEffect, useState } from 'react';
import { X, Users, Calendar, Shield, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.ts';

interface Snapshot {
  id: string;
  name: string;
  headcount: number;
  snapshot_date: string;
  created_at: string;
}

interface SnapshotSidepanelProps {
  snapshotId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const SnapshotSidepanel: React.FC<SnapshotSidepanelProps> = ({ snapshotId, isOpen, onClose }) => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ avgSalary: number; totalSalary: number; currencies: string[] }>({
    avgSalary: 0,
    totalSalary: 0,
    currencies: []
  });

  useEffect(() => {
    if (snapshotId && isOpen) {
      fetchSnapshotDetails();
    }
  }, [snapshotId, isOpen]);

  async function fetchSnapshotDetails() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch metadata
      const { data: snap, error: snapErr } = await supabase
        .from('snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single();

      if (snapErr) throw snapErr;
      setSnapshot(snap);

      // 2. Fetch some basic stats from employee data
      const { data: employees, error: empErr } = await supabase
        .from('snapshot_employee_data')
        .select('base_salary_base, local_currency')
        .eq('snapshot_id', snapshotId);

      if (empErr) throw empErr;

      if (employees && employees.length > 0) {
        const total = employees.reduce((acc, curr) => acc + (curr.base_salary_base || 0), 0);
        const uniqueCurrencies = Array.from(new Set(employees.map(e => e.local_currency)));
        setStats({
          totalSalary: total,
          avgSalary: total / employees.length,
          currencies: uniqueCurrencies
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error fetching snapshot:', error);
      setError(error.message || 'Error al cargar los detalles');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md flex flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Detalles del Snapshot</h2>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Datos de Origen</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="space-y-6">
                <div className="h-24 bg-slate-50 rounded-2xl animate-pulse" />
                <div className="space-y-3">
                  <div className="h-4 bg-slate-50 w-1/2 rounded animate-pulse" />
                  <div className="h-4 bg-slate-50 w-3/4 rounded animate-pulse" />
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ) : snapshot ? (
              <div className="space-y-8">
                {/* Meta Info */}
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{snapshot.name}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(snapshot.snapshot_date).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {snapshot.headcount} empleados</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Masa Salarial</p>
                      <p className="text-xl font-bold text-slate-900">${Math.round(stats.totalSalary).toLocaleString()}</p>
                    </div>
                    <div className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Promedio</p>
                      <p className="text-xl font-bold text-slate-900">${Math.round(stats.avgSalary).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Data Integrity Section */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Database className="w-3.5 h-3.5" /> Integridad de los Datos
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50/50 border border-green-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-slate-700">Monedas Detectadas</span>
                      </div>
                      <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        {stats.currencies.join(', ')}
                      </span>
                    </div>
                    {/* Placeholder for future specific integrity checks */}
                    <div className="p-3 border border-slate-100 rounded-xl flex items-center justify-between text-sm">
                      <span className="text-slate-500">Niveles / Grados</span>
                      <span className="font-bold text-slate-700">Detectados</span>
                    </div>
                  </div>
                </div>

                {/* Audit Info */}
                <div className="pt-6 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400">
                    ID del Snapshot: <span className="font-mono">{snapshot.id}</span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Creado el: {new Date(snapshot.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <button 
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
            >
              Cerrar Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnapshotSidepanel;
