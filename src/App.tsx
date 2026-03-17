import React, { Suspense, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from './lib/supabaseClient'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import OnboardingTour from './components/OnboardingTour'
import RouteLoader from './components/common/RouteLoader'
import ErrorBoundary from './components/common/ErrorBoundary'

// --- Lazy page imports (route-level code splitting) ---
const LandingPage = React.lazy(() => import('./pages/LandingPage'))
const LoginPage = React.lazy(() => import('./pages/LoginPage'))
const WorkspaceHome = React.lazy(() => import('./pages/WorkspaceHome'))
const JobEvaluationPage = React.lazy(() => import('./pages/JobEvaluationPage'))
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'))
const ScenariosPage = React.lazy(() => import('./pages/ScenariosPage'))
const ScenarioResultsPage = React.lazy(() => import('./pages/ScenarioResultsPage'))
const MeritResultsPage = React.lazy(() => import('./pages/MeritResultsPage'))
const ExecutionWorkbenchPage = React.lazy(() => import('./pages/ExecutionWorkbenchPage'))
const CyclesPage = React.lazy(() => import('./pages/CyclesPage'))
const ImportsPage = React.lazy(() => import('./pages/ImportsPage'))
const SnapshotsPage = React.lazy(() => import('./pages/SnapshotsPage'))
const PayBandsPage = React.lazy(() => import('./pages/PayBandsPage'))
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'))
const AuditLogPage = React.lazy(() => import('./pages/AuditLogPage'))
const UsersPage = React.lazy(() => import('./pages/UsersPage'))
const TenantSettingsPage = React.lazy(() => import('./pages/TenantSettingsPage'))
const MeritCycleAdminPage = React.lazy(() => import('./pages/admin/MeritCycleAdminPage'))
const ApprovalsPage = React.lazy(() => import('./pages/ApprovalsPage'))
// Named exports wrapped for lazy compatibility
const ManagerWorkspacePage = React.lazy(() =>
  import('./pages/approvals/ManagerWorkspacePage').then(m => ({ default: m.ManagerWorkspacePage }))
)
const ApprovalsInboxPage = React.lazy(() =>
  import('./pages/approvals/ApprovalsInboxPage').then(m => ({ default: m.ApprovalsInboxPage }))
)
const OnboardingPage = React.lazy(() => import('./pages/OnboardingPage'))
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'))
const JobDescriptionPage = React.lazy(() => import('./pages/JobDescriptionPage'))

const JDRepositoryPage = React.lazy(() => import('./modules/job-description/pages/JDRepositoryPage'))
const JDBuilderPage = React.lazy(() => import('./modules/job-description/pages/JDBuilderPage'))
const JDViewerPage = React.lazy(() => import('./modules/job-description/pages/JDViewerPage'))
const SimulationWorkbenchPage = React.lazy(() => import('./modules/job-description/pages/SimulationWorkbenchPage'))
const AIConsultantPage = React.lazy(() => import('./modules/consult/pages/AIConsultantPage'))

// --- Pay Bands Builder Phase 3 ---
const ActiveStructuresView = React.lazy(() => import('./pages/workspace/paybands/ActiveStructuresView'))
const MarketDataUploader = React.lazy(() => import('./pages/workspace/paybands/MarketDataUploader'))
const MappingsUI = React.lazy(() => import('./pages/workspace/paybands/MappingsUI'))
const ScenarioOptionsWizard = React.lazy(() => import('./pages/workspace/paybands/ScenarioOptionsWizard'))
const ScenarioWorkbench = React.lazy(() => import('./pages/workspace/paybands/ScenarioWorkbench'))
const PayBandsGuidePage = React.lazy(() => import('./pages/workspace/paybands/PayBandsGuidePage'))
const ScenariosGuidePage = React.lazy(() => import('./pages/ScenariosGuidePage'))
const JobEvaluationGuidePage = React.lazy(() => import('./modules/job-evaluation/pages/JobEvaluationGuidePage'))

const Layout = ({ children, profile, onStartTour }: { children: React.ReactNode, profile: any, onStartTour?: () => void }) => (
  <div className="flex bg-[rgb(var(--surface-main))] min-h-screen transition-colors duration-500 text-[rgb(var(--text-primary))] font-sans font-medium">
    <Sidebar onStartTour={onStartTour} />
    <div className="flex-1 flex flex-col min-w-0">
      <Header profile={profile} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  </div>
)

const WorkspaceToolLayout = ({ children, profile }: { children: React.ReactNode, profile: any }) => (
  <div className="flex flex-col bg-[rgb(var(--surface-main))] min-h-screen transition-colors duration-500 text-[rgb(var(--text-primary))] font-sans font-medium">
    <Header profile={profile} />
    <main className="flex-1 overflow-y-auto">
      {children}
    </main>
  </div>
)

function App() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isTourOpen, setIsTourOpen] = useState(false)

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist yet (might be a slight delay in trigger)
          console.warn('Profile not found, user might be in onboarding process.')
        } else {
          throw error
        }
      }
      setProfile(data)

      // Sync tenant_id to auth metadata for Edge Function context
      const { data: { session } } = await supabase.auth.getSession();
      if (data?.tenant_id && session?.user?.user_metadata?.tenant_id !== data.tenant_id) {
        console.log('[AuthSync] Syncing tenant_id to auth metadata...');
        await supabase.auth.updateUser({ data: { tenant_id: data.tenant_id } });
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
        <div className="animate-pulse text-xl font-bold tracking-tight">Loading EvoComp...</div>
      </div>
    )
  }

  return (
    <Router>
      <ErrorBoundary>
        <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          
          <Route path="/login" element={
            session ? <Navigate to="/workspace" replace /> : <LoginPage />
          } />

          <Route path="/workspace" element={
            <ProtectedRoute session={session} profile={profile}>
              <WorkspaceHome profile={profile} />
            </ProtectedRoute>
          } />
          
          <Route path="/workspace/job-evaluation" element={
            <ProtectedRoute session={session} profile={profile}>
              <WorkspaceToolLayout profile={profile}>
                <JobEvaluationPage profile={profile} />
              </WorkspaceToolLayout>
            </ProtectedRoute>
          } />

          <Route path="/workspace/job-evaluation/guide" element={
            <ProtectedRoute session={session} profile={profile}>
              <WorkspaceToolLayout profile={profile}>
                <JobEvaluationGuidePage />
              </WorkspaceToolLayout>
            </ProtectedRoute>
          } />

          <Route path="/workspace/job-description/*" element={
            <ProtectedRoute session={session} profile={profile}>
              <WorkspaceToolLayout profile={profile}>
                <Routes>
                  <Route index element={<JobDescriptionPage />} />
                  <Route path="profiles" element={<JDRepositoryPage />} />
                  <Route path="profiles/new" element={<JDBuilderPage />} />
                  <Route path="profiles/:id" element={<JDViewerPage />} />
                  <Route path="profiles/:id/edit" element={<JDBuilderPage />} />
                </Routes>
              </WorkspaceToolLayout>
            </ProtectedRoute>
          } />

          <Route path="/workspace/paybands/*" element={
            <ProtectedRoute session={session} profile={profile}>
              <WorkspaceToolLayout profile={profile}>
                <Routes>
                  <Route index element={<ActiveStructuresView profile={profile} />} />
                  <Route path="imports" element={<MarketDataUploader />} />
                  <Route path="mappings" element={<MappingsUI />} />
                  <Route path="builder/new" element={<ScenarioOptionsWizard />} />
                  <Route path="builder/:id" element={<ScenarioWorkbench />} />
                  <Route path="simulation/:id" element={<SimulationWorkbenchPage />} />
                  <Route path="guide" element={<PayBandsGuidePage />} />
                </Routes>
              </WorkspaceToolLayout>
            </ProtectedRoute>
          } />

          <Route path="/workspace/consult" element={
            <ProtectedRoute session={session} profile={profile}>
              <WorkspaceToolLayout profile={profile}>
                <AIConsultantPage profile={profile} />
              </WorkspaceToolLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/app/*" element={
            <ProtectedRoute session={session} profile={profile}>
              <>
                <Layout profile={profile} onStartTour={() => setIsTourOpen(true)}>
                  <Routes>
                    <Route path="admin/tenants" element={<TenantSettingsPage />} />
                    <Route path="admin/users" element={<UsersPage />} />
                    <Route path="admin/merit-cycle" element={<MeritCycleAdminPage />} />
                    <Route path="data/imports" element={<ImportsPage />} />
                    <Route path="data/snapshots" element={
                      ['COMP_ADMIN', 'TENANT_ADMIN'].includes(profile?.role || '') 
                        ? <SnapshotsPage /> 
                        : <Navigate to="/app/comp/scenarios" replace />
                    } />
                    <Route path="pay-bands" element={<PayBandsPage />} />
                    <Route path="comp/scenarios" element={<ScenariosPage />} />
                    <Route path="comp/scenarios/guide" element={<ScenariosGuidePage />} />
                    <Route path="comp/scenarios/:id/results" element={<ScenarioResultsPage />} />
                    <Route path="comp/scenarios/:scenarioId/execute" element={<ExecutionWorkbenchPage />} />
                    <Route path="comp/cycles" element={
                      ['COMP_ADMIN', 'TENANT_ADMIN'].includes(profile?.role || '') 
                        ? <CyclesPage /> 
                        : <Navigate to="/app/comp/scenarios" replace />
                    } />
                    
                    {/* Phase 5 Approvals Routes */}
                    <Route path="approvals/my-plan" element={<ManagerWorkspacePage />} />
                    <Route path="approvals/inbox" element={<ApprovalsInboxPage />} />
                    
                    {/* Legacy Redirect for /app/approvals */}
                    <Route path="approvals" element={<ApprovalsPage />} />
                    
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="audit-log" element={<AuditLogPage />} />
                    
                    <Route index element={<Navigate to="/app/comp/scenarios" replace />} />
                    <Route path="*" element={<Navigate to="/app/comp/scenarios" replace />} />
                  </Routes>
                </Layout>
                <OnboardingTour isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
              </>
            </ProtectedRoute>
          } />

          <Route path="/onboarding" element={
            <ProtectedRoute session={session} profile={profile} requireTenant={false}>
              {profile?.tenant_id ? <Navigate to="/workspace" replace /> : <OnboardingPage onComplete={() => fetchProfile(session.user.id)} />}
            </ProtectedRoute>
          } />

          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  )
}


export default App
