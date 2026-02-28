import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import LoginPage from './pages/LoginPage'
import ScenariosPage from './pages/ScenariosPage'
import ImportsPage from './pages/ImportsPage'
import PayBandsPage from './pages/PayBandsPage'
import UsersPage from './pages/UsersPage'
import ReportsPage from './pages/ReportsPage'
import ApprovalsPage from './pages/ApprovalsPage'
import { ManagerWorkspacePage } from './pages/approvals/ManagerWorkspacePage'
import { ApprovalsInboxPage } from './pages/approvals/ApprovalsInboxPage'
import TenantSettingsPage from './pages/TenantSettingsPage'
import AuditLogPage from './pages/AuditLogPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import OnboardingPage from './pages/OnboardingPage'
import MeritResultsPage from './pages/MeritResultsPage'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import MeritCycleAdminPage from './pages/admin/MeritCycleAdminPage'
const Dashboard = () => (
  <div className="p-8">
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-slate-900">Compensation Intelligence</h1>
      <p className="text-slate-500">Welcome to the EvoComp Strategic Dashboard.</p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse">
          <div className="h-4 w-24 bg-slate-100 rounded mb-4"></div>
          <div className="h-8 w-32 bg-slate-200 rounded"></div>
        </div>
      ))}
    </div>

    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h2 className="font-bold text-lg text-slate-900">Recent Scenarios</h2>
        <button className="text-blue-600 font-semibold text-sm">View all</button>
      </div>
      <div className="p-20 text-center text-slate-400">
        <p>Your workspace is being prepared.</p>
      </div>
    </div>
  </div>
)

const Layout = ({ children, profile }: { children: React.ReactNode, profile: any }) => (
  <div className="flex bg-slate-50 min-h-screen">
    <Sidebar />
    <div className="flex-1 flex flex-col">
      <Header profile={profile} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  </div>
)

function App() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="animate-pulse text-xl">Loading EvoComp...</div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          session ? <Navigate to="/app" replace /> : <LoginPage />
        } />
        
        <Route path="/app/*" element={
          session ? (
            profile?.tenant_id ? (
              <Layout profile={profile}>
                <Routes>
                  <Route path="admin/tenants" element={<TenantSettingsPage />} />
                  <Route path="admin/users" element={<UsersPage />} />
                  <Route path="admin/merit-cycle" element={<MeritCycleAdminPage />} />
                  <Route path="data/imports" element={<ImportsPage />} />
                  <Route path="data/snapshots" element={<Dashboard />} />
                  <Route path="comp/bands" element={<PayBandsPage />} />
                  <Route path="comp/scenarios" element={<ScenariosPage />} />
                  <Route path="comp/scenarios/:scenarioId/results" element={<MeritResultsPage />} />
                  <Route path="comp/cycles" element={<Dashboard />} />
                  
                  {/* Phase 5 Approvals Routes */}
                  <Route path="approvals/my-plan" element={<ManagerWorkspacePage />} />
                  <Route path="approvals/inbox" element={<ApprovalsInboxPage />} />
                  
                  {/* Legacy Redirect for /app/approvals */}
                  <Route path="approvals" element={<ApprovalsPage />} />
                  
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="audit" element={<AuditLogPage />} />
                  <Route path="*" element={<Navigate to="/app/comp/scenarios" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/onboarding" replace />
            )
          ) : <Navigate to="/login" replace />
        } />

        <Route path="/onboarding" element={
          session ? (
            profile?.tenant_id ? <Navigate to="/app" replace /> : <OnboardingPage onComplete={() => fetchProfile(session.user.id)} />
          ) : <Navigate to="/login" replace />
        } />

        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/" element={<Navigate to="/app" replace />} />
      </Routes>
    </Router>
  )
}


export default App
