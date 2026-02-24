import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

// Placeholder components for routes
const Login = () => <div className="p-8"><h1>Login Page</h1><p>Please sign in to EvoComp.</p></div>
const Dashboard = () => <div className="p-8"><h1>Dashboard</h1><p>Welcome to Strategic Compensation Intelligence.</p></div>
const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex bg-gray-50 min-h-screen">
    <aside className="w-64 bg-slate-900 text-white p-6">
      <h2 className="text-xl font-bold mb-8">EvoComp</h2>
      <nav className="space-y-4">
        <div className="text-sm uppercase text-gray-500 font-semibold mb-2">Admin</div>
        <a href="/app/admin/tenants" className="block hover:text-blue-400">Tenants</a>
        <a href="/app/admin/users" className="block hover:text-blue-400">Users</a>
        
        <div className="text-sm uppercase text-gray-500 font-semibold mt-6 mb-2">Data</div>
        <a href="/app/data/imports" className="block hover:text-blue-400">Imports</a>
        <a href="/app/data/snapshots" className="block hover:text-blue-400">Snapshots</a>
        
        <div className="text-sm uppercase text-gray-500 font-semibold mt-6 mb-2">Compensation</div>
        <a href="/app/comp/bands" className="block hover:text-blue-400">Pay Bands</a>
        <a href="/app/comp/scenarios" className="block hover:text-blue-400">Scenarios</a>
        <a href="/app/comp/cycles" className="block hover:text-blue-400">Cycles</a>
        
        <div className="text-sm uppercase text-gray-500 font-semibold mt-6 mb-2">Outputs</div>
        <a href="/app/approvals" className="block hover:text-blue-400">Approvals</a>
        <a href="/app/reports" className="block hover:text-blue-400">Reports</a>
        <a href="/app/audit" className="block hover:text-blue-400">Audit Log</a>
      </nav>
    </aside>
    <main className="flex-1">
      {children}
    </main>
  </div>
)

function App() {
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/app/*" element={
          session ? (
            <Layout>
              <Routes>
                <Route path="admin/tenants" element={<Dashboard />} />
                <Route path="admin/users" element={<Dashboard />} />
                <Route path="data/imports" element={<Dashboard />} />
                <Route path="data/snapshots" element={<Dashboard />} />
                <Route path="comp/bands" element={<Dashboard />} />
                <Route path="comp/scenarios" element={<Dashboard />} />
                <Route path="comp/cycles" element={<Dashboard />} />
                <Route path="approvals" element={<Dashboard />} />
                <Route path="reports" element={<Dashboard />} />
                <Route path="audit" element={<Dashboard />} />
                <Route path="*" element={<Navigate to="/app/comp/scenarios" replace />} />
              </Routes>
            </Layout>
          ) : <Navigate to="/login" replace />
        } />
        <Route path="/" element={<Navigate to="/app" replace />} />
      </Routes>
    </Router>
  )
}

export default App
