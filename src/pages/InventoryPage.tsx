import React, { useState, useEffect, useRef } from 'react'
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Scan,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react'
import blink from '../blink/client'
import BarcodeScanner from '../components/BarcodeScanner'

interface Product {
  id: string
  name: string
  barcode: string
  category: string
  price: number
  cost: number
  stock_quantity: number
  min_stock_level: number
  description?: string
  store_id: string
  created_at: string
  updated_at: string
}

interface CSVUploadResult {
  success: number
  errors: string[]
  total: number
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [csvUploadResult, setCsvUploadResult] = useState<CSVUploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = ['Electronics', 'Clothing', 'Food & Beverage', 'Books', 'Home & Garden', 'Sports', 'Health & Beauty']

  const loadProducts = async () => {
    try {
      setLoading(true)
      const user = await blink.auth.me()
      const productsData = await blink.db.products.list({
        where: { store_id: user.id },
        orderBy: { name: 'asc' }
      })
      setProducts(productsData)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const handleBarcodeScanned = async (barcode: string) => {
    // Check if product with this barcode already exists
    const existingProduct = products.find(p => p.barcode === barcode)
    if (existingProduct) {
      alert(`Product "${existingProduct.name}" already exists with this barcode`)
      return
    }

    // Pre-fill the add product form with the scanned barcode
    setShowAddProduct(true)
    // You could also auto-populate other fields by looking up the barcode in a product database
  }

  const handleAddProduct = async (productData: Partial<Product>) => {
    try {
      const user = await blink.auth.me()
      const newProduct = await blink.db.products.create({
        id: `prod_${Date.now()}`,
        ...productData,
        store_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      setProducts(prev => [...prev, newProduct])
      setShowAddProduct(false)
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Failed to add product')
    }
  }

  const handleUpdateProduct = async (productData: Partial<Product>) => {
    if (!editingProduct) return

    try {
      await blink.db.products.update(editingProduct.id, {
        ...productData,
        updated_at: new Date().toISOString()
      })
      setProducts(prev => prev.map(p => 
        p.id === editingProduct.id ? { ...p, ...productData } : p
      ))
      setEditingProduct(null)
    } catch (error) {
      console.error('Error updating product:', error)
      alert('Failed to update product')
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      await blink.db.products.delete(productId)
      setProducts(prev => prev.filter(p => p.id !== productId))
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    }
  }

  const downloadCSVTemplate = () => {
    const csvContent = [
      'name,barcode,category,price,cost,stock_quantity,min_stock_level,description',
      'Sample Product,1234567890123,Electronics,29.99,15.00,100,10,Sample product description',
      'Another Product,9876543210987,Clothing,49.99,25.00,50,5,Another sample product'
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      
      const user = await blink.auth.me()
      const results: CSVUploadResult = { success: 0, errors: [], total: lines.length - 1 }

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(v => v.trim())
          const productData: any = {}

          headers.forEach((header, index) => {
            productData[header] = values[index] || ''
          })

          // Validate required fields
          if (!productData.name || !productData.barcode) {
            results.errors.push(`Row ${i}: Missing required fields (name, barcode)`)
            continue
          }

          // Check for duplicate barcode
          const existingProduct = products.find(p => p.barcode === productData.barcode)
          if (existingProduct) {
            results.errors.push(`Row ${i}: Barcode ${productData.barcode} already exists`)
            continue
          }

          // Convert numeric fields
          productData.price = parseFloat(productData.price) || 0
          productData.cost = parseFloat(productData.cost) || 0
          productData.stock_quantity = parseInt(productData.stock_quantity) || 0
          productData.min_stock_level = parseInt(productData.min_stock_level) || 0

          // Add product to database
          await blink.db.products.create({
            id: `prod_${Date.now()}_${i}`,
            ...productData,
            store_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

          results.success++
        } catch (error) {
          results.errors.push(`Row ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      setCsvUploadResult(results)
      loadProducts() // Reload products
    } catch (error) {
      alert('Failed to process CSV file')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode.includes(searchTerm) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading inventory...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">{products.length} products • {lowStockProducts.length} low stock alerts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Scan className="w-4 h-4" />
            Scan Barcode
          </button>
          <button
            onClick={() => setShowAddProduct(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Low Stock Alerts</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStockProducts.map(product => (
              <div key={product.id} className="text-sm text-yellow-700">
                {product.name} - Only {product.stock_quantity} left
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSV Upload Results */}
      {csvUploadResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">CSV Upload Results</h3>
              <p className="text-blue-700">
                Successfully imported {csvUploadResult.success} of {csvUploadResult.total} products
              </p>
              {csvUploadResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-600 font-medium">Errors:</p>
                  <ul className="text-sm text-red-600 list-disc list-inside">
                    {csvUploadResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {csvUploadResult.errors.length > 5 && (
                      <li>... and {csvUploadResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={() => setCsvUploadResult(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products by name, barcode, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <button
              onClick={downloadCSVTemplate}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Template
            </button>
            <label className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Import CSV
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.category}</p>
                <p className="text-xs text-gray-400 font-mono">{product.barcode}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditingProduct(product)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Price:</span>
                <span className="font-semibold">${product.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cost:</span>
                <span className="text-sm">${product.cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Stock:</span>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${
                    product.stock_quantity <= product.min_stock_level 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {product.stock_quantity}
                  </span>
                  {product.stock_quantity <= product.min_stock_level && (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Min level: {product.min_stock_level}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first product'
            }
          </p>
          <button
            onClick={() => setShowAddProduct(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Add Product
          </button>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleBarcodeScanned}
        onClose={() => setShowScanner(false)}
      />

      {/* Add/Edit Product Modal */}
      {(showAddProduct || editingProduct) && (
        <ProductModal
          product={editingProduct}
          onSave={editingProduct ? handleUpdateProduct : handleAddProduct}
          onClose={() => {
            setShowAddProduct(false)
            setEditingProduct(null)
          }}
          categories={categories}
        />
      )}
    </div>
  )
}

// Product Modal Component
interface ProductModalProps {
  product?: Product | null
  onSave: (data: Partial<Product>) => void
  onClose: () => void
  categories: string[]
}

function ProductModal({ product, onSave, onClose, categories }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    barcode: product?.barcode || '',
    category: product?.category || categories[0],
    price: product?.price || 0,
    cost: product?.cost || 0,
    stock_quantity: product?.stock_quantity || 0,
    min_stock_level: product?.min_stock_level || 0,
    description: product?.description || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.barcode) {
      alert('Name and barcode are required')
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {product ? 'Edit Product' : 'Add New Product'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barcode *
            </label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Stock Level
              </label>
              <input
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => setFormData(prev => ({ ...prev, min_stock_level: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              {product ? 'Update Product' : 'Add Product'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}