import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DiscountsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Discounts & Promotions</h1>
        <p className="text-muted-foreground">Manage discounts, multibuy offers, and promotional campaigns</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Discounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <h3 className="text-lg font-medium mb-2">Discount Management</h3>
            <p className="text-muted-foreground">Feature coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}