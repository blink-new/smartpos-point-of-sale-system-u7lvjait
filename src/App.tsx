import { useState, useEffect, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DashboardPage } from '@/pages/DashboardPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import InventoryPage from './pages/InventoryPage'
import PurchaseOrdersPage from '@/pages/PurchaseOrdersPage'
import DiscountsPage from '@/pages/DiscountsPage'
import StaffPage from '@/pages/StaffPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { Toaster } from '@/components/ui/toaster'
import blink from '@/blink/client'
import { AuthUser } from '@/types'

function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading SmartPOS...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to SmartPOS</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to access your point of sale system
          </p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={
              <>
                <Header title="Dashboard" showSearch={false} />
                <main className="flex-1 overflow-auto">
                  <DashboardPage />
                </main>
              </>
            } />
            <Route path="/checkout" element={
              <>
                <Header title="Checkout" showSearch={false} />
                <main className="flex-1 overflow-hidden">
                  <CheckoutPage />
                </main>
              </>
            } />
            <Route path="/inventory" element={
              <>
                <Header title="Inventory Management" showSearch={false} />
                <main className="flex-1 overflow-auto">
                  <InventoryPage />
                </main>
              </>
            } />
            <Route path="/customers" element={
              <>
                <Header title="Customer Management" />
                <main className="flex-1 overflow-auto">
                  <CustomersPage />
                </main>
              </>
            } />
            <Route path="/purchase-orders" element={
              <>
                <Header title="Purchase Orders" />
                <main className="flex-1 overflow-auto">
                  <PurchaseOrdersPage />
                </main>
              </>
            } />
            <Route path="/discounts" element={
              <>
                <Header title="Discounts" />
                <main className="flex-1 overflow-auto">
                  <DiscountsPage />
                </main>
              </>
            } />
            <Route path="/staff" element={
              <>
                <Header title="Staff Management" />
                <main className="flex-1 overflow-auto">
                  <StaffPage />
                </main>
              </>
            } />
            <Route path="/reports" element={
              <>
                <Header title="Reports & Analytics" />
                <main className="flex-1 overflow-auto">
                  <ReportsPage />
                </main>
              </>
            } />
            <Route path="/stores" element={
              <>
                <Header title="Store Management" />
                <main className="flex-1 overflow-auto p-6">
                  <div className="text-center py-12">
                    <h2 className="text-xl font-semibold mb-2">Store Management</h2>
                    <p className="text-muted-foreground">Coming soon...</p>
                  </div>
                </main>
              </>
            } />
            <Route path="/settings" element={
              <>
                <Header title="Settings" />
                <main className="flex-1 overflow-auto p-6">
                  <div className="text-center py-12">
                    <h2 className="text-xl font-semibold mb-2">Settings</h2>
                    <p className="text-muted-foreground">Coming soon...</p>
                  </div>
                </main>
              </>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      <Toaster />
    </Router>
  )
}

export default App