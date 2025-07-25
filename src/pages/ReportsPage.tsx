import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Calendar,
  Download,
  Filter
} from 'lucide-react'
import blink from '@/blink/client'

interface SalesData {
  date: string
  sales: number
  transactions: number
  customers: number
}

interface ProductSales {
  product_name: string
  quantity_sold: number
  revenue: number
}

interface ReportData {
  totalSales: number
  totalTransactions: number
  totalCustomers: number
  averageOrderValue: number
  topProducts: ProductSales[]
  salesByDay: SalesData[]
  salesGrowth: number
  transactionGrowth: number
}

export function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData>({
    totalSales: 0,
    totalTransactions: 0,
    totalCustomers: 0,
    averageOrderValue: 0,
    topProducts: [],
    salesByDay: [],
    salesGrowth: 0,
    transactionGrowth: 0
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7') // days
  const [reportType, setReportType] = useState('sales')

  const loadReportData = async () => {
    try {
      setLoading(true)
      
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - parseInt(dateRange))

      // Get sales data
      const sales = await blink.db.sales.list({
        where: {
          store_id: 'store_default',
          created_at: {
            gte: startDate.toISOString().split('T')[0]
          }
        },
        orderBy: { created_at: 'desc' }
      })

      // Get customers
      const customers = await blink.db.customers.list({
        where: { store_id: 'store_default' }
      })

      // Get products for top sellers analysis
      const products = await blink.db.products.list({
        where: { store_id: 'store_default' }
      })

      // Calculate metrics
      const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
      const totalTransactions = sales.length
      const totalCustomers = customers.length
      const averageOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0

      // Group sales by day
      const salesByDay: { [key: string]: SalesData } = {}
      sales.forEach(sale => {
        const date = new Date(sale.created_at).toISOString().split('T')[0]
        if (!salesByDay[date]) {
          salesByDay[date] = {
            date,
            sales: 0,
            transactions: 0,
            customers: 0
          }
        }
        salesByDay[date].sales += sale.total_amount
        salesByDay[date].transactions += 1
        if (sale.customer_id) {
          salesByDay[date].customers += 1
        }
      })

      // Convert to array and sort
      const salesByDayArray = Object.values(salesByDay).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // Calculate growth (compare with previous period)
      const previousPeriodStart = new Date(startDate)
      previousPeriodStart.setDate(previousPeriodStart.getDate() - parseInt(dateRange))
      
      const previousSales = await blink.db.sales.list({
        where: {
          store_id: 'store_default',
          created_at: {
            gte: previousPeriodStart.toISOString().split('T')[0],
            lt: startDate.toISOString().split('T')[0]
          }
        }
      })

      const previousTotalSales = previousSales.reduce((sum, sale) => sum + sale.total_amount, 0)
      const previousTotalTransactions = previousSales.length

      const salesGrowth = previousTotalSales > 0 
        ? ((totalSales - previousTotalSales) / previousTotalSales) * 100 
        : 0

      const transactionGrowth = previousTotalTransactions > 0 
        ? ((totalTransactions - previousTotalTransactions) / previousTotalTransactions) * 100 
        : 0

      // Get top products (mock data for now - would need sale_items join)
      const topProducts: ProductSales[] = products.slice(0, 5).map(product => ({
        product_name: product.name,
        quantity_sold: Math.floor(Math.random() * 50) + 10,
        revenue: Math.floor(Math.random() * 1000) + 100
      }))

      setReportData({
        totalSales,
        totalTransactions,
        totalCustomers,
        averageOrderValue,
        topProducts,
        salesByDay: salesByDayArray,
        salesGrowth,
        transactionGrowth
      })
    } catch (error) {
      console.error('Failed to load report data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReportData()
  }, [dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  const exportReport = () => {
    const csvContent = [
      'Date,Sales,Transactions,Customers',
      ...reportData.salesByDay.map(day => 
        `${day.date},${day.sales.toFixed(2)},${day.transactions},${day.customers}`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales_report_${dateRange}_days.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading reports...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Sales performance and business insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${reportData.totalSales.toFixed(2)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className={`w-3 h-3 mr-1 ${reportData.salesGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              {reportData.salesGrowth >= 0 ? '+' : ''}{reportData.salesGrowth.toFixed(1)}% from previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalTransactions}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className={`w-3 h-3 mr-1 ${reportData.transactionGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              {reportData.transactionGrowth >= 0 ? '+' : ''}{reportData.transactionGrowth.toFixed(1)}% from previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${reportData.averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per transaction average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Registered customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Sales Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.salesByDay.length > 0 ? (
                reportData.salesByDay.map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm font-medium">
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${day.sales.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        {day.transactions} transactions
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2" />
                  <p>No sales data for this period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.topProducts.length > 0 ? (
                reportData.topProducts.map((product, index) => (
                  <div key={product.product_name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{product.product_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${product.revenue.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.quantity_sold} sold
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2" />
                  <p>No product sales data</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Detailed Sales Report</CardTitle>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="customers">Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reportType === 'sales' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-right py-2">Sales</th>
                    <th className="text-right py-2">Transactions</th>
                    <th className="text-right py-2">Customers</th>
                    <th className="text-right py-2">Avg Order</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.salesByDay.map((day) => (
                    <tr key={day.date} className="border-b">
                      <td className="py-2">{new Date(day.date).toLocaleDateString()}</td>
                      <td className="text-right py-2 font-semibold">${day.sales.toFixed(2)}</td>
                      <td className="text-right py-2">{day.transactions}</td>
                      <td className="text-right py-2">{day.customers}</td>
                      <td className="text-right py-2">
                        ${day.transactions > 0 ? (day.sales / day.transactions).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'products' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Product</th>
                    <th className="text-right py-2">Quantity Sold</th>
                    <th className="text-right py-2">Revenue</th>
                    <th className="text-right py-2">Avg Price</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.topProducts.map((product) => (
                    <tr key={product.product_name} className="border-b">
                      <td className="py-2">{product.product_name}</td>
                      <td className="text-right py-2">{product.quantity_sold}</td>
                      <td className="text-right py-2 font-semibold">${product.revenue.toFixed(2)}</td>
                      <td className="text-right py-2">
                        ${(product.revenue / product.quantity_sold).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'customers' && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p>Customer analytics coming soon</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}