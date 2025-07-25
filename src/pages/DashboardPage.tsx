import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import blink from '@/blink/client'

interface DashboardStats {
  todaySales: number
  totalTransactions: number
  totalCustomers: number
  lowStockItems: number
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    totalTransactions: 0,
    totalCustomers: 0,
    lowStockItems: 0
  })
  const [loading, setLoading] = useState(true)

  const loadDashboardData = async () => {
    try {
      // Get today's sales
      const today = new Date().toISOString().split('T')[0]
      const sales = await blink.db.sales.list({
        where: { 
          store_id: 'store_default',
          created_at: { gte: today }
        }
      })

      const todaySales = sales.reduce((sum, sale) => sum + sale.total_amount, 0)

      // Get total customers
      const customers = await blink.db.customers.list({
        where: { store_id: 'store_default' }
      })

      // Get low stock items
      const products = await blink.db.products.list({
        where: { 
          store_id: 'store_default',
          is_active: '1'
        }
      })

      const lowStockItems = products.filter(product => 
        product.stock_quantity <= product.min_stock_level
      ).length

      setStats({
        todaySales,
        totalTransactions: sales.length,
        totalCustomers: customers.length,
        lowStockItems
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.todaySales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              +12% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Today's completed sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Total registered customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items need restocking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">New Sale</p>
                  <p className="text-sm text-muted-foreground">Start checkout</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Add Product</p>
                  <p className="text-sm text-muted-foreground">Manage inventory</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">New Customer</p>
                  <p className="text-sm text-muted-foreground">Add customer</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">View Reports</p>
                  <p className="text-sm text-muted-foreground">Sales analytics</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.lowStockItems > 0 && (
              <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="font-medium text-orange-900">Low Stock Alert</p>
                  <p className="text-sm text-orange-700">
                    {stats.lowStockItems} items need restocking
                  </p>
                </div>
                <Badge variant="secondary">{stats.lowStockItems}</Badge>
              </div>
            )}
            
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium text-green-900">Sales Target</p>
                <p className="text-sm text-green-700">
                  On track to meet daily goal
                </p>
              </div>
              <Badge variant="secondary">85%</Badge>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium text-blue-900">System Status</p>
                <p className="text-sm text-blue-700">
                  All systems operational
                </p>
              </div>
              <Badge variant="secondary">Online</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}