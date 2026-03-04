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
    <div className="p-10 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] w-full max-w-lg shadow-[var(--shadow-md)] overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 bg-[rgb(var(--bg-surface-2))] border-b border-[rgb(var(--border))]">
              <h3 className="text-3xl font-black text-[rgb(var(--text-primary))] tracking-tighter">Nuevo Ciclo</h3>
              <p className="text-[rgb(var(--text-secondary))] font-bold mt-2 text-lg">Configura un nuevo periodo de revisión.</p>
            </div>
            
            <div className="p-10 space-y-8">
              <div>
                <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-3">Nombre del Ciclo</label>
                <input 
                  type="text"
                  placeholder="ej. Revisión Salarial Q1 2026"
                  className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] px-5 py-4 text-sm text-[rgb(var(--text-primary))] font-bold outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all"
                  value={newCycle.name}
                  onChange={(e) => setNewCycle({ ...newCycle, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-3">Fecha Inicio</label>
                  <input 
                    type="date"
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] px-5 py-4 text-sm text-[rgb(var(--text-primary))] font-bold outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all"
                    value={newCycle.start_date}
                    onChange={(e) => setNewCycle({ ...newCycle, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-3">Fecha Fin</label>
                  <input 
                    type="date"
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] px-5 py-4 text-sm text-[rgb(var(--text-primary))] font-bold outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all"
                    value={newCycle.end_date}
                    onChange={(e) => setNewCycle({ ...newCycle, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-3">Presupuesto</label>
                  <input 
                    type="number"
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] px-5 py-4 text-sm text-[rgb(var(--text-primary))] font-bold outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all"
                    value={newCycle.budget_total}
                    onChange={(e) => setNewCycle({ ...newCycle, budget_total: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-3">Moneda</label>
                  <select 
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] px-5 py-4 text-sm text-[rgb(var(--text-primary))] font-bold outline-none cursor-pointer focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all appearance-none"
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

            <div className="p-10 bg-[rgb(var(--bg-surface-2))] border-t border-[rgb(var(--border))] flex justify-end gap-6">
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-8 py-4 text-xs font-black text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-all uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleCreateCycle}
                className="btn-premium px-10 py-4 text-xs"
              >
                Crear Ciclo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <h1 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter leading-none mb-3">
            Ciclos de Compensación
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-lg font-bold max-w-2xl leading-relaxed">
            Gestiona los periodos de revisión salarial, bonos y ajustes de equidad empresarial.
          </p>
        </div>
        <button 
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="btn-premium px-8 py-4 text-xs"
        >
          <Plus className="w-5 h-5" />
          Nuevo Ciclo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group">
          <div className="w-14 h-14 bg-[rgb(var(--bg-surface-2))] border border-[rgb(var(--border))] rounded-2xl flex items-center justify-center text-[rgb(var(--primary))] mb-6 group-hover:bg-[rgb(var(--primary))] group-hover:text-white transition-all transform group-hover:scale-110">
            <RefreshCw className="w-7 h-7" />
          </div>
          <p className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.2em] mb-2 font-mono">Ciclos Activos</p>
          <p className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{cycles.filter((c: Cycle) => c.status === 'active').length}</p>
        </div>
        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6 border border-amber-100 group-hover:bg-amber-600 group-hover:text-white transition-all transform group-hover:scale-110">
            <Clock className="w-7 h-7" />
          </div>
          <p className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.2em] mb-2 font-mono">En Planificación</p>
          <p className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{cycles.filter((c: Cycle) => c.status === 'planned').length}</p>
        </div>
        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all transform group-hover:scale-110">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <p className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.2em] mb-2 font-mono">Completados</p>
          <p className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{cycles.filter((c: Cycle) => c.status === 'completed').length}</p>
        </div>
      </div>

      <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="p-8 bg-[rgb(var(--bg-surface-2))] border-b border-[rgb(var(--border))] flex items-center justify-between">
          <h2 className="text-xl font-black text-[rgb(var(--text-primary))] tracking-tighter">Historial de Ciclos</h2>
        </div>

        <div className="divide-y divide-[rgb(var(--border))]">
          {loading ? (
            <div className="p-24 text-center text-[rgb(var(--text-muted))] flex flex-col items-center gap-4">
              <RefreshCw className="w-10 h-10 animate-spin" />
              <p className="font-black uppercase tracking-[0.2em] text-xs">Cargando ciclos...</p>
            </div>
          ) : cycles.length === 0 ? (
            <div className="p-32 text-center bg-[rgb(var(--bg-surface))]">
              <div className="w-24 h-24 bg-[rgb(var(--bg-surface-2))] border border-[rgb(var(--border))] rounded-3xl flex items-center justify-center mx-auto mb-8 text-[rgb(var(--text-muted))] shadow-inner">
                <Calendar className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-[rgb(var(--text-primary))] mb-3 tracking-tighter">No hay ciclos configurados</h3>
              <p className="text-[rgb(var(--text-secondary))] text-lg font-bold max-w-sm mx-auto mb-10">
                Comienza creando un nuevo ciclo de revisión para gestionar aumentos y presupuestos estratégicos.
              </p>
              <button type="button" className="text-[rgb(var(--primary))] font-black uppercase tracking-widest text-xs hover:underline decoration-2 underline-offset-8">
                Aprender más sobre ciclos
              </button>
            </div>
          ) : (
            cycles.map((cycle: Cycle) => (
              <div key={cycle.id} className="p-8 hover:bg-[rgb(var(--bg-surface-2))] transition-all flex items-center justify-between group">
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 bg-[rgb(var(--bg-surface-2))] border border-[rgb(var(--border))] rounded-2xl flex items-center justify-center text-[rgb(var(--text-muted))] group-hover:bg-[rgb(var(--bg-surface))] group-hover:text-[rgb(var(--primary))] group-hover:shadow-[var(--shadow-sm)] transition-all duration-500">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-[rgb(var(--text-primary))] tracking-tight group-hover:text-[rgb(var(--primary))] transition-colors">{cycle.name}</h4>
                    <div className="flex items-center gap-5 text-sm font-bold text-[rgb(var(--text-secondary))]">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                        {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                        -- empleados
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase border-2 shadow-sm ${getStatusColor(cycle.status)}`}>
                    {cycle.status}
                  </div>
                  <button type="button" className="w-12 h-12 border border-transparent bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] hover:bg-[rgb(var(--bg-surface))] hover:border-[rgb(var(--border))] hover:shadow-[var(--shadow-sm)] rounded-2xl transition-all duration-300 flex items-center justify-center group-hover:translate-x-1">
                    <ChevronRight className="w-6 h-6" />
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
