'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useAppSelector } from '@/lib/hooks';
import { 
  Package, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  FileSpreadsheet, 
  Sparkles,
  Barcode,
  Edit2,
  Trash2,
  Check,
  X,
  Store,
  Layers,
  ArrowUpDown,
  Filter,
  RefreshCw,
  TrendingDown,
  Camera,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { 
  getStoreProductsAction, 
  toggleProductStockAction, 
  importRegionalMasterCatalogAction,
  saveProductAction,
  updateProductPriceAction,
  deleteProductAction,
  getMerchantStoreAction
} from '@/modules/bazar/actions';
import type { BazarProduct, BazarStore } from '@/modules/bazar/schemas';
import { resolveProductImage } from '@/modules/bazar/services/imageResolver';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = [
  'All',
  'Grains & Flours',
  'Cooking Oils & Ghee',
  'Masalas & Spices',
  'Dairy & Bread',
  'Snacks & Beverages',
  'Personal & Home Care'
];

export default function BazarInventoryPage() {
  const { toast } = useToast();
  const { currentUser } = useAppSelector((state) => state.user);
  
  // Store resolution: user's store or fallback default
  const [storeId, setStoreId] = useState<string>('default_store');
  const [storeName, setStoreName] = useState<string>('श्री महालक्ष्मी सुपर बझार (Palus)');
  
  const [products, setProducts] = useState<BazarProduct[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editMrp, setEditMrp] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);

  // New product modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '',
    nameMarathi: '',
    price: '',
    mrp: '',
    unit: '1 kg',
    category: 'Grains & Flours',
    barcode: ''
  });

  // Resolve Store ID
  useEffect(() => {
    async function initStore() {
      if (currentUser?.id) {
        try {
          const s = await getMerchantStoreAction(currentUser.id);
          if (s) {
            setStoreId(s.id!);
            setStoreName(s.name);
          }
        } catch (e) {
          console.error('Store resolution error:', e);
        }
      }
    }
    initStore();
  }, [currentUser?.id]);

  // Load Products
  const loadProducts = async (targetStoreId = storeId) => {
    setLoading(true);
    try {
      const prods = await getStoreProductsAction(targetStoreId);
      setProducts(prods);
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      loadProducts(storeId);
    }
  }, [storeId]);

  // Stock Toggle Handler
  const handleToggleStock = async (productId: string, currentStock: boolean) => {
    const nextStock = !currentStock;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, inStock: nextStock } : p));

    const res = await toggleProductStockAction(productId, nextStock);
    if (!res.success) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, inStock: currentStock } : p));
      toast({
        title: 'Failed to update stock',
        description: res.error,
        variant: 'destructive',
      });
    }
  };

  // Inline Price Edit Handlers
  const startInlineEdit = (item: BazarProduct) => {
    setEditingId(item.id!);
    setEditPrice(item.price.toString());
    setEditMrp(item.discountPrice ? item.discountPrice.toString() : '');
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditPrice('');
    setEditMrp('');
  };

  const saveInlinePrice = async (productId: string) => {
    const parsedPrice = parseFloat(editPrice);
    const parsedMrp = editMrp ? parseFloat(editMrp) : undefined;

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast({ title: 'Invalid price', description: 'Please enter a valid price in rupees.', variant: 'destructive' });
      return;
    }

    setSavingEdit(true);
    try {
      const res = await updateProductPriceAction(productId, parsedPrice, parsedMrp);
      if (res.success) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, price: parsedPrice, discountPrice: parsedMrp } : p));
        toast({ title: 'Price updated', description: 'New price is live on storefront immediately.' });
        setEditingId(null);
      } else {
        toast({ title: 'Failed to update price', description: res.error, variant: 'destructive' });
      }
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete product handler
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this item from your inventory?')) return;
    
    // Optimistic delete
    setProducts(prev => prev.filter(p => p.id !== productId));
    const res = await deleteProductAction(productId);
    if (res.success) {
      toast({ title: 'Item removed from catalog' });
    } else {
      toast({ title: 'Failed to remove', description: res.error, variant: 'destructive' });
      loadProducts();
    }
  };

  // Preload Sangli Catalog
  const handleImportMaster = async () => {
    setImporting(true);
    try {
      const res = await importRegionalMasterCatalogAction(storeId);
      if (res.success) {
        toast({
          title: 'Catalog Preloaded!',
          description: `Loaded ${res.count} items into your store with Sangli market rates.`,
        });
        await loadProducts(storeId);
      } else {
        toast({ title: 'Preload failed', description: res.error, variant: 'destructive' });
      }
    } finally {
      setImporting(false);
    }
  };

  // Direct CSV File Upload (1-Click without Google Sheets)
  const handleCsvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCsv(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('storeId', storeId);

      const res = await fetch('/api/bazar/import-csv', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Import Successful!',
          description: data.message || `Loaded ${data.importedCount} items into your store.`
        });
        await loadProducts(storeId);
      } else {
        toast({
          title: 'Import Failed',
          description: data.error || 'Failed to parse file',
          variant: 'destructive'
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error uploading file',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setUploadingCsv(false);
      // Reset input value so same file can be reselected if needed
      e.target.value = '';
    }
  };

  // Add Product Form Submit
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim() || !newForm.price) {
      toast({ title: 'Missing fields', description: 'Product name and selling price are required.', variant: 'destructive' });
      return;
    }

    setAddingProduct(true);
    try {
      const res = await saveProductAction({
        storeId,
        name: newForm.name.trim(),
        nameMarathi: newForm.nameMarathi.trim() || undefined,
        price: parseFloat(newForm.price),
        discountPrice: newForm.mrp ? parseFloat(newForm.mrp) : undefined,
        unit: newForm.unit.trim() || '1 unit',
        category: newForm.category,
        barcode: newForm.barcode.trim() || undefined,
        inStock: true
      });

      if (res.success) {
        toast({ title: 'Product Added!', description: `${newForm.name} is now available in your store.` });
        setIsAddOpen(false);
        setNewForm({
          name: '',
          nameMarathi: '',
          price: '',
          mrp: '',
          unit: '1 kg',
          category: 'Grains & Flours',
          barcode: ''
        });
        await loadProducts(storeId);
      } else {
        toast({ title: 'Failed to add', description: res.error, variant: 'destructive' });
      }
    } finally {
      setAddingProduct(false);
    }
  };

  // Filtering & Sorting
  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        (p.nameMarathi && p.nameMarathi.includes(search)) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.includes(search));
      
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const inStockTotal = products.filter(p => p.inStock).length;
  const outOfStockTotal = products.length - inStockTotal;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-[#0D7C4D]" />
              Store Catalog & Inventory
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-[#0D7C4D] border-emerald-200">
              {storeName}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your daily prices, in-stock status, and add items in 1-tap.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Add Product Modal */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#0D7C4D] hover:bg-[#0A633D] text-white">
                <Plus className="h-4 w-4 mr-1.5" />
                Quick Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <form onSubmit={handleAddProductSubmit}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <Plus className="h-5 w-5 text-[#0D7C4D]" />
                    Add Product to Inventory
                  </DialogTitle>
                  <DialogDescription>
                    Add custom items or regional groceries not found in the master list.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="p-name" className="text-xs font-semibold">Product Name (English) *</Label>
                      <Input
                        id="p-name"
                        placeholder="e.g. Indrayani Rice"
                        value={newForm.name}
                        onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="p-name-mr" className="text-xs font-semibold">मराठी नाव (Marathi Name)</Label>
                      <Input
                        id="p-name-mr"
                        placeholder="उदा. इंद्रायणी तांदूळ"
                        value={newForm.nameMarathi}
                        onChange={(e) => setNewForm({ ...newForm, nameMarathi: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="p-price" className="text-xs font-semibold">Our Price (₹) *</Label>
                      <Input
                        id="p-price"
                        type="number"
                        placeholder="75"
                        value={newForm.price}
                        onChange={(e) => setNewForm({ ...newForm, price: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="p-mrp" className="text-xs font-semibold">MRP (₹, optional)</Label>
                      <Input
                        id="p-mrp"
                        type="number"
                        placeholder="85"
                        value={newForm.mrp}
                        onChange={(e) => setNewForm({ ...newForm, mrp: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="p-unit" className="text-xs font-semibold">Pack Size / Unit *</Label>
                      <Input
                        id="p-unit"
                        placeholder="1 kg, 500 g, 1 Litre, 1 Packet"
                        value={newForm.unit}
                        onChange={(e) => setNewForm({ ...newForm, unit: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="p-cat" className="text-xs font-semibold">Category</Label>
                      <select
                        id="p-cat"
                        className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={newForm.category}
                        onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
                      >
                        {CATEGORIES.filter(c => c !== 'All').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="p-barcode" className="text-xs font-semibold">Barcode / SKU (optional)</Label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="p-barcode"
                        placeholder="890103001001"
                        value={newForm.barcode}
                        onChange={(e) => setNewForm({ ...newForm, barcode: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#0D7C4D] text-white hover:bg-[#0A633D]" disabled={addingProduct}>
                    {addingProduct ? 'Adding...' : 'Save Product'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Direct CSV Upload Button (1-Click, no URL setup) */}
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvFileUpload}
              className="hidden"
              disabled={uploadingCsv}
            />
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              disabled={uploadingCsv}
              className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 pointer-events-none"
            >
              <Upload className="h-4 w-4 mr-1.5 text-emerald-600" />
              {uploadingCsv ? 'Importing File...' : '1-Click Upload CSV'}
            </Button>
          </label>

          {/* Google Sheets Sync Link */}
          <Button variant="outline" size="sm" asChild>
            <Link href="/bazar/sheets-sync">
              <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
              Google Sheet URL
            </Link>
          </Button>

          {/* Preload Sangli Catalog Button */}
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={handleImportMaster} 
            disabled={importing}
            className="border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          >
            <Sparkles className="h-4 w-4 mr-1.5 text-emerald-600" />
            {importing ? 'Preloading...' : 'Preload Master Catalog'}
          </Button>
        </div>
      </div>

      {/* Quick Stat Pill Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Items</p>
            <p className="text-xl font-bold mt-0.5">{products.length}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Package className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">In Stock (Active)</p>
            <p className="text-xl font-bold mt-0.5 text-emerald-600">{inStockTotal}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-50 text-[#0D7C4D] flex items-center justify-center font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Out of Stock</p>
            <p className="text-xl font-bold mt-0.5 text-amber-600">{outOfStockTotal}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <XCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Sync Source</p>
            <p className="text-sm font-bold mt-0.5 truncate max-w-[120px]">Master + Sheets</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Zero Product Banner for quick start */}
      {!loading && products.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="font-bold text-emerald-900 text-lg flex items-center gap-2 justify-center md:justify-start">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Preload 20+ Regional Kirana Items in 1-Click
            </h3>
            <p className="text-xs md:text-sm text-emerald-800">
              No need to type! Populate Chakki Atta, Wada Kolam rice, Fortune Oil, and spices with Sangli market rates instantly.
            </p>
          </div>
          <Button 
            onClick={handleImportMaster} 
            disabled={importing}
            className="bg-[#0D7C4D] hover:bg-[#0A633D] text-white shadow font-semibold"
          >
            {importing ? 'Preloading...' : 'Preload Master Catalog Now'}
          </Button>
        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product in English or Marathi (उदा. तांदूळ, तेल, Dal, Atta, Barcode)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => loadProducts(storeId)} className="h-11 px-3">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat 
                  ? 'bg-[#0D7C4D] text-white' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List Table / Card View */}
      <Card className="rounded-2xl overflow-hidden border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin text-[#0D7C4D]" />
              <p className="text-sm font-medium">Loading store inventory...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground space-y-3">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm font-medium">No products matching your search</p>
              <Button size="sm" variant="outline" onClick={() => { setSearch(''); setSelectedCategory('All'); }}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(item => {
                const isEditing = editingId === item.id;
                const itemImage = resolveProductImage(
                  item.name, 
                  item.category, 
                  item.images?.[0], 
                  item.nameMarathi
                );

                return (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    {/* Item Thumbnail & Details */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative h-14 w-14 rounded-xl bg-muted/40 border border-border shrink-0 overflow-hidden flex items-center justify-center">
                        <Image
                          src={itemImage}
                          alt={item.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-foreground">{item.name}</p>
                          <Badge variant="outline" className="text-[11px] font-normal py-0 h-5">
                            {item.unit}
                          </Badge>
                          {item.barcode && (
                            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5 bg-muted px-1.5 py-0.5 rounded">
                              <Barcode className="h-3 w-3" />
                              {item.barcode}
                            </span>
                          )}
                        </div>

                        {item.nameMarathi && (
                          <p className="text-xs text-muted-foreground font-medium">
                            {item.nameMarathi}
                          </p>
                        )}

                        {/* Price Section with Inline Edit */}
                        <div className="flex items-center gap-2 pt-1">
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">Price ₹</span>
                                <Input
                                  type="number"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="h-7 w-20 text-xs px-2"
                                  autoFocus
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">MRP ₹</span>
                                <Input
                                  type="number"
                                  value={editMrp}
                                  onChange={(e) => setEditMrp(e.target.value)}
                                  className="h-7 w-20 text-xs px-2"
                                />
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => saveInlinePrice(item.id!)} 
                                disabled={savingEdit}
                                className="h-7 px-2 bg-[#0D7C4D] text-white hover:bg-[#0A633D]"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={cancelInlineEdit}
                                className="h-7 px-2"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[#0D7C4D]">
                                ₹{item.price}
                              </span>
                              {item.discountPrice && item.discountPrice > item.price && (
                                <span className="text-xs text-muted-foreground line-through">
                                  MRP ₹{item.discountPrice}
                                </span>
                              )}
                              <button
                                onClick={() => startInlineEdit(item)}
                                className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-0.5 ml-1 p-1 hover:bg-muted rounded"
                                title="Click to edit price"
                              >
                                <Edit2 className="h-3 w-3" />
                                <span className="text-[11px] underline">Edit</span>
                              </button>
                              <span className="text-xs text-muted-foreground">• {item.category}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stock & Action Controls */}
                    <div className="flex items-center gap-4 self-end md:self-center">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${item.inStock ? 'text-[#0D7C4D]' : 'text-muted-foreground'}`}>
                          {item.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                        <Switch
                          checked={item.inStock}
                          onCheckedChange={() => handleToggleStock(item.id!, item.inStock)}
                        />
                      </div>

                      <button
                        onClick={() => handleDeleteProduct(item.id!)}
                        className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Remove product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
