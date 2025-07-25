import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PurchaseOrdersPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <p className="text-muted-foreground">Manage supplier orders and inventory restocking</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <h3 className="text-lg font-medium mb-2">Purchase Orders Management</h3>
            <p className="text-muted-foreground">Feature coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}