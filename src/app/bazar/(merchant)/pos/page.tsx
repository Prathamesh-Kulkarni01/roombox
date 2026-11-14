'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { 
  Receipt, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  User, 
  Phone, 
  Share2, 
  Printer, 
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/lib/hooks';
import { getStoreProductsAction, getMerchantStoreAction } from '@/modules/bazar/actions';
import type { BazarProduct, BazarStore } from '@/modules/bazar/schemas';
import { resolveProductImage } from '@/modules/bazar/services/imageResolver';

interface BillItem {
  id: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
}

const FREQUENT_CATEGORIES = ['All', 'Grains & Flours', 'Cooking Oils & Ghee', 'Dairy & Bread', 'Masalas & Spices', 'Snacks & Beverages'];

export default function BazarPosBillingPage() {
  const { toast } = useToast();
  const { currentUser } = useAppSelector((state) => state.user);
  const [store, setStore] = useState<BazarStore | null>(null);
  const [products, setProducts] = useState<BazarProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Current Bill State
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [completedBill, setCompletedBill] = useState<{
    billNo: string;
    items: BillItem[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: 'cash' | 'upi';
    customerName: string;
    customerPhone: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const ownerId = currentUser?.id || 'default_store';
        let storeData = await getMerchantStoreAction(ownerId);
        if (!storeData && ownerId !== 'default_store') {
          storeData = await getMerchantStoreAction('default_store');
        }
        setStore(storeData);

        const storeTargetId = storeData?.id || 'default_store';
        const prods = await getStoreProductsAction(storeTargetId);
        setProducts(prods);
      } catch (err) {
        console.warn('Failed to load store products for POS:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser?.id]);

  // Filter products by search & category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.nameMarathi && p.nameMarathi.includes(search)) ||
                          (p.barcode && p.barcode.includes(search));
      const matchCat = activeCategory === 'All' || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, activeCategory]);

  // Frequently Billed Quick Picks (First 8 in-stock items)
  const quickPicks = useMemo(() => {
    return products.filter(p => p.inStock).slice(0, 8);
  }, [products]);

  // Add Item to Bill
  const handleAddItem = (prod: BazarProduct) => {
    setBillItems(prev => {
      const existing = prev.find(item => item.id === prod.id);
      if (existing) {
        return prev.map(item => item.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        id: prod.id!,
        name: prod.name,
        unit: prod.unit,
        price: prod.price,
        quantity: 1
      }];
    });
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setBillItems(prev => {
      return prev
        .map(item => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
        .filter(item => item.quantity > 0);
    });
  };

  const handleRemoveItem = (id: string) => {
    setBillItems(prev => prev.filter(item => item.id !== id));
  };

  // Calculations
  const subtotal = billItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const finalTotal = Math.max(0, subtotal - (discountAmount || 0));

  // Generate & Complete Bill
  const handleCompleteBill = () => {
    if (billItems.length === 0) {
      toast({ title: 'Bill is empty', description: 'Tap products on the left to add items.', variant: 'destructive' });
      return;
    }

    const billRecord = {
      billNo: `INV-${Date.now().toString().slice(-6)}`,
      items: [...billItems],
      subtotal,
      discount: discountAmount,
      total: finalTotal,
      paymentMethod,
      customerName: customerName.trim() || 'Walk-in Customer (काउंटर ग्राहक)',
      customerPhone: customerPhone.trim(),
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setCompletedBill(billRecord);
    toast({
      title: 'Bill Created!',
      description: `Bill ${billRecord.billNo} generated for ₹${finalTotal}`,
    });
  };

  const handleNewBill = () => {
    setBillItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscountAmount(0);
    setCompletedBill(null);
  };

  const handleShareWhatsApp = () => {
    if (!completedBill) return;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.in').replace(/\/+$/, '');
    
    // White-labeled Store Name & Direct Store Link
    const activeStoreName = store?.nameMarathi || store?.name || 'सुपर बझार';
    const storeSlug = store?.slug || store?.id || '';
    const storeOrderLink = storeSlug ? `${appUrl}/bazar/store/${storeSlug}` : `${appUrl}/bazar`;

    const text = `🏪 *${activeStoreName}*%0A` +
      `🧾 बिल नं: ${completedBill.billNo}%0A` +
      `👤 ग्राहक: ${completedBill.customerName || 'ग्राहक'}%0A` +
      `--------------------------------%0A` +
      completedBill.items.map(i => `• ${i.name} x ${i.quantity} = ₹${i.price * i.quantity}`).join('%0A') +
      `%0A--------------------------------%0A` +
      `💰 *एकूण रक्कम: ₹${completedBill.total}* (${completedBill.paymentMethod.toUpperCase()})%0A%0A` +
      `🛍️ *पुढील वेळी दुकानात न येता घरबसल्या थेट ऑर्डर करण्यासाठी खालील लिंकवर क्लिक करा:*%0A` +
      `👉 ${storeOrderLink}%0A%0A` +
      (store?.phone ? `📞 संपर्क: ${store.phone}%0A%0A` : '') +
      `🙏 *आपल्या खरेदीबद्दल धन्यवाद! पुन्हा भेट द्या.*`;
    
    const waUrl = completedBill.customerPhone 
      ? `https://wa.me/91${completedBill.customerPhone.replace(/\D/g, '')}?text=${text}`
      : `https://wa.me/?text=${text}`;
    
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-black flex items-center gap-2">
            <Receipt className="h-6 w-6 text-[#0D7C4D]" />
            Quick POS Billing (काउंटर बिलिंग)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sell offline to walk-in customers in seconds. No barcode scanner required.
          </p>
        </div>
        {billItems.length > 0 && !completedBill && (
          <Button variant="ghost" size="sm" onClick={handleNewBill} className="text-xs text-destructive">
            Clear Bill
          </Button>
        )}
      </div>

      {/* COMPLETED BILL MODAL / RECEIPT BANNER */}
      {completedBill ? (
        <Card className="rounded-2xl border-emerald-300 bg-white shadow-md max-w-lg mx-auto">
          <CardHeader className="text-center pb-2">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-[#0D7C4D] flex items-center justify-center mx-auto mb-1">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <CardTitle className="text-lg font-black">Bill Generated Successfully!</CardTitle>
            <CardDescription className="text-xs font-mono">
              {completedBill.billNo} • {completedBill.date} • {completedBill.paymentMethod.toUpperCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y divide-border text-xs border rounded-xl p-3 bg-muted/20">
              {completedBill.items.map((item, idx) => (
                <div key={idx} className="py-1.5 flex justify-between">
                  <span>{item.name} <span className="text-muted-foreground">x{item.quantity}</span></span>
                  <span className="font-bold">₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="pt-2 flex justify-between font-black text-sm text-[#0D7C4D]">
                <span>Total Amount Paid:</span>
                <span>₹{completedBill.total}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={handleShareWhatsApp} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 rounded-xl"
              >
                <Share2 className="h-4 w-4 mr-1.5" />
                Share on WhatsApp
              </Button>
              <Button 
                onClick={handleNewBill} 
                className="bg-[#0D7C4D] hover:bg-[#0A633D] text-white font-bold text-xs h-11 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New Bill (पुढील बिल)
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: 1-TAP PRODUCT CATALOG & FREQUENTS (7 Columns) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type item name in English or Marathi (उदा. साखर, तेल, तांदूळ)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11 rounded-xl bg-white text-sm"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {FREQUENT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeCategory === cat 
                      ? 'bg-[#0D7C4D] text-white' 
                      : 'bg-white border border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* 1-Tap Item Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredProducts.map(prod => {
                const img = resolveProductImage(prod.name, prod.category, prod.images?.[0], prod.nameMarathi);
                const inCurrentBill = billItems.find(i => i.id === prod.id);

                return (
                  <button
                    key={prod.id}
                    onClick={() => handleAddItem(prod)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      inCurrentBill 
                        ? 'bg-emerald-50/80 border-[#0D7C4D] shadow-xs' 
                        : 'bg-white border-border hover:border-[#0D7C4D]/60'
                    }`}
                  >
                    {inCurrentBill && (
                      <span className="absolute top-1.5 right-1.5 bg-[#0D7C4D] text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center">
                        {inCurrentBill.quantity}
                      </span>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-muted/40">
                        <Image src={img} alt={prod.name} fill sizes="40px" className="object-cover" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-xs text-foreground truncate">{prod.name}</p>
                        <p className="text-[10px] text-muted-foreground">{prod.unit}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      <span className="text-xs font-extrabold text-[#0D7C4D]">₹{prod.price}</span>
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        + Add
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: LIVE BILL SUMMARY & CHECKOUT (5 Columns) */}
          <div className="lg:col-span-5">
            <Card className="rounded-2xl border-border bg-white shadow-xs sticky top-20">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-[#0D7C4D]" />
                    Current Bill ({billItems.reduce((a, b) => a + b.quantity, 0)} items)
                  </CardTitle>
                  <span className="text-xs font-black text-[#0D7C4D]">
                    ₹{finalTotal}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5">
                {/* Optional Customer info */}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Customer Name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                  <Input
                    placeholder="Mobile / WhatsApp"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>

                {/* Items List */}
                <div className="max-h-56 overflow-y-auto divide-y divide-border/60">
                  {billItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground space-y-1">
                      <ShoppingBag className="h-7 w-7 mx-auto text-muted-foreground/30" />
                      <p className="text-xs font-medium">Cart is empty</p>
                      <p className="text-[10px]">Tap any item on the left to add to bill</p>
                    </div>
                  ) : (
                    billItems.map(item => (
                      <div key={item.id} className="py-2 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground">₹{item.price} each</p>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg">
                          <button
                            onClick={() => handleUpdateQty(item.id, -1)}
                            className="h-6 w-6 rounded flex items-center justify-center hover:bg-white text-muted-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold px-1.5 min-w-[20px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQty(item.id, 1)}
                            className="h-6 w-6 rounded flex items-center justify-center hover:bg-white text-muted-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-xs font-bold text-foreground w-14 text-right">
                          ₹{item.price * item.quantity}
                        </span>

                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Payment Method Selector (Cash vs UPI) */}
                <div className="pt-2 border-t">
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">
                    Payment Mode (पेमेंट पद्धत)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`h-10 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs border transition-all ${
                        paymentMethod === 'cash'
                          ? 'bg-emerald-50 border-[#0D7C4D] text-[#0D7C4D] shadow-xs'
                          : 'bg-muted/30 border-border text-muted-foreground'
                      }`}
                    >
                      <Banknote className="h-4 w-4" />
                      Cash (रोख)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`h-10 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs border transition-all ${
                        paymentMethod === 'upi'
                          ? 'bg-emerald-50 border-[#0D7C4D] text-[#0D7C4D] shadow-xs'
                          : 'bg-muted/30 border-border text-muted-foreground'
                      }`}
                    >
                      <QrCode className="h-4 w-4" />
                      UPI / QR Code
                    </button>
                  </div>
                </div>

                {/* Bill Totals */}
                <div className="pt-2 border-t space-y-1 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Discount (₹):</span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="h-6 w-16 text-right text-xs px-1"
                    />
                  </div>
                  <div className="flex justify-between font-black text-base text-foreground pt-1 border-t">
                    <span>Total Due:</span>
                    <span className="text-[#0D7C4D]">₹{finalTotal}</span>
                  </div>
                </div>

                {/* Large Action CTA */}
                <Button
                  onClick={handleCompleteBill}
                  disabled={billItems.length === 0}
                  className="w-full h-12 rounded-xl bg-[#0D7C4D] hover:bg-[#0A633D] text-white font-extrabold text-sm shadow-sm"
                >
                  Create & Print Bill · ₹{finalTotal}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

