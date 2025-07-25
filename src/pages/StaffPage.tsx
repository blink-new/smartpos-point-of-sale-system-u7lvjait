import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Plus, Search, Edit, Trash2, Clock, Users, DollarSign, Calendar, Play, Pause, Square } from 'lucide-react'
import { Staff, TimeEntry } from '@/types'
import blink from '@/blink/client'
import { useToast } from '@/hooks/use-toast'

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('staff')
  const { toast } = useToast()

  // Form state for new staff member
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier',
    hourly_rate: 15.00,
    is_active: true
  })

  const loadData = useCallback(async () => {
    try {
      const user = await blink.auth.me()
      
      // Load staff
      const staffData = await blink.db.staff.list({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' }
      })
      setStaff(staffData)

      // Load time entries
      const timeEntriesData = await blink.db.timeEntries.list({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' },
        limit: 100
      })
      setTimeEntries(timeEntriesData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load staff data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateStaff = async () => {
    try {
      const user = await blink.auth.me()
      
      if (!formData.name || !formData.email) {
        toast({
          title: 'Error',
          description: 'Please fill in name and email',
          variant: 'destructive'
        })
        return
      }

      const staffId = `staff_${Date.now()}`

      await blink.db.staff.create({
        id: staffId,
        user_id: user.id,
        store_id: 'main_store',
        name: formData.name,
        email: formData.email,
        role: formData.role,
        hourly_rate: formData.hourly_rate,
        is_active: formData.is_active ? '1' : '0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      toast({
        title: 'Success',
        description: 'Staff member added successfully'
      })

      setIsCreateDialogOpen(false)
      setFormData({
        name: '',
        email: '',
        role: 'cashier',
        hourly_rate: 15.00,
        is_active: true
      })
      loadData()
    } catch (error) {
      console.error('Error creating staff:', error)
      toast({
        title: 'Error',
        description: 'Failed to add staff member',
        variant: 'destructive'
      })
    }
  }

  const clockIn = async (staffId: string) => {
    try {
      const user = await blink.auth.me()
      const staffMember = staff.find(s => s.id === staffId)
      
      if (!staffMember) return

      // Check if already clocked in
      const existingEntry = timeEntries.find(
        entry => entry.staff_id === staffId && entry.status === 'clocked_in'
      )

      if (existingEntry) {
        toast({
          title: 'Error',
          description: 'Staff member is already clocked in',
          variant: 'destructive'
        })
        return
      }

      const timeEntryId = `time_${Date.now()}`
      const now = new Date().toISOString()

      await blink.db.timeEntries.create({
        id: timeEntryId,
        staff_id: staffId,
        store_id: 'main_store',
        user_id: user.id,
        clock_in: now,
        break_duration: 0,
        total_hours: 0,
        hourly_rate: staffMember.hourly_rate,
        total_pay: 0,
        status: 'clocked_in',
        created_at: now,
        updated_at: now
      })

      toast({
        title: 'Success',
        description: `${staffMember.name} clocked in successfully`
      })

      loadData()
    } catch (error) {
      console.error('Error clocking in:', error)
      toast({
        title: 'Error',
        description: 'Failed to clock in',
        variant: 'destructive'
      })
    }
  }

  const clockOut = async (staffId: string) => {
    try {
      const staffMember = staff.find(s => s.id === staffId)
      const activeEntry = timeEntries.find(
        entry => entry.staff_id === staffId && entry.status === 'clocked_in'
      )

      if (!activeEntry || !staffMember) {
        toast({
          title: 'Error',
          description: 'No active clock-in found',
          variant: 'destructive'
        })
        return
      }

      const now = new Date().toISOString()
      const clockInTime = new Date(activeEntry.clock_in)
      const clockOutTime = new Date(now)
      const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)
      const totalPay = totalHours * activeEntry.hourly_rate

      await blink.db.timeEntries.update(activeEntry.id, {
        clock_out: now,
        total_hours: totalHours,
        total_pay: totalPay,
        status: 'clocked_out',
        updated_at: now
      })

      toast({
        title: 'Success',
        description: `${staffMember.name} clocked out successfully`
      })

      loadData()
    } catch (error) {
      console.error('Error clocking out:', error)
      toast({
        title: 'Error',
        description: 'Failed to clock out',
        variant: 'destructive'
      })
    }
  }

  const startBreak = async (staffId: string) => {
    try {
      const activeEntry = timeEntries.find(
        entry => entry.staff_id === staffId && entry.status === 'clocked_in'
      )

      if (!activeEntry) {
        toast({
          title: 'Error',
          description: 'No active clock-in found',
          variant: 'destructive'
        })
        return
      }

      const now = new Date().toISOString()

      await blink.db.timeEntries.update(activeEntry.id, {
        break_start: now,
        status: 'on_break',
        updated_at: now
      })

      toast({
        title: 'Success',
        description: 'Break started'
      })

      loadData()
    } catch (error) {
      console.error('Error starting break:', error)
      toast({
        title: 'Error',
        description: 'Failed to start break',
        variant: 'destructive'
      })
    }
  }

  const endBreak = async (staffId: string) => {
    try {
      const activeEntry = timeEntries.find(
        entry => entry.staff_id === staffId && entry.status === 'on_break'
      )

      if (!activeEntry || !activeEntry.break_start) {
        toast({
          title: 'Error',
          description: 'No active break found',
          variant: 'destructive'
        })
        return
      }

      const now = new Date().toISOString()
      const breakStart = new Date(activeEntry.break_start)
      const breakEnd = new Date(now)
      const breakDuration = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60) // in minutes

      await blink.db.timeEntries.update(activeEntry.id, {
        break_end: now,
        break_duration: activeEntry.break_duration + breakDuration,
        status: 'clocked_in',
        updated_at: now
      })

      toast({
        title: 'Success',
        description: 'Break ended'
      })

      loadData()
    } catch (error) {
      console.error('Error ending break:', error)
      toast({
        title: 'Error',
        description: 'Failed to end break',
        variant: 'destructive'
      })
    }
  }

  const toggleStaffStatus = async (staffId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === '1' ? '0' : '1'
      await blink.db.staff.update(staffId, {
        is_active: newStatus,
        updated_at: new Date().toISOString()
      })
      
      toast({
        title: 'Success',
        description: `Staff member ${newStatus === '1' ? 'activated' : 'deactivated'}`
      })
      
      loadData()
    } catch (error) {
      console.error('Error updating staff:', error)
      toast({
        title: 'Error',
        description: 'Failed to update staff status',
        variant: 'destructive'
      })
    }
  }

  const getStaffStatus = (staffId: string) => {
    const activeEntry = timeEntries.find(
      entry => entry.staff_id === staffId && (entry.status === 'clocked_in' || entry.status === 'on_break')
    )
    return activeEntry?.status || 'clocked_out'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clocked_in': return 'bg-green-100 text-green-800'
      case 'on_break': return 'bg-yellow-100 text-yellow-800'
      case 'clocked_out': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'cashier': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return `${h}h ${m}m`
  }

  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const todayEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.created_at).toDateString()
    const today = new Date().toDateString()
    return entryDate === today
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading staff data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">Manage staff members and track working hours</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="staff@example.com"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateStaff}>
                  Add Staff Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-xl font-bold">{staff.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Currently Working</p>
                <p className="text-xl font-bold">
                  {staff.filter(s => getStaffStatus(s.id) === 'clocked_in').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Pause className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">On Break</p>
                <p className="text-xl font-bold">
                  {staff.filter(s => getStaffStatus(s.id) === 'on_break').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Today's Payroll</p>
                <p className="text-xl font-bold">
                  ${todayEntries.reduce((sum, entry) => sum + entry.total_pay, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="staff">Staff Members</TabsTrigger>
          <TabsTrigger value="timesheet">Time Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Staff Table */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredStaff.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No staff members found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'Try adjusting your search terms' : 'Add your first staff member to get started'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Staff Member
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Hourly Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Work Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((member) => {
                      const workStatus = getStaffStatus(member.id)
                      return (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            <Badge className={getRoleColor(member.role)}>
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>${member.hourly_rate.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={member.is_active === '1' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {member.is_active === '1' ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(workStatus)}>
                              {workStatus === 'clocked_in' ? 'Working' : 
                               workStatus === 'on_break' ? 'On Break' : 'Off Duty'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {workStatus === 'clocked_out' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => clockIn(member.id)}
                                >
                                  <Play className="w-4 h-4 mr-1" />
                                  Clock In
                                </Button>
                              )}
                              {workStatus === 'clocked_in' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => startBreak(member.id)}
                                  >
                                    <Pause className="w-4 h-4 mr-1" />
                                    Break
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => clockOut(member.id)}
                                  >
                                    <Square className="w-4 h-4 mr-1" />
                                    Clock Out
                                  </Button>
                                </>
                              )}
                              {workStatus === 'on_break' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => endBreak(member.id)}
                                  >
                                    <Play className="w-4 h-4 mr-1" />
                                    End Break
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => clockOut(member.id)}
                                  >
                                    <Square className="w-4 h-4 mr-1" />
                                    Clock Out
                                  </Button>
                                </>
                              )}
                              <Switch
                                checked={member.is_active === '1'}
                                onCheckedChange={() => toggleStaffStatus(member.id, member.is_active)}
                                size="sm"
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timesheet" className="space-y-4">
          {/* Time Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {timeEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No time entries found</h3>
                  <p className="text-muted-foreground">Time entries will appear here when staff clock in</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Break Duration</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Total Pay</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry) => {
                      const staffMember = staff.find(s => s.id === entry.staff_id)
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {staffMember?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {new Date(entry.clock_in).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {entry.clock_out ? new Date(entry.clock_out).toLocaleString() : '-'}
                          </TableCell>
                          <TableCell>
                            {entry.break_duration > 0 ? `${Math.round(entry.break_duration)}m` : '-'}
                          </TableCell>
                          <TableCell>
                            {entry.total_hours > 0 ? formatDuration(entry.total_hours) : '-'}
                          </TableCell>
                          <TableCell>
                            ${entry.total_pay.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(entry.status)}>
                              {entry.status === 'clocked_in' ? 'Working' : 
                               entry.status === 'on_break' ? 'On Break' : 'Completed'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}