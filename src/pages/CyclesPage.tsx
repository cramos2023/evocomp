import { useEffect, useState } from 'react';
import { 
  RefreshCw, Plus, Calendar, 
  ChevronRight, Users,
  Clock, CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Cycle {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  tenant_id: string;
  created_at: string;
}

const CyclesPage = () => {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCycle, setNewCycle] = useState({
    name: '',
    status: 'planned',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    budget_total: 0,
    currency: 'USD'
  });

  useEffect(() => {
    fetchCycles();
  }, []);

  async function fetchCycles() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "cycles" does not exist')) {
          console.warn('Cycles table not found, showing empty state.');
          setCycles([]);
        } else {
          throw error;
        }
      } else {
        setCycles(data || []);
      }
    } catch (err) {
      console.error('Error fetching cycles:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-50 text-green-700 border-green-100';
      case 'planned': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'completed': return 'bg-slate-50 text-slate-700 border-slate-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  async function handleCreateCycle() {
    if (!newCycle.name) {
      alert('Por favor asigna un nombre al ciclo.');
      return;
    }

    if (new Date(newCycle.end_date) < new Date(newCycle.start_date)) {
      alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error('No auth user');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', userRes.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant id');

      const { error } = await supabase
        .from('cycles')
        .insert({
          ...newCycle,
          tenant_id: profile.tenant_id
        });

      if (error) throw error;

      setShowCreateModal(false);
      setNewCycle({
        name: '',
        status: 'planned',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget_total: 0,
        currency: 'USD'
      });
      fetchCycles();
    } catch (err) {
      console.error('Error creating cycle:', err);
      alert('Error al crear el ciclo (verifica las restricciones de base de datos).');
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100">
              <h3 className="text-2xl font-bold text-slate-900">Nuevo Ciclo</h3>
              <p className="text-slate-500 mt-1">Configura un nuevo periodo de revisión.</p>
            </div>
            
            <div className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Ciclo</label>
                <input 
                  type="text"
                  placeholder="ej. Revisión Salarial Q1 2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={newCycle.name}
                  onChange={(e) => setNewCycle({ ...newCycle, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fecha Inicio</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newCycle.start_date}
                    onChange={(e) => setNewCycle({ ...newCycle, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fecha Fin</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newCycle.end_date}
                    onChange={(e) => setNewCycle({ ...newCycle, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Presupuesto</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newCycle.budget_total}
                    onChange={(e) => setNewCycle({ ...newCycle, budget_total: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Moneda</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newCycle.currency}
                    onChange={(e) => setNewCycle({ ...newCycle, currency: e.target.value })}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="MXN">MXN</option>
                    <option value="COP">COP</option>
                    <option value="CLP">CLP</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 text-slate-500 font-bold hover:text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleCreateCycle}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
              >
                Crear Ciclo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ciclos de Compensación</h1>
          <p className="text-slate-500 mt-1 max-w-xl">
            Gestiona los periodos de revisión salarial, bonos y ajustes de equidad.
          </p>
        </div>
        <button 
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nuevo Ciclo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
            <RefreshCw className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Ciclos Activos</p>
          <p className="text-3xl font-bold text-slate-900">{cycles.filter((c: Cycle) => c.status === 'active').length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">En Planificación</p>
          <p className="text-3xl font-bold text-slate-900">{cycles.filter((c: Cycle) => c.status === 'planned').length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Completados</p>
          <p className="text-3xl font-bold text-slate-900">{cycles.filter((c: Cycle) => c.status === 'completed').length}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Historial de Ciclos</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Cargando ciclos...</div>
          ) : cycles.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <Calendar className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No hay ciclos configurados</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-8">
                Comienza creando un nuevo ciclo de revisión para gestionar aumentos y presupuestos.
              </p>
              <button type="button" className="text-blue-600 font-bold hover:underline">
                Aprender más sobre ciclos
              </button>
            </div>
          ) : (
            cycles.map((cycle: Cycle) => (
              <div key={cycle.id} className="p-6 hover:bg-slate-50/50 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-md transition-all">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{cycle.name}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        -- empleados
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(cycle.status)}`}>
                    {cycle.status.toUpperCase()}
                  </div>
                  <button type="button" className="p-3 text-slate-300 hover:text-slate-900 hover:bg-white hover:shadow-md rounded-xl transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CyclesPage;
