import React, { useEffect, useState } from 'react';
import { 
  UserPlus, Shield, Mail, Calendar, 
  MoreVertical, Search, ShieldCheck, ShieldAlert 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const UsersPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      // Fetch user profile + roles in a join
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user_roles (
            role_id
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }

  const getRoleBadge = (roles: any[]) => {
    if (!roles || roles.length === 0) return <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold uppercase">No Role</span>;
    
    // For MVP, usually 1 role. If COMP_ADMIN, highlight it.
    const isAdmin = roles.some(r => r.role_id === 'COMP_ADMIN');
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
        isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
      }`}>
        {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
        {roles[0].role_id}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Access Management</h1>
          <p className="text-slate-500 mt-1">Manage collaborators and their permission levels within your organization.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20">
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              placeholder="Filter by name or email..." 
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="flex gap-2 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> COMP_ADMIN: Full Access</span>
            <span className="flex items-center gap-1 mx-2">|</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> COMP_ANALYST: Model Only</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            Loading collaborators...
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined At</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 border border-slate-200">
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{user.full_name || 'Anonymous User'}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getRoleBadge(user.user_roles)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                      user.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-slate-900">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-8 p-6 bg-blue-600 rounded-3xl text-white flex items-center justify-between overflow-hidden relative group">
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 text-white shrink-0">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Data Security Protocols</h3>
            <p className="text-blue-100 text-sm max-w-lg mt-1">
              EvoComp uses Row Level Security (RLS) to ensure that users only access data from their assigned tenant. 
              Role-based restrictions apply for cycle approvals and snapshot deletions.
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 -mr-32 -mt-32 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
      </div>
    </div>
  );
};

export default UsersPage;
