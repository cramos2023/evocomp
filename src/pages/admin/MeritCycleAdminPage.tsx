// src/pages/admin/MeritCycleAdminPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Database,
  Lock,
  RefreshCcw,
  Shield,
  Users,
  X,
  FileSpreadsheet,
  Send,
  CheckCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import type {
  AdminClosureRow,
  ManagerClosureHistoryRow,
  ManagerPlanRowLite,
  MeritPayrollValidationReport,
  MeritCyclePublicationRow,
} from "@/types/meritAdmin";

import {
  listAdminClosuresByCycle,
  listCyclesLite,
  listManagerClosureHistoryForPlans,
  listManagerPlansByCycle,
  runMeritCycleAdmin,
  runMeritPayrollValidator,
  getPublishStatus,
  publishEffectiveRecs,
  exportPayrollCsv,
} from "@/services/meritAdminApi";
import { supabase } from "@/lib/supabaseClient";

type UiStatus = "idle" | "loading" | "success" | "error";

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
  title: string;
  description: string;
  commentLabel: string;
  commentPlaceholder: string;
  confirmLabel: string;
  cancelLabel: string;
  isLoading?: boolean;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  commentLabel,
  commentPlaceholder,
  confirmLabel,
  cancelLabel,
  isLoading,
}: ConfirmationModalProps) {
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 ring-1 ring-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {description}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {commentLabel}
            </label>
            <textarea
              autoFocus
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={commentPlaceholder}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-8">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => onConfirm(comment)}
              disabled={!comment.trim() || isLoading}
              className="flex-1 sm:flex-none px-8 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-slate-900/10 transition-all flex items-center justify-center gap-2"
            >
              {isLoading && <RefreshCcw className="w-4 h-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MeritCycleAdminPage() {
  const { t } = useTranslation();
  const [cyclesStatus, setCyclesStatus] = useState<UiStatus>("idle");
  const [cyclesError, setCyclesError] = useState<string | null>(null);
  const [cycles, setCycles] = useState<Array<{ id: string; label: string }>>([]);

  const [cycleId, setCycleId] = useState<string>("");

  const [validatorStatus, setValidatorStatus] = useState<UiStatus>("idle");
  const [validatorError, setValidatorError] = useState<string | null>(null);
  const [report, setReport] = useState<MeritPayrollValidationReport | null>(null);

  const [actionStatus, setActionStatus] = useState<UiStatus>("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOkMsg, setActionOkMsg] = useState<string | null>(null);

  const [closuresStatus, setClosuresStatus] = useState<UiStatus>("idle");
  const [closures, setClosures] = useState<AdminClosureRow[]>([]);
  const [closuresError, setClosuresError] = useState<string | null>(null);

  const [plansStatus, setPlansStatus] = useState<UiStatus>("idle");
  const [plans, setPlans] = useState<ManagerPlanRowLite[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);

  const [historyStatus, setHistoryStatus] = useState<UiStatus>("idle");
  const [history, setHistory] = useState<ManagerClosureHistoryRow[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Modal State
  const [pendingAction, setPendingAction] = useState<
    "lock_all_plans" | "close_cycle" | "reopen_cycle" | "publish_results" | null
  >(null);

  const [pubStatus, setPubStatus] = useState<UiStatus>("idle");
  const [publication, setPublication] = useState<MeritCyclePublicationRow | null>(null);

  const [scenariosStatus, setScenariosStatus] = useState<UiStatus>("idle");
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [publishReason, setPublishReason] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const [gatingDetails, setGatingDetails] = useState<{
    closed: boolean;
    plans_locked: boolean;
    validator_ok: boolean;
  } | null>(null);

  const canClose = useMemo(() => {
    if (!report) return false;
    return report.ok === true;
  }, [report]);

  const gatingStatus = useMemo(() => {
    // 1. Closed: check closures
    const isClosed = closures.length > 0 && closures[0].action === 'close';
    
    // 2. Plans Locked: check plan summary
    const totalPlans = plans.length;
    const lockedPlans = plans.filter(p => p.status === 'locked').length;
    const arePlansLocked = totalPlans > 0 && lockedPlans === totalPlans;

    // 3. Validator OK
    const isValidatorOk = report?.ok === true;

    return { isClosed, arePlansLocked, isValidatorOk };
  }, [closures, plans, report]);

  const canPublish = gatingStatus.isClosed && gatingStatus.arePlansLocked && gatingStatus.isValidatorOk;

  const hasCycleSelected = cycleId.trim().length > 0;

  const issueCounts = useMemo(() => {
    const issues = report?.issues ?? [];
    const errors = issues.filter((i) => i.severity === "error").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;
    return { errors, warnings };
  }, [report]);

  useEffect(() => {
    (async () => {
      try {
        setCyclesStatus("loading");
        setCyclesError(null);
        const rows = await listCyclesLite();

        const mapped = rows.map((c) => {
          const label =
            (c.name?.trim() && c.name) ||
            (c.title?.trim() && c.title) ||
            `${c.id.slice(0, 8)}…`;
          const status = c.status ? ` · ${c.status}` : "";
          return { id: c.id, label: `${label}${status}` };
        });

        setCycles(mapped);
        setCyclesStatus("success");

        if (!cycleId && mapped.length > 0) setCycleId(mapped[0].id);
      } catch (e) {
        setCyclesStatus("error");
        setCyclesError(e instanceof Error ? e.message : t("merit_admin.loading_cycles"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshAudit() {
    if (!hasCycleSelected) return;

    try {
      setClosuresStatus("loading");
      setPlansStatus("loading");
      setHistoryStatus("loading");
      setClosuresError(null);
      setPlansError(null);
      setHistoryError(null);

      const [c, p] = await Promise.all([
        listAdminClosuresByCycle(cycleId, 20),
        listManagerPlansByCycle(cycleId),
      ]);

      setClosures(c);
      setPlans(p);

      const planIds = p.map((x) => x.id);
      const h = await listManagerClosureHistoryForPlans(planIds, 50);
      setHistory(h);

      setClosuresStatus("success");
      setPlansStatus("success");
      setHistoryStatus("success");
      
      // Fetch Publication & Scenarios
      fetchPublication();
      fetchScenarios();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load audit data";
      setClosuresStatus("error");
      setPlansStatus("error");
      setHistoryStatus("error");
      setClosuresError(msg);
      setPlansError(msg);
      setHistoryError(msg);
    }
  }

  async function runValidator() {
    if (!hasCycleSelected) return;

    try {
      setValidatorStatus("loading");
      setValidatorError(null);
      setReport(null);
      setActionOkMsg(null);
      setActionError(null);

      const r = await runMeritPayrollValidator(cycleId);
      setReport(r);
      setValidatorStatus("success");

      // keep audit in sync
      await refreshAudit();
    } catch (e) {
      setValidatorStatus("error");
      setValidatorError(e instanceof Error ? e.message : "Validator failed");
    }
  }

  async function executeAdminAction(
    action: "lock_all_plans" | "close_cycle" | "reopen_cycle",
    comment: string,
  ) {
    if (!hasCycleSelected) return;

    const commentTrim = comment.trim();

    if (action === "close_cycle" && !canClose) {
      setActionStatus("error");
      setActionError(t("merit_admin.report_idle"));
      return;
    }

    try {
      setActionStatus("loading");
      setActionError(null);
      setActionOkMsg(null);

      const payload =
        action === "lock_all_plans"
          ? { action, cycle_id: cycleId, note: commentTrim }
          : { action, cycle_id: cycleId, reason: commentTrim };

      const res = await runMeritCycleAdmin(payload);

      if (res?.ok === false || res?.error) {
        setActionStatus("error");
        setActionError(res.error ?? "Admin action failed");
        setPendingAction(null);
        return;
      }

      setActionStatus("success");
      setActionOkMsg(
        action === "lock_all_plans"
          ? t("merit_admin.success_bulk_lock", { count: res.locked_count ?? 0 })
          : t("merit_admin.success_action", { action: action === "close_cycle" ? t("merit_admin.btn_close_cycle") : t("merit_admin.btn_reopen") }),
      );

      setPendingAction(null);

      // Refresh audit + re-run validator for updated status
      await refreshAudit();
      await runValidator();
    } catch (e) {
      setActionStatus("error");
      setActionError(e instanceof Error ? e.message : "Admin action failed");
      setPendingAction(null);
    }
  }

  async function fetchPublication() {
    if (!cycleId) return;
    try {
      setPubStatus("loading");
      const res = await getPublishStatus(cycleId);
      if (res.ok) setPublication(res.publication ?? null);
      setPubStatus("success");
    } catch (e) {
      setPubStatus("error");
    }
  }

  async function fetchScenarios() {
    if (!cycleId) return;
    try {
      setScenariosStatus("loading");
      const { data, error } = await supabase
        .from("scenarios")
        .select(`
          id, 
          name, 
          status, 
          created_at, 
          scenario_runs(
            id, 
            status, 
            total_increase_base,
            total_budget_local,
            baseline_total,
            approved_budget_amount,
            total_applied_amount,
            remaining_budget_amount,
            budget_status,
            created_at
          )
        `)
        .eq("cycle_id", cycleId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setScenarios(data || []);
      setScenariosStatus("success");
      
      if (data && data.length > 0 && !selectedScenarioId) {
        setSelectedScenarioId(data[0].id);
      }
    } catch (e) {
      setScenariosStatus("error");
    }
  }

  const recommendedScenarioId = useMemo(() => {
    if (scenarios.length === 0) return null;
    
    // Logic: COMPLETE scenarios, smallest abs(remaining_budget), exclude OVER budget unless none else
    const complete = scenarios.filter(s => s.status === 'COMPLETE');
    if (complete.length === 0) return null;

    const withRuns = complete.map(s => {
      const latestRun = [...(s.scenario_runs || [])].sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      return { id: s.id, latestRun };
    }).filter(x => x.latestRun);

    if (withRuns.length === 0) return null;

    const scored = withRuns.sort((a, b) => {
      const aRun = a.latestRun;
      const bRun = b.latestRun;

      // Penalize OVER budget
      const aOver = aRun.budget_status === 'OVER' ? 1 : 0;
      const bOver = bRun.budget_status === 'OVER' ? 1 : 0;
      if (aOver !== bOver) return aOver - bOver;

      // Smallest absolute remaining budget
      return Math.abs(aRun.remaining_budget_amount || 0) - Math.abs(bRun.remaining_budget_amount || 0);
    });

    return scored[0].id;
  }, [scenarios]);

  const isSelectedRecommended = selectedScenarioId === recommendedScenarioId;

  async function executePublish(reason: string) {
    if (!cycleId || !selectedScenarioId) return;
    
    const scenario = scenarios.find(s => s.id === selectedScenarioId);
    const latestRun = [...(scenario?.scenario_runs || [])].sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    if (!latestRun) {
      alert("No valid run found for this scenario");
      return;
    }

    try {
      setActionStatus("loading");
      const res = await publishEffectiveRecs({
        cycle_id: cycleId,
        scenario_id: selectedScenarioId,
        run_id: latestRun.id,
        reason: isSelectedRecommended ? undefined : reason,
        is_recommended: isSelectedRecommended,
        overwrite: true
      });

      if (res.ok) {
        setActionOkMsg(t("merit_admin.success_published", { count: res.published_count }));
        setPendingAction(null);
        fetchPublication();
      } else {
        if (res.code === 'GATING_FAILED' && res.details) {
          setGatingDetails(res.details);
          setActionError(t("merit_admin.error_gating_failed"));
        } else {
          setActionError(res.error || "Publish failed");
        }
      }
      setActionStatus("success");
    } catch (e) {
      setActionStatus("error");
      setActionError(e instanceof Error ? e.message : "Publish failed");
    }
  }

  async function handleExport() {
    if (!cycleId) return;
    try {
      setIsExporting(true);
      const res = await exportPayrollCsv(cycleId);
      if (res.ok && res.download_url) {
        window.open(res.download_url, '_blank');
      } else {
        alert(res.error || "Export failed");
      }
    } catch (e) {
      alert("Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  const planSummary = useMemo(() => {
    const total = plans.length;
    const locked = plans.filter((p) => p.status === "locked").length;
    const reopened = plans.filter((p) => p.status === "reopened").length;
    const other = total - locked - reopened;
    return { total, locked, reopened, other };
  }, [plans]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-700" />
              <h1 className="text-xl font-semibold text-slate-900">
                {t("merit_admin.page_title")}
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {t("merit_admin.page_subtitle")}
            </p>
          </div>

          <button
            onClick={() => refreshAudit()}
            disabled={!hasCycleSelected}
            className={clsx(
              "inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 transition-colors",
              !hasCycleSelected && "opacity-50 cursor-not-allowed",
            )}
          >
            <RefreshCcw className="h-4 w-4" />
            {t("merit_admin.refresh_audit")}
          </button>
        </div>

        {/* Cycle selector */}
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-xl">
              <label className="text-xs font-medium text-slate-600">
                {t("merit_admin.cycle_label")}
              </label>
              <div className="mt-1">
                <select
                  value={cycleId}
                  onChange={(e) => setCycleId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300 transition-all"
                >
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {cyclesStatus === "loading" && (
                <p className="mt-2 text-xs text-slate-500">{t("merit_admin.loading_cycles")}</p>
              )}
              {cyclesStatus === "error" && (
                <p className="mt-2 text-xs text-red-600">{cyclesError}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <button
                onClick={runValidator}
                disabled={!hasCycleSelected || validatorStatus === "loading"}
                className={clsx(
                  "inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors",
                  (!hasCycleSelected || validatorStatus === "loading") &&
                    "opacity-50 cursor-not-allowed",
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("merit_admin.validate_readiness")}
              </button>

              <button
                onClick={() => refreshAudit()}
                disabled={!hasCycleSelected}
                className={clsx(
                  "inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 transition-colors",
                  !hasCycleSelected && "opacity-50 cursor-not-allowed",
                )}
              >
                <RefreshCcw className="h-4 w-4" />
                {t("merit_admin.reload")}
              </button>
            </div>
          </div>
        </div>

        {/* Validator Report */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {t("merit_admin.report_title")}
            </h2>

            {report && (
              <div
                className={clsx(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                  report.ok
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700",
                )}
              >
                {report.ok ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {t("merit_admin.status_ok")}
                  </>
                ) : (
                  <>
                    <CircleSlash className="h-4 w-4" />
                    {t("merit_admin.status_not_ready")}
                  </>
                )}
              </div>
            )}
          </div>

          {validatorStatus === "idle" && (
            <p className="mt-2 text-sm text-slate-600">
              {t("merit_admin.report_idle")}
            </p>
          )}

          {validatorStatus === "loading" && (
            <p className="mt-2 text-sm text-slate-600">{t("merit_admin.validating")}</p>
          )}

          {validatorStatus === "error" && (
            <p className="mt-2 text-sm text-red-600">{validatorError}</p>
          )}

          {report && (
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-600 uppercase font-bold tracking-wider">{t("merit_admin.summary_manager_plans")}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
                  {report.summary.manager_plans_total}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-600 uppercase font-bold tracking-wider">{t("merit_admin.summary_locked")}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
                  {report.summary.manager_plans_locked}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-600 uppercase font-bold tracking-wider">{t("merit_admin.summary_effective_recs")}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
                  {report.summary.effective_recommendations_count}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-600 uppercase font-bold tracking-wider">{t("merit_admin.summary_issues")}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
                  {issueCounts.errors}E / {issueCounts.warnings}W
                </p>
              </div>
            </div>
          )}

          {report && report.issues.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t("merit_admin.issues_label")}</p>
              <div className="mt-2 space-y-2">
                {report.issues.map((i) => (
                  <div
                    key={`${i.code}-${i.message}`}
                    className={clsx(
                      "flex items-start gap-3 rounded-2xl p-3 ring-1",
                      i.severity === "error"
                        ? "bg-red-50 text-red-800 ring-red-200"
                        : "bg-amber-50 text-amber-800 ring-amber-200",
                    )}
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{i.code}</p>
                      <p className="text-sm">{i.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin Actions */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">{t("merit_admin.actions_title")}</h2>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t("merit_admin.bulk_lock_title")}</p>
              <p className="mt-1 text-xs text-slate-500 italic">
                {t("merit_admin.bulk_lock_desc")}
              </p>

              <button
                onClick={() => setPendingAction("lock_all_plans")}
                disabled={!hasCycleSelected || actionStatus === "loading"}
                className={clsx(
                  "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all",
                  (!hasCycleSelected || actionStatus === "loading") &&
                    "opacity-50 cursor-not-allowed",
                )}
              >
                <Lock className="h-4 w-4" />
                {t("merit_admin.btn_lock_all")}
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t("merit_admin.cycle_control_title")}</p>
              <p className="mt-1 text-xs text-slate-500 italic">
                {t("merit_admin.cycle_control_desc")}
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <button
                  onClick={() => setPendingAction("close_cycle")}
                  disabled={!hasCycleSelected || actionStatus === "loading" || !canClose}
                  className={clsx(
                    "inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 transition-all",
                    (!hasCycleSelected || actionStatus === "loading" || !canClose) &&
                      "opacity-50 cursor-not-allowed",
                  )}
                  title={!canClose ? t("merit_admin.note_1") : ""}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t("merit_admin.btn_close_cycle")}
                </button>

                <button
                  onClick={() => setPendingAction("reopen_cycle")}
                  disabled={!hasCycleSelected || actionStatus === "loading"}
                  className={clsx(
                    "inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 transition-all",
                    (!hasCycleSelected || actionStatus === "loading") &&
                      "opacity-50 cursor-not-allowed",
                  )}
                >
                  <RefreshCcw className="h-4 w-4" />
                  {t("merit_admin.btn_reopen")}
                </button>
              </div>
            </div>
          </div>

          {actionStatus === "error" && (
            <p className="mt-3 text-sm text-red-600 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {actionError}
            </p>
          )}
          {actionStatus === "success" && actionOkMsg && (
            <p className="mt-3 text-sm text-emerald-700 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {actionOkMsg}
            </p>
          )}
        </div>

        {/* Publish & Export Section */}
        <div className="mt-8 rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {t("merit_admin.publish_export_title")}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {t("merit_admin.publish_export_desc")}
              </p>
            </div>
            {publication && (
              <div className="flex flex-col items-end">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {t("merit_admin.status_published")}
                </span>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  {t("merit_admin.published_on", { date: new Date(publication.published_at).toLocaleDateString() })}
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {t("merit_admin.scenario_select_label")}
                </label>
                <div className="relative">
                  <select
                    value={selectedScenarioId}
                    onChange={(e) => setSelectedScenarioId(e.target.value)}
                    disabled={pubStatus === "loading" || scenariosStatus === "loading"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                  >
                    {scenarios.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.id === recommendedScenarioId ? `(${t("merit_admin.publish_recommended")})` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <RefreshCcw className="h-4 w-4" />
                  </div>
                </div>
                {scenariosStatus === "loading" && <p className="text-[10px] text-slate-400 mt-2 animate-pulse">Loading scenarios...</p>}
                
                {selectedScenarioId && !isSelectedRecommended && (
                  <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                    <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {t("merit_admin.publish_reason_required")}
                    </label>
                    <textarea
                      value={publishReason}
                      onChange={(e) => setPublishReason(e.target.value)}
                      placeholder={t("merit_admin.publish_reason_placeholder")}
                      rows={2}
                      className="w-full bg-amber-50/30 border border-amber-100 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                    />
                  </div>
                )}
              </div>
            </div>

              {/* Gating Status Indicators */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  {t("merit_admin.gating_title")}
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 flex items-center gap-2">
                      <div className={clsx("w-1.5 h-1.5 rounded-full", gatingStatus.isClosed ? "bg-emerald-500" : "bg-slate-300")} />
                      {t("merit_admin.gate_closed")}
                    </span>
                    {gatingStatus.isClosed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-slate-300" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 flex items-center gap-2">
                      <div className={clsx("w-1.5 h-1.5 rounded-full", gatingStatus.arePlansLocked ? "bg-emerald-500" : "bg-slate-300")} />
                      {t("merit_admin.gate_locked")}
                    </span>
                    {gatingStatus.arePlansLocked ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-slate-300" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 flex items-center gap-2">
                      <div className={clsx("w-1.5 h-1.5 rounded-full", gatingStatus.isValidatorOk ? "bg-emerald-500" : "bg-slate-300")} />
                      {t("merit_admin.gate_validator")}
                    </span>
                    {gatingStatus.isValidatorOk ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-slate-300" />}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setPendingAction("publish_results")}
                  disabled={!hasCycleSelected || !selectedScenarioId || (!isSelectedRecommended && !publishReason.trim()) || actionStatus === "loading" || !canPublish}
                  className={clsx(
                    "w-full h-12 flex items-center justify-center gap-2 font-semibold rounded-xl transition-all shadow-lg",
                    (!hasCycleSelected || !selectedScenarioId || (!isSelectedRecommended && !publishReason.trim()) || actionStatus === "loading" || !canPublish)
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10"
                  )}
                >
                  <Send className="w-4 h-4" />
                  {t("merit_admin.btn_publish")}
                </button>
                
                <button
                  onClick={handleExport}
                  disabled={!publication || isExporting}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-white text-slate-900 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isExporting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  {t("merit_admin.btn_export")}
                </button>
              </div>
          </div>
        </div>

        {/* Audit Trails */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 flex flex-col">
            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-50 pb-3 mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-400" />
              {t("merit_admin.audit_cycle_title")}
            </h2>

            {closuresStatus === "loading" && (
              <p className="text-sm text-slate-500 italic">{t("common.saving")}</p>
            )}
            {closuresStatus === "error" && (
              <p className="text-sm text-red-600">{closuresError}</p>
            )}

            {closures.length === 0 && closuresStatus !== "loading" && (
              <p className="text-sm text-slate-400 italic py-4">{t("merit_admin.audit_no_events")}</p>
            )}

            <div className="space-y-3">
              {closures.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl bg-slate-50/50 p-4 border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={clsx(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md",
                      c.action === 'close' ? 'bg-slate-900 text-white' : 'bg-blue-100 text-blue-700'
                    )}>
                      {c.action.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(c.action_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {c.reason ?? "—"}
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    <span>Actor</span>
                    <span className="text-slate-600">{c.actor_user_id.slice(0, 13)}…</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 flex flex-col">
            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-50 pb-3 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              {t("merit_admin.audit_plans_summary_title")}
            </h2>

            {plansStatus === "loading" && (
              <p className="text-sm text-slate-500 italic">{t("common.saving")}</p>
            )}
            {plansStatus === "error" && (
              <p className="text-sm text-red-600">{plansError}</p>
            )}

            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1.5">{t("merit_admin.audit_plans_total")}</p>
                <p className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                  {planSummary.total}
                </p>
              </div>
              <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest leading-none mb-1.5">{t("merit_admin.audit_plans_locked")}</p>
                <p className="text-xl font-bold text-emerald-700 tracking-tight leading-none">
                  {planSummary.locked}
                </p>
              </div>
              <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-100">
                <p className="text-[10px] font-bold text-amber-600/70 uppercase tracking-widest leading-none mb-1.5">{t("merit_admin.audit_plans_reopened")}</p>
                <p className="text-xl font-bold text-amber-700 tracking-tight leading-none">
                  {planSummary.reopened}
                </p>
              </div>
              <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1.5">{t("merit_admin.audit_plans_other")}</p>
                <p className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                  {planSummary.other}
                </p>
              </div>
            </div>

            <h3 className="mt-8 text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">
              {t("merit_admin.audit_plan_history_title")}
            </h3>

            {historyStatus === "loading" && (
              <p className="text-sm text-slate-500 italic">{t("common.saving")}</p>
            )}
            {historyStatus === "error" && (
              <p className="text-sm text-red-600">{historyError}</p>
            )}

            {history.length === 0 && historyStatus !== "loading" && (
              <p className="text-sm text-slate-400 italic py-4">{t("merit_admin.audit_plan_no_events")}</p>
            )}

            <div className="space-y-3">
              {history.slice(0, 12).map((h) => (
                <div key={h.id} className="rounded-2xl bg-slate-50/30 p-3 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest px-2 py-0.5 rounded-md bg-white border border-slate-100">
                      {h.action.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(h.action_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed italic">
                    "{h.note ?? "—"}"
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                    <span>Plan ID: {h.plan_id.slice(0, 8)}…</span>
                    <span>Actor: {h.actor_user_id.slice(0, 8)}…</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-8 rounded-3xl bg-slate-900 p-6 text-sm text-slate-300 shadow-xl shadow-slate-900/10 border border-slate-800">
          <div className="flex items-center gap-2 mb-4 text-white">
            <Shield className="w-5 h-5 text-blue-500" />
            <p className="font-bold uppercase tracking-wider text-xs">{t("merit_admin.notes_title")}</p>
          </div>
          <ul className="space-y-3 text-xs leading-relaxed">
            <li className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-none" />
              {t("merit_admin.note_1")}
            </li>
            <li className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-none" />
              {t("merit_admin.note_2")}
            </li>
            <li className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-none" />
              <span>
                If your Supabase client import path differs, update{" "}
                <code className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 font-mono text-blue-400">src/services/meritAdminApi.ts</code>.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={pendingAction === "lock_all_plans"}
        onClose={() => setPendingAction(null)}
        onConfirm={(comment) => executeAdminAction("lock_all_plans", comment)}
        title={t("merit_admin.modal_confirm_title")}
        description={t("merit_admin.bulk_lock_desc")}
        commentLabel={t("merit_admin.note_label")}
        commentPlaceholder={t("merit_admin.note_placeholder")}
        confirmLabel={t("merit_admin.modal_confirm_btn")}
        cancelLabel={t("merit_admin.modal_cancel_btn")}
        isLoading={actionStatus === "loading"}
      />

      <ConfirmationModal
        isOpen={pendingAction === "close_cycle"}
        onClose={() => setPendingAction(null)}
        onConfirm={(comment) => executeAdminAction("close_cycle", comment)}
        title={t("merit_admin.modal_confirm_title")}
        description={t("merit_admin.cycle_control_desc")}
        commentLabel={t("merit_admin.reason_label")}
        commentPlaceholder={t("merit_admin.reason_placeholder")}
        confirmLabel={t("merit_admin.modal_confirm_btn")}
        cancelLabel={t("merit_admin.modal_cancel_btn")}
        isLoading={actionStatus === "loading"}
      />

      <ConfirmationModal
        isOpen={pendingAction === "publish_results"}
        onClose={() => setPendingAction(null)}
        onConfirm={(comment) => executePublish(comment)}
        title={t("merit_admin.confirm_publish_title")}
        description={t("merit_admin.confirm_publish_desc")}
        commentLabel={isSelectedRecommended ? t("merit_admin.note_label") : t("merit_admin.publish_reason_required")}
        commentPlaceholder={t("merit_admin.publish_reason_placeholder")}
        confirmLabel={t("merit_admin.modal_confirm_btn")}
        cancelLabel={t("merit_admin.modal_cancel_btn")}
        isLoading={actionStatus === "loading"}
      />
    </div>
  );
}
