export interface Store {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  tax_rate: number
  currency: string
  timezone: string
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  user_id: string
  store_id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'cashier'
  hourly_rate: number
  is_active: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  store_id: string
  name: string
  description?: string
  color: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  store_id: string
  category_id?: string
  name: string
  description?: string
  sku?: string
  barcode?: string
  price: number
  cost: number
  stock_quantity: number
  min_stock_level: number
  is_active: string
  image_url?: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  store_id: string
  name: string
  email?: string
  phone?: string
  address?: string
  loyalty_points: number
  total_spent: number
  visit_count: number
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  store_id: string
  staff_id: string
  customer_id?: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  payment_method: string
  payment_status: string
  receipt_number: string
  notes?: string
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface Shift {
  id: string
  staff_id: string
  store_id: string
  clock_in: string
  clock_out?: string
  break_duration: number
  total_hours: number
  hourly_rate: number
  total_pay: number
  status: 'active' | 'completed'
  created_at: string
}

export interface CartItem {
  product: Product
  quantity: number
  total: number
}

export interface AuthUser {
  id: string
  email: string
  name?: string
}