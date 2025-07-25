import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  DollarSign,
  Scan,
  User,
  Receipt,
  ShoppingCart,
  Package,
  X
} from 'lucide-react'
import { Product, CartItem, Customer } from '@/types'
import blink from '@/blink/client'
import BarcodeScanner from '../components/BarcodeScanner'

export function CheckoutPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [appliedDiscounts, setAppliedDiscounts] = useState<any[]>([])
  const [availableDiscounts, setAvailableDiscounts] = useState<any[]>([])

  const loadProducts = useCallback(async () => {
    try {
      const data = await blink.db.products.list({
        where: { 
          store_id: 'store_default',
          is_active: '1'
        },
        orderBy: { name: 'asc' },
        limit: 100
      })
      setProducts(data)
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity, total: quantity * item.product.price }
          : item
      )
    )
  }, [removeFromCart])

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id)
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * product.price }
            : item
        )
      }
      return [...prev, { product, quantity: 1, total: product.price }]
    })
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setSelectedCustomer(null)
  }, [])

  const handleBarcodeScanned = useCallback((barcode: string) => {
    // Find product by barcode
    const product = products.find(p => p.barcode === barcode)
    if (product) {
      addToCart(product)
      setShowScanner(false)
    } else {
      alert(`No product found with barcode: ${barcode}`)
    }
  }, [products, addToCart])

  const loadDiscounts = useCallback(async () => {
    try {
      const data = await blink.db.discounts.list({
        where: { 
          store_id: 'store_default',
          is_active: '1'
        }
      })
      setAvailableDiscounts(data)
    } catch (error) {
      console.error('Failed to load discounts:', error)
    }
  }, [])

  // Load products and discounts on mount
  useEffect(() => {
    loadProducts()
    loadDiscounts()
  }, [loadProducts, loadDiscounts])

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const discountAmount = appliedDiscounts.reduce((sum, discount) => {
    if (discount.discount_type === 'percentage') {
      return sum + (subtotal * (discount.discount_value / 100))
    } else if (discount.discount_type === 'fixed_amount') {
      return sum + discount.discount_value
    }
    return sum
  }, 0)
  const discountedSubtotal = Math.max(0, subtotal - discountAmount)
  const taxRate = 0.08 // 8% tax
  const taxAmount = discountedSubtotal * taxRate
  const total = discountedSubtotal + taxAmount

  const applyDiscount = (discount: any) => {
    // Check if discount is already applied
    if (appliedDiscounts.find(d => d.id === discount.id)) return

    // Check minimum order amount
    if (discount.min_order_amount && subtotal < discount.min_order_amount) {
      alert(`Minimum order amount of ${discount.min_order_amount} required for this discount`)
      return
    }

    setAppliedDiscounts(prev => [...prev, discount])
  }

  const removeDiscount = (discountId: string) => {
    setAppliedDiscounts(prev => prev.filter(d => d.id !== discountId))
  }

  const processPayment = async () => {
    if (cart.length === 0) return

    setProcessing(true)
    try {
      // Create sale record
      const receiptNumber = `RCP-${Date.now()}`
      const saleData = {
        id: `sale_${Date.now()}`,
        store_id: 'store_default',
        staff_id: 'staff_default', // TODO: Get from auth
        customer_id: selectedCustomer?.id,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: total,
        payment_method: paymentMethod,
        payment_status: 'completed',
        receipt_number: receiptNumber,
        notes: ''
      }

      await blink.db.sales.create(saleData)

      // Create sale items
      for (const item of cart) {
        await blink.db.sale_items.create({
          id: `item_${Date.now()}_${item.product.id}`,
          sale_id: saleData.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.total
        })

        // Update product stock
        const newStock = item.product.stock_quantity - item.quantity
        await blink.db.products.update(item.product.id, {
          stock_quantity: Math.max(0, newStock)
        })
      }

      // Update customer if selected
      if (selectedCustomer) {
        await blink.db.customers.update(selectedCustomer.id, {
          total_spent: selectedCustomer.total_spent + total,
          visit_count: selectedCustomer.visit_count + 1,
          loyalty_points: selectedCustomer.loyalty_points + Math.floor(total)
        })
      }

      // Clear cart and show success
      clearCart()
      alert(`Payment processed successfully!\nReceipt: ${receiptNumber}`)
      
      // Reload products to update stock
      loadProducts()
    } catch (error) {
      console.error('Payment processing failed:', error)
      alert('Payment processing failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading products...</div>
      </div>
    )
  }

  return (
    <div className="pos-grid">
      {/* Products Section */}
      <div className="flex flex-col h-full">
        {/* Search Bar */}
        <div className="p-6 border-b border-border">
          <div className="flex space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name, SKU, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              className="touch-button"
              onClick={() => setShowScanner(true)}
            >
              <Scan className="w-4 h-4 mr-2" />
              Scan
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        <ScrollArea className="flex-1 p-6">
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-md transition-shadow touch-button"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4">
                  <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-medium text-sm mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-semibold text-primary">${product.price.toFixed(2)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant={Number(product.stock_quantity) > 0 ? 'secondary' : 'destructive'}>
                      Stock: {product.stock_quantity}
                    </Badge>
                    {product.sku && (
                      <span className="text-xs text-muted-foreground">{product.sku}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No products found</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart Section */}
      <div className="bg-card border-l border-border flex flex-col h-full">
        {/* Cart Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Cart ({cart.length})
            </h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Customer Selection */}
        <div className="p-6 border-b border-border">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start touch-button">
                <User className="w-4 h-4 mr-2" />
                {selectedCustomer ? selectedCustomer.name : 'Select Customer (Optional)'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Search customers..." />
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    No Customer (Walk-in)
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 p-6">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Cart is empty</p>
              <p className="text-sm text-muted-foreground">Add products to start a sale</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.product.id} className="cart-item p-3 rounded-lg border">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm flex-1">{item.product.name}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">${item.product.price.toFixed(2)} each</p>
                      <p className="font-semibold">${item.total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Cart Summary & Payment */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-border space-y-4">
            {/* Discounts */}
            {availableDiscounts.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Available Discounts</label>
                <div className="space-y-1">
                  {availableDiscounts.map((discount) => (
                    <Button
                      key={discount.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => applyDiscount(discount)}
                      disabled={appliedDiscounts.find(d => d.id === discount.id)}
                    >
                      {discount.name} - {discount.discount_type === 'percentage' 
                        ? `${discount.discount_value}% off` 
                        : `${discount.discount_value} off`}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Applied Discounts */}
            {appliedDiscounts.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Applied Discounts</label>
                <div className="space-y-1">
                  {appliedDiscounts.map((discount) => (
                    <div key={discount.id} className="flex items-center justify-between bg-green-50 p-2 rounded text-sm">
                      <span>{discount.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600 font-semibold">
                          -{discount.discount_type === 'percentage' 
                            ? `${discount.discount_value}%` 
                            : `${discount.discount_value}`}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDiscount(discount.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount:</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Tax (8%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-sm font-medium mb-2 block">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Cash
                    </div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Card
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                onClick={processPayment}
                disabled={processing}
                className="w-full touch-button"
                size="lg"
              >
                {processing ? (
                  'Processing...'
                ) : (
                  <>
                    <Receipt className="w-4 h-4 mr-2" />
                    Complete Sale - ${total.toFixed(2)}
                  </>
                )}
              </Button>
              <Button variant="outline" className="w-full touch-button">
                Park Sale
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleBarcodeScanned}
        onClose={() => setShowScanner(false)}
      />
    </div>
  )
}