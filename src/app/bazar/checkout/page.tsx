'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Check, 
  Banknote, 
  QrCode, 
  CreditCard, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles, 
  Bike, 
  Store, 
  ShoppingBag, 
  PackageCheck,
  Edit2,
  AlertCircle,
  Loader2,
  Plus,
  Minus,
  Trash2
} from 'lucide-react';
import { useGroceryCart } from '@/modules/bazar/context/GroceryCartContext';
import { BAZAR_TOWN_STORES } from '@/modules/bazar/data/storeDirectory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

function CheckoutContent() {
  const router = useRouter();
  const { 
    items, 
    cartStoreId, 
    cartStoreName, 
    totalItems, 
    subtotal, 
    deliveryFee, 
    finalTotal, 
    totalSavings, 
    updateQuantity,
    removeFromCart,
    clearCart 
  } = useGroceryCart();

  // Fulfilment Mode: 'delivery' (Home Delivery) OR 'pickup' (Order & Pick from Bazar)
  const [fulfilmentMode, setFulfilmentMode] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedPayment, setSelectedPayment] = useState<'cod' | 'upi' | 'card'>('cod');
  const [deliveryInstruction, setDeliveryInstruction] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Customer & Address State (Empty by default for customer input)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [town, setTown] = useState('Palus');
  const [phoneError, setPhoneError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const [language, setLanguage] = useState<'mr' | 'en'>('mr');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('bazar_lang') as 'mr' | 'en' | null;
      if (savedLang) setLanguage(savedLang);

      const savedTown = localStorage.getItem('bazar_selected_town');
      if (savedTown) setTown(savedTown);

      // Load user saved details from localStorage or currentUser
      const savedName = localStorage.getItem('bazar_customer_name');
      if (savedName) setCustomerName(savedName);

      const savedPhone = localStorage.getItem('bazar_customer_phone');
      if (savedPhone) setCustomerPhone(savedPhone);

      const savedAddress = localStorage.getItem('bazar_customer_address');
      if (savedAddress) setAddressLine(savedAddress);
    }
  }, []);

  const displayTotal = totalItems === 0 ? 248 : finalTotal;
  const displayItemsCount = totalItems === 0 ? 3 : totalItems;

  const currentStore = BAZAR_TOWN_STORES.find(s => s.id === cartStoreId || s.slug === cartStoreId) || BAZAR_TOWN_STORES[0];

  const handlePlaceOrder = async () => {
    // 🛡️ STRICT VALIDATION: Phone number is mandatory for WhatsApp notification & delivery
    const cleanPhoneDigits = customerPhone.replace(/\D/g, '');
    if (cleanPhoneDigits.length !== 10) {
      setPhoneError(language === 'mr' ? 'कृपया अचूक १० अंकी मोबाईल नंबर टाका' : 'Please enter a valid 10-digit mobile number');
      setIsAddressSheetOpen(true);
      return;
    }

    if (fulfilmentMode === 'delivery' && !addressLine.trim()) {
      setAddressError(language === 'mr' ? 'कृपया डिलिव्हरी पत्ता टाका' : 'Please provide your delivery address');
      setIsAddressSheetOpen(true);
      return;
    }

    // Save to localStorage for future orders
    if (typeof window !== 'undefined') {
      if (customerName) localStorage.setItem('bazar_customer_name', customerName);
      localStorage.setItem('bazar_customer_phone', cleanPhoneDigits);
      if (addressLine) localStorage.setItem('bazar_customer_address', addressLine);
    }

    setIsPlacingOrder(true);
    const orderItems = items.length > 0 
      ? items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit
        }))
      : [
          { productId: 'p1', productName: 'Chakki Fresh Atta', quantity: 1, price: 235 },
          { productId: 'p2', productName: 'Amul Milk 500ml', quantity: 2, price: 28 },
        ];

    const orderPayload = {
      storeId: currentStore.id,
      storeName: currentStore.name,
      customerName: (customerName || (language === 'mr' ? 'ग्राहक' : 'Customer')).trim(),
      customerPhone: cleanPhoneDigits,
      deliveryType: fulfilmentMode === 'pickup' ? 'store_pickup' : 'home_delivery',
      deliveryAddress: fulfilmentMode === 'delivery' ? `${addressLine}, ${town}` : undefined,
      paymentMethod: selectedPayment,
      totalAmount: displayTotal,
      items: orderItems,
      notes: deliveryInstruction || undefined,
      schemaVersion: 1
    };

    let targetOrderId = 'ord_1';
    try {
      const response = await fetch('/api/bazar/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.orderId) {
          targetOrderId = data.orderId;
        }
      }
    } catch (e) {
      console.warn('Order sync fallback:', e);
    }

    clearCart();
    router.push(`/bazar/order-tracking?id=${targetOrderId}`);
  };

  return (
    <div className="w-full min-h-screen bg-[#F6F8F7] text-foreground flex justify-center pb-24 selection:bg-primary/100/20">
      {/* Mobile-First Frame */}
      <div className="w-full max-w-[430px] bg-card min-h-screen shadow-md flex flex-col relative border-x border-border">
        
        {/* ─────────────────────────────────────────────────────────────
            1. TOP APP HEADER
        ───────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/60 px-4 pt-3 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="h-8 w-8 rounded-full bg-muted hover:bg-slate-200 flex items-center justify-center transition-all text-slate-800"
            >
              <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
            </button>
            <h1 className="font-extrabold text-base text-foreground">
              {language === 'mr' ? 'ऑर्डर चेकआऊट' : 'Order Checkout'}
            </h1>
          </div>

          <span className="text-xs font-bold text-muted-foreground">
            {displayItemsCount} {language === 'mr' ? 'वस्तू' : 'items'}
          </span>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            2. FREE DELIVERY THRESHOLD BANNER
        ───────────────────────────────────────────────────────────── */}
        {subtotal > 0 && subtotal < 299 && fulfilmentMode === 'delivery' && (
          <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between text-xs font-bold text-primary">
            <div className="flex items-center gap-2">
              <Bike className="h-4 w-4 text-primary shrink-0" />
              <span>
                {language === 'mr' 
                  ? `आणखी ₹${299 - subtotal} ची खरेदी करा = मोफत डिलिव्हरी` 
                  : `Add ₹${299 - subtotal} more for FREE delivery`}
              </span>
            </div>
            <Link href={`/bazar/store/${currentStore.slug}`} className="text-primary underline text-[11px]">
              {language === 'mr' ? '+ जोडा' : '+ Add'}
            </Link>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            3. MAIN BODY
        ───────────────────────────────────────────────────────────── */}
        <main className="p-4 space-y-4 flex-1">
          
          {/* Fulfilment Mode Toggle */}
          <div className="bg-card rounded-2xl border border-border p-3 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                {language === 'mr' ? 'डिलिव्हरी पद्धत निवडा' : 'Choose Fulfilment'}
              </span>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30">
                15–25 Mins
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Home Delivery */}
              <button
                type="button"
                onClick={() => setFulfilmentMode('delivery')}
                className={`p-3 rounded-xl border-2 text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
                  fulfilmentMode === 'delivery'
                    ? 'border-primary bg-primary/10 shadow-xs'
                    : 'border-border bg-card hover:bg-background'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    fulfilmentMode === 'delivery' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Bike className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-primary">
                    घरपोच
                  </span>
                </div>
                <div className="mt-2">
                  <p className="font-extrabold text-xs text-foreground leading-tight">
                    {language === 'mr' ? 'घरपोच डिलिव्हरी' : 'Home Delivery'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    15–25 mins थेट दारात
                  </p>
                </div>
              </button>

              {/* Order & Pick */}
              <button
                type="button"
                onClick={() => setFulfilmentMode('pickup')}
                className={`p-3 rounded-xl border-2 text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
                  fulfilmentMode === 'pickup'
                    ? 'border-primary bg-primary/10 shadow-xs'
                    : 'border-border bg-card hover:bg-background'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    fulfilmentMode === 'pickup' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Store className="h-4 w-4" />
                  </div>
                  <span className="bg-primary text-white text-[8px] font-black px-1.5 py-0.2 rounded">
                    FAST
                  </span>
                </div>
                <div className="mt-2">
                  <p className="font-extrabold text-xs text-foreground leading-tight">
                    {language === 'mr' ? 'दुकानातून पिकअप' : 'Store Pickup'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    पॅक करून ठेवा, थेट घ्या
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Address / Pickup Point */}
          {fulfilmentMode === 'delivery' ? (
            <div className="bg-card rounded-2xl border border-border p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {language === 'mr' ? 'डिलिव्हरी पत्ता (Address)' : 'Delivery Address'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddressSheetOpen(true)}
                  className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                >
                  <Edit2 className="h-3 w-3" />
                  {language === 'mr' ? 'बदला (Edit)' : 'Edit'}
                </button>
              </div>

              <div className="bg-background rounded-xl p-3 border border-border/60">
                {customerPhone ? (
                  <>
                    <p className="font-bold text-xs text-foreground">
                      {customerName || (language === 'mr' ? 'ग्राहक' : 'Customer')} · +91 {customerPhone}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {addressLine || (language === 'mr' ? 'पत्ता जोडलेला नाही' : 'No address provided')}, {town}
                    </p>
                  </>
                ) : (
                  <div 
                    onClick={() => setIsAddressSheetOpen(true)}
                    className="cursor-pointer py-1 text-center"
                  >
                    <p className="text-xs font-bold text-primary flex items-center justify-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{language === 'mr' ? '+ मोबाईल नंबर आणि पत्ता जोडा (आवश्यक)' : '+ Add Phone & Address (Required)'}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <PackageCheck className="h-3.5 w-3.5 text-primary" />
                  {language === 'mr' ? 'पिकअप दुकान (Store Pickup)' : 'Pickup Location'}
                </span>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  10 Mins Ready
                </span>
              </div>

              <div className="bg-background rounded-xl p-3 border border-border/60">
                <p className="font-bold text-xs text-foreground">{currentStore.nameMarathi}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{currentStore.address}</p>
              </div>
            </div>
          )}

          {/* Order Items Basket Card */}
          <div className="bg-card rounded-2xl border border-border p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                {language === 'mr' ? `टोपलीतील वस्तू (${totalItems})` : `Basket Items (${totalItems})`}
              </span>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-[11px] font-semibold text-rose-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{language === 'mr' ? 'सर्व काढा' : 'Clear All'}</span>
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-bold text-muted-foreground">
                  {language === 'mr' ? 'तुमची टोपली रिकामी आहे' : 'Your cart is empty'}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/bazar/store/${currentStore.slug}`)}
                  className="rounded-xl text-xs"
                >
                  {language === 'mr' ? 'वस्तू खरेदी करा' : 'Explore Store'}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {items.map((item) => (
                  <div key={item.product.id + (item.selectedVariantId || '')} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                      <p className="font-bold text-xs text-foreground truncate">{item.product.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.unit} • ₹{item.price}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-black text-xs text-foreground min-w-[45px] text-right">
                        ₹{item.price * item.quantity}
                      </span>
                      {/* Quantity Stepper (Increase/Decrease/Remove) */}
                      <div className="h-7 flex items-center bg-muted rounded-lg border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariantId)}
                          className="h-7 w-6 flex items-center justify-center text-primary hover:bg-background active:scale-95 transition-all"
                          aria-label="Decrease quantity"
                        >
                          {item.quantity === 1 ? (
                            <Trash2 className="h-3 w-3 text-rose-500" />
                          ) : (
                            <Minus className="h-3 w-3 stroke-[2.5]" />
                          )}
                        </button>
                        <span className="font-black text-xs px-1.5 min-w-[20px] text-center select-none">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedVariantId)}
                          className="h-7 w-6 flex items-center justify-center text-primary hover:bg-background active:scale-95 transition-all"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="bg-card rounded-2xl border border-border p-3.5 shadow-2xs space-y-3">
            <span className="font-extrabold text-xs text-foreground uppercase tracking-wider">
              {language === 'mr' ? 'पेमेंट पद्धत (Payment Method)' : 'Payment Method'}
            </span>

            {/* COD */}
            <div
              onClick={() => setSelectedPayment('cod')}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                selectedPayment === 'cod'
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border bg-card hover:bg-background'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedPayment === 'cod' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-foreground">
                    {language === 'mr' ? 'कॅश ऑन डिलिव्हरी (Cash on Delivery)' : 'Cash on Delivery (COD)'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'mr' ? 'सामान मिळाल्यावर रोख पैसे द्या' : 'Pay in cash upon delivery'}
                  </p>
                </div>
              </div>
              <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedPayment === 'cod' ? 'border-primary bg-primary' : 'border-slate-300'
              }`}>
                {selectedPayment === 'cod' && <div className="h-1.5 w-1.5 rounded-full bg-card" />}
              </div>
            </div>

            {/* UPI QR */}
            <div
              onClick={() => setSelectedPayment('upi')}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                selectedPayment === 'upi'
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border bg-card hover:bg-background'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedPayment === 'upi' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-foreground">
                    UPI / QR Code (GPay, PhonePe, Paytm)
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'mr' ? 'डिलिव्हरी बॉयचा QR स्कॅन करून द्या' : 'Scan delivery agent QR or Pay via App'}
                  </p>
                </div>
              </div>
              <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedPayment === 'upi' ? 'border-primary bg-primary' : 'border-slate-300'
              }`}>
                {selectedPayment === 'upi' && <div className="h-1.5 w-1.5 rounded-full bg-card" />}
              </div>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="bg-card rounded-2xl border border-border p-3.5 shadow-2xs space-y-2">
            <span className="font-extrabold text-xs text-foreground uppercase tracking-wider">
              {language === 'mr' ? 'बिलाचा तपशील (Bill Details)' : 'Bill Details'}
            </span>

            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>{language === 'mr' ? 'वस्तूंची किंमत' : 'Item Total'}</span>
                <span className="font-bold text-foreground">₹{subtotal > 0 ? subtotal : 248}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{language === 'mr' ? 'डिलिव्हरी शुल्क' : 'Delivery Charge'}</span>
                <span>
                  {fulfilmentMode === 'pickup' || deliveryFee === 0 ? (
                    <strong className="text-primary uppercase font-black">मोफत (FREE)</strong>
                  ) : (
                    `₹${deliveryFee}`
                  )}
                </span>
              </div>
              <div className="border-t border-border/60 pt-2 flex justify-between font-extrabold text-sm text-foreground">
                <span>{language === 'mr' ? 'एकूण देय रक्कम' : 'Grand Total'}</span>
                <span className="text-primary text-base">₹{displayTotal}</span>
              </div>
            </div>
          </div>

          {/* Place Order CTA */}
          <Button
            onClick={handlePlaceOrder}
            disabled={isPlacingOrder}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 rounded-2xl text-base shadow-md transition-all active:scale-[0.99]"
          >
            {isPlacingOrder ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                {language === 'mr' ? 'ऑर्डर नोंदवत आहे...' : 'Placing Order...'}
              </>
            ) : (
              <>
                {language === 'mr' ? `ऑर्डर पूर्ण करा (₹${displayTotal})` : `Place Order · ₹${displayTotal}`}
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </main>

        {/* Address Edit Sheet */}
        <Sheet open={isAddressSheetOpen} onOpenChange={setIsAddressSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-[28px] max-h-[85vh] p-5 bg-card max-w-[430px] mx-auto border-t border-border">
            <SheetHeader className="text-left pb-3 border-b border-border/60">
              <SheetTitle className="text-base font-bold text-foreground">
                {language === 'mr' ? 'डिलिव्हरी पत्ता बदला' : 'Edit Delivery Details'}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {language === 'mr' ? 'आपले नाव, फोन नंबर आणि पत्ता अचूक भरा.' : 'Provide your contact and delivery address'}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 pt-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-foreground">नाव (Full Name)</Label>
                <Input 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  className="h-10 rounded-xl text-xs" 
                />
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    {language === 'mr' ? 'मोबाईल नंबर (WhatsApp Number) *' : 'Mobile Number (WhatsApp) *'}
                  </Label>
                  <span className="text-[10px] font-bold text-primary">
                    {language === 'mr' ? 'ऑर्डर अपडेटसाठी आवश्यक' : 'For Order Updates'}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">+91</span>
                  <Input 
                    type="tel"
                    maxLength={10}
                    placeholder="98765 43210"
                    value={customerPhone} 
                    onChange={(e) => {
                      setCustomerPhone(e.target.value.replace(/\D/g, ''));
                      setPhoneError('');
                    }} 
                    className="h-10 pl-11 rounded-xl text-xs font-bold" 
                  />
                </div>
                {phoneError && (
                  <p className="text-[11px] font-bold text-rose-500 mt-0.5">{phoneError}</p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-foreground">
                  {language === 'mr' ? 'घर / फ्लॅट व परिसर (Address) *' : 'Delivery Address *'}
                </Label>
                <Input 
                  placeholder={language === 'mr' ? 'उदा. घर क्र. १२, शिवाजी चौक...' : 'e.g. Flat 4, समर्थ कृपा...'}
                  value={addressLine} 
                  onChange={(e) => {
                    setAddressLine(e.target.value);
                    setAddressError('');
                  }} 
                  className="h-10 rounded-xl text-xs" 
                />
                {addressError && (
                  <p className="text-[11px] font-bold text-rose-500 mt-0.5">{addressError}</p>
                )}
              </div>

              <Button
                onClick={() => {
                  const digits = customerPhone.replace(/\D/g, '');
                  if (digits.length !== 10) {
                    setPhoneError(language === 'mr' ? 'कृपया १० अंकी मोबाईल नंबर टाका' : 'Please enter 10 digits');
                    return;
                  }
                  if (fulfilmentMode === 'delivery' && !addressLine.trim()) {
                    setAddressError(language === 'mr' ? 'कृपया पत्ता टाका' : 'Address required');
                    return;
                  }
                  setIsAddressSheetOpen(false);
                }}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 rounded-xl text-sm mt-2"
              >
                {language === 'mr' ? 'माहिती सेव्ह करा' : 'Save Details'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <CheckoutContent />;
}
