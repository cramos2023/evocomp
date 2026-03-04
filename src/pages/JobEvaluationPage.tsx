import React, { useState } from "react";
import { Link } from "react-router-dom";
import EvaluationTable from "@/modules/job-evaluation/components/calculator/EvaluationTable";
import GlassCard from "@/modules/job-evaluation/components/ui/GlassCard";
import SidebarFilter from "@/modules/job-evaluation/components/filters/SidebarFilter";
import { Toaster } from "@/modules/job-evaluation/components/ui/toaster";
import { FilterState } from "@/modules/job-evaluation/components/filters/types";
import { Position } from "@/modules/job-evaluation/types/position";
import { FileDown, RefreshCw, X, Loader2, ArrowLeft } from "lucide-react";
import { jobEvaluationApi, EvaluationRunMeta } from "@/modules/job-evaluation/services/jobEvaluationApi";

import { useTranslation } from "react-i18next";

interface JobEvaluationPageProps {
  profile?: any;
}

const JobEvaluationPage: React.FC<JobEvaluationPageProps> = ({ profile }) => {
  const { t } = useTranslation("jobEvaluation");
  const [filters, setFilters] = useState<FilterState>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionCount, setPositionCount] = useState<number>(2);
  
  // Persistence state
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [savedRuns, setSavedRuns] = useState<EvaluationRunMeta[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    if (newFilters.initialRows && typeof newFilters.initialRows === 'number') {
      setPositionCount(newFilters.initialRows);
    }
  };

  const handlePositionsChange = (newPositions: Position[]) => {
    setPositions(newPositions);
  };

  const handleSave = async () => {
    if (!profile?.tenant_id) return alert(t("page.error_tenant"));
    if (positions.length === 0) return alert(t("page.error_no_positions"));
    
    const name = window.prompt(t("page.confirm_save_name"));
    if (!name?.trim()) return;

    setIsSaving(true);
    try {
      await jobEvaluationApi.saveEvaluationRun(name, positions, profile.tenant_id);
    } catch (e: any) {
      console.error(e);
      alert(t("page.error_save") + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenLoadModal = async () => {
    if (!profile?.tenant_id) return;
    setIsLoadModalOpen(true);
    setIsLoadingRuns(true);
    try {
      const runs = await jobEvaluationApi.getRunsList(profile.tenant_id);
      setSavedRuns(runs);
    } catch (e: any) {
      console.error(e);
      alert(t("page.error_load") + e.message);
    } finally {
      setIsLoadingRuns(false);
    }
  };

  const handleLoadRun = async (runId: string) => {
    if (!profile?.tenant_id) return;
    try {
      const loadedPositions = await jobEvaluationApi.loadEvaluationRun(runId, profile.tenant_id);
      setPositions(loadedPositions);
      setPositionCount(loadedPositions.length || 2);
      setIsLoadModalOpen(false);
    } catch (e: any) {
      console.error(e);
      alert(t("page.error_load") + e.message);
    }
  };

  return (
    <div className="p-10 max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-700">
      {/* Back to Workspace Link */}
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <Link 
          to="/workspace" 
          className="inline-flex items-center gap-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-colors font-bold text-xs uppercase tracking-widest group"
        >
          <div className="w-8 h-8 rounded-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] flex items-center justify-center group-hover:border-[rgb(var(--primary))] transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          {t("page.back_to_workspace")}
        </Link>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-10 relative">
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter leading-none mb-3">
            {t("page.title")}
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-lg font-bold max-w-2xl leading-relaxed">
            {t("page.subtitle")}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <button
            onClick={handleOpenLoadModal}
            className="group flex items-center justify-center gap-3 bg-[rgb(var(--bg-surface))] border-2 border-[rgb(var(--border))] hover:border-[rgb(var(--text-primary))] text-[rgb(var(--text-primary))] px-8 py-4 rounded-[var(--radius-btn)] font-black text-xs uppercase tracking-widest transition-all shadow-sm"
          >
            <RefreshCw className="w-5 h-5 text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text-primary))] transition-colors" />
            {t("page.load_matrix")}
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="btn-premium px-10 py-4 text-xs"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
            {isSaving ? t("page.saving") : t("page.save_matrix")}
          </button>
        </div>
      </div>

      {/* Main Evaluator Section */}
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Sidebar Filter */}
        <div className="w-full xl:w-[320px] xl:sticky xl:top-8 shrink-0">
          <SidebarFilter 
            onFilterChange={handleFilterChange} 
            isOpen={true}
            onToggle={() => {}}
            positions={positions}
          />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 w-full min-w-0 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] p-8">
          <EvaluationTable 
            initialRows={positionCount}
            filters={filters}
            onPositionsChange={handlePositionsChange}
          />
        </div>
      </div>

      {/* Simple Load Modal */}
      {isLoadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[rgb(var(--border))] flex justify-between items-center">
              <h2 className="text-xl font-bold font-outfit text-[rgb(var(--text-primary))]">{t("page.load_modal_title")}</h2>
              <button 
                onClick={() => setIsLoadModalOpen(false)}
                className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {isLoadingRuns ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--primary))]" />
                </div>
              ) : savedRuns.length === 0 ? (
                <div className="text-center py-8 text-[rgb(var(--text-muted))]">
                  {t("page.no_saved_matrices")}
                </div>
              ) : (
                savedRuns.map(run => (
                  <button
                    key={run.id}
                    onClick={() => handleLoadRun(run.id)}
                    className="w-full text-left p-4 rounded-xl border border-[rgb(var(--border))] hover:border-[rgb(var(--primary))] hover:bg-[rgb(var(--bg-surface-2))] transition-all group flex flex-col gap-1"
                  >
                    <span className="font-bold text-[rgb(var(--text-primary))] group-hover:text-[rgb(var(--primary))] transition-colors">
                      {run.name}
                    </span>
                    <span className="text-xs font-mono text-[rgb(var(--text-muted))]">
                      {new Date(run.created_at).toLocaleDateString()}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <Toaster />
    </div>
  );
};

export default JobEvaluationPage;

