import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Star,
  DollarSign,
  ShoppingBag,
  Edit,
  Trash2,
  Gift
} from 'lucide-react'
import { Customer } from '@/types'
import blink from '@/blink/client'

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const loadCustomers = useCallback(async () => {
    try {
      const data = await blink.db.customers.list({
        where: { store_id: 'store_default' },
        orderBy: { name: 'asc' },
        limit: 100
      })
      setCustomers(data)
    } catch (error) {
      console.error('Failed to load customers:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const handleAddCustomer = async (customerData: Partial<Customer>) => {
    try {
      const newCustomer = await blink.db.customers.create({
        id: `cust_${Date.now()}`,
        ...customerData,
        store_id: 'store_default',
        loyalty_points: 0,
        total_spent: 0,
        visit_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      setCustomers(prev => [...prev, newCustomer])
      setShowAddCustomer(false)
    } catch (error) {
      console.error('Error adding customer:', error)
      alert('Failed to add customer')
    }
  }

  const handleUpdateCustomer = async (customerData: Partial<Customer>) => {
    if (!editingCustomer) return

    try {
      await blink.db.customers.update(editingCustomer.id, {
        ...customerData,
        updated_at: new Date().toISOString()
      })
      setCustomers(prev => prev.map(c => 
        c.id === editingCustomer.id ? { ...c, ...customerData } : c
      ))
      setEditingCustomer(null)
    } catch (error) {
      console.error('Error updating customer:', error)
      alert('Failed to update customer')
    }
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return

    try {
      await blink.db.customers.delete(customerId)
      setCustomers(prev => prev.filter(c => c.id !== customerId))
    } catch (error) {
      console.error('Error deleting customer:', error)
      alert('Failed to delete customer')
    }
  }

  const addLoyaltyPoints = async (customerId: string, points: number) => {
    try {
      const customer = customers.find(c => c.id === customerId)
      if (!customer) return

      await blink.db.customers.update(customerId, {
        loyalty_points: customer.loyalty_points + points,
        updated_at: new Date().toISOString()
      })
      
      setCustomers(prev => prev.map(c => 
        c.id === customerId 
          ? { ...c, loyalty_points: c.loyalty_points + points }
          : c
      ))
    } catch (error) {
      console.error('Error adding loyalty points:', error)
      alert('Failed to add loyalty points')
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  )

  const totalCustomers = customers.length
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyalty_points, 0)
  const totalSpent = customers.reduce((sum, c) => sum + c.total_spent, 0)
  const avgSpentPerCustomer = totalCustomers > 0 ? totalSpent / totalCustomers : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading customers...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage customer profiles, loyalty points, and purchase history
          </p>
        </div>
        <Button onClick={() => setShowAddCustomer(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Customer</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgSpentPerCustomer.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLoyaltyPoints.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search customers by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{customer.name}</CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                    {customer.email && (
                      <div className="flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {customer.email}
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {customer.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCustomer(customer)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCustomer(customer.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.address && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3 mr-2" />
                  {customer.address}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Spent</p>
                  <p className="font-semibold">${customer.total_spent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Visits</p>
                  <p className="font-semibold">{customer.visit_count}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-500 mr-1" />
                  <span className="font-semibold">{customer.loyalty_points}</span>
                  <span className="text-sm text-muted-foreground ml-1">points</span>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Gift className="w-3 h-3 mr-1" />
                      Add Points
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Loyalty Points</DialogTitle>
                    </DialogHeader>
                    <LoyaltyPointsForm
                      customer={customer}
                      onAddPoints={(points) => addLoyaltyPoints(customer.id, points)}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelectedCustomer(customer)}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No customers found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first customer'}
          </p>
          <Button onClick={() => setShowAddCustomer(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      {(showAddCustomer || editingCustomer) && (
        <CustomerModal
          customer={editingCustomer}
          onSave={editingCustomer ? handleUpdateCustomer : handleAddCustomer}
          onClose={() => {
            setShowAddCustomer(false)
            setEditingCustomer(null)
          }}
        />
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  )
}

// Customer Modal Component
interface CustomerModalProps {
  customer?: Customer | null
  onSave: (data: Partial<Customer>) => void
  onClose: () => void
}

function CustomerModal({ customer, onSave, onClose }: CustomerModalProps) {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    date_of_birth: customer?.date_of_birth || '',
    notes: customer?.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      alert('Name is required')
      return
    }
    onSave(formData)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Phone
            </label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Address
            </label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Date of Birth
            </label>
            <Input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Notes
            </label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about the customer..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {customer ? 'Update Customer' : 'Add Customer'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Loyalty Points Form Component
interface LoyaltyPointsFormProps {
  customer: Customer
  onAddPoints: (points: number) => void
}

function LoyaltyPointsForm({ customer, onAddPoints }: LoyaltyPointsFormProps) {
  const [points, setPoints] = useState(0)
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (points <= 0) {
      alert('Please enter a valid number of points')
      return
    }
    onAddPoints(points)
    setPoints(0)
    setReason('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Points to Add
        </label>
        <Input
          type="number"
          min="1"
          value={points}
          onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Reason (Optional)
        </label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger>
            <SelectValue placeholder="Select reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="purchase">Purchase Bonus</SelectItem>
            <SelectItem value="birthday">Birthday Bonus</SelectItem>
            <SelectItem value="referral">Referral Bonus</SelectItem>
            <SelectItem value="promotion">Promotional Bonus</SelectItem>
            <SelectItem value="compensation">Compensation</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-muted p-3 rounded-lg">
        <p className="text-sm">
          <strong>{customer.name}</strong> currently has{' '}
          <strong>{customer.loyalty_points}</strong> points
        </p>
        <p className="text-sm text-muted-foreground">
          After adding {points} points, they will have{' '}
          <strong>{customer.loyalty_points + points}</strong> points
        </p>
      </div>

      <Button type="submit" className="w-full">
        Add {points} Points
      </Button>
    </form>
  )
}

// Customer Details Modal Component
interface CustomerDetailsModalProps {
  customer: Customer
  onClose: () => void
}

function CustomerDetailsModal({ customer, onClose }: CustomerDetailsModalProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer.name} - Customer Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Contact Information</h4>
              <div className="space-y-2 text-sm">
                {customer.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                    {customer.email}
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                    {customer.phone}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                    {customer.address}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Customer Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Spent:</span>
                  <span className="font-semibold">${customer.total_spent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Visit Count:</span>
                  <span className="font-semibold">{customer.visit_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Loyalty Points:</span>
                  <span className="font-semibold">{customer.loyalty_points}</span>
                </div>
                <div className="flex justify-between">
                  <span>Member Since:</span>
                  <span className="font-semibold">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div>
              <h4 className="font-semibold mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                {customer.notes}
              </p>
            </div>
          )}

          {/* Purchase History Placeholder */}
          <div>
            <h4 className="font-semibold mb-2">Recent Purchases</h4>
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2" />
              <p>Purchase history will be displayed here</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}