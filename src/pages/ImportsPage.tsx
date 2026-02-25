import React, { useEffect, useState } from 'react';
import { 
  FileUp, FileText, CheckCircle2, AlertCircle, 
  Loader2, History, Database, ArrowRight, Trash2 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const ImportsPage = () => {
  const [imports, setImports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchImports();
  }, []);

  async function fetchImports() {
    try {
      const { data, error } = await supabase
        .from('imports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setImports(data || []);
    } catch (err) {
      console.error('Error fetching imports:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. In a real scenario, we'd upload to Supabase Storage first.
      // 2. Then call the 'import-engine' edge function.
      // For this MVP UI demonstration, we simulate the registry entry.
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user session");

      const { data, error } = await supabase
        .from('imports')
        .insert({
          filename: file.name,
          status: 'PENDING',
          row_count: 0
        })
        .select()
        .single();

      if (error) throw error;
      
      // Simulate processing
      setTimeout(() => fetchImports(), 2000);
      
      alert("File upload simulated. In a full implementation, this triggers the 'import-engine' Edge Function.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight text-balance">Data Backbone</h1>
          <p className="text-slate-500 mt-1">Import employee data and manage snapshots for compensation modeling.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden sticky top-24">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <FileUp className="w-5 h-5 text-blue-600" />
                Upload Dataset
              </h2>
            </div>
            <div className="p-6">
              <label className="group relative border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900">Click to upload CSV</p>
                  <p className="text-xs text-slate-500 mt-1">Maximum 50MB</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv" 
                  disabled={uploading}
                  onChange={handleFileUpload}
                />
              </label>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <span className="font-bold text-slate-700 block">Schema Validation</span>
                    Required columns: employee_id, email, salary, currency.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <span className="font-bold text-slate-700 block">Deduplication</span>
                    Existing records will be updated based on employee_id.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-400" />
                Import History
              </h2>
            </div>
            
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto" />
              </div>
            ) : imports.length === 0 ? (
              <div className="p-20 text-center text-slate-400">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No imports registered yet.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">File / Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Rows</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {imports.map((imp) => (
                    <tr key={imp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{imp.filename}</p>
                        <p className="text-xs text-slate-500">{new Date(imp.created_at).toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                          imp.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                          imp.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {imp.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
                          {imp.status === 'FAILED' && <AlertCircle className="w-3 h-3" />}
                          {imp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-slate-600">
                        {imp.row_count || 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportsPage;
