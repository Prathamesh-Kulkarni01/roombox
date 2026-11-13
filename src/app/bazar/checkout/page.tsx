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
  Loader2
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
    clearCart 
  } = useGroceryCart();

  // Fulfilment Mode: 'delivery' (Home Delivery) OR 'pickup' (Order & Pick from Bazar)
  const [fulfilmentMode, setFulfilmentMode] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedPayment, setSelectedPayment] = useState<'cod' | 'upi' | 'card'>('cod');
  const [deliveryInstruction, setDeliveryInstruction] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Address State
  const [customerName, setCustomerName] = useState('Prathamesh Kulkarni');
  const [customerPhone, setCustomerPhone] = useState('9876543210');
  const [addressLine, setAddressLine] = useState('फ्लॅट नं. ४, समर्थ कृपा अपार्टमेंट, शिवाजी चौक');
  const [town, setTown] = useState('Palus');
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const [language, setLanguage] = useState<'mr' | 'en'>('mr');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('bazar_lang') as 'mr' | 'en' | null;
      if (savedLang) setLanguage(savedLang);

      const savedTown = localStorage.getItem('bazar_selected_town');
      if (savedTown) setTown(savedTown);
    }
  }, []);

  const displayTotal = totalItems === 0 ? 248 : finalTotal;
  const displayItemsCount = totalItems === 0 ? 3 : totalItems;

  const currentStore = BAZAR_TOWN_STORES.find(s => s.id === cartStoreId || s.slug === cartStoreId) || BAZAR_TOWN_STORES[0];

  const handlePlaceOrder = async () => {
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
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryType: fulfilmentMode === 'pickup' ? 'store_pickup' : 'home_delivery',
      deliveryAddress: fulfilmentMode === 'delivery' ? `${addressLine}, ${town}, सांगली` : undefined,
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
    <div className="w-full min-h-screen bg-[#F6F8F7] text-slate-900 flex justify-center pb-24 selection:bg-emerald-500/20">
      {/* Mobile-First Frame */}
      <div className="w-full max-w-[430px] bg-white min-h-screen shadow-md flex flex-col relative border-x border-slate-200">
        
        {/* ─────────────────────────────────────────────────────────────
            1. TOP APP HEADER
        ───────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 pt-3 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all text-slate-800"
            >
              <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
            </button>
            <h1 className="font-extrabold text-base text-slate-900">
              {language === 'mr' ? 'ऑर्डर चेकआऊट' : 'Order Checkout'}
            </h1>
          </div>

          <span className="text-xs font-bold text-slate-500">
            {displayItemsCount} {language === 'mr' ? 'वस्तू' : 'items'}
          </span>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            2. FREE DELIVERY THRESHOLD BANNER
        ───────────────────────────────────────────────────────────── */}
        {subtotal > 0 && subtotal < 299 && fulfilmentMode === 'delivery' && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-800">
            <div className="flex items-center gap-2">
              <Bike className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {language === 'mr' 
                  ? `आणखी ₹${299 - subtotal} ची खरेदी करा = मोफत डिलिव्हरी` 
                  : `Add ₹${299 - subtotal} more for FREE delivery`}
              </span>
            </div>
            <Link href={`/bazar/store/${currentStore.slug}`} className="text-emerald-700 underline text-[11px]">
              {language === 'mr' ? '+ जोडा' : '+ Add'}
            </Link>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            3. MAIN BODY
        ───────────────────────────────────────────────────────────── */}
        <main className="p-4 space-y-4 flex-1">
          
          {/* Fulfilment Mode Toggle */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                {language === 'mr' ? 'डिलिव्हरी पद्धत निवडा' : 'Choose Fulfilment'}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
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
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    fulfilmentMode === 'delivery' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Bike className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700">
                    घरपोच
                  </span>
                </div>
                <div className="mt-2">
                  <p className="font-extrabold text-xs text-slate-900 leading-tight">
                    {language === 'mr' ? 'घरपोच डिलिव्हरी' : 'Home Delivery'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
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
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    fulfilmentMode === 'pickup' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Store className="h-4 w-4" />
                  </div>
                  <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded">
                    FAST
                  </span>
                </div>
                <div className="mt-2">
                  <p className="font-extrabold text-xs text-slate-900 leading-tight">
                    {language === 'mr' ? 'दुकानातून पिकअप' : 'Store Pickup'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    पॅक करून ठेवा, थेट घ्या
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Address / Pickup Point */}
          {fulfilmentMode === 'delivery' ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  {language === 'mr' ? 'डिलिव्हरी पत्ता (Address)' : 'Delivery Address'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddressSheetOpen(true)}
                  className="text-xs font-bold text-emerald-700 flex items-center gap-1 hover:underline"
                >
                  <Edit2 className="h-3 w-3" />
                  {language === 'mr' ? 'बदला (Edit)' : 'Edit'}
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="font-bold text-xs text-slate-900">{customerName} · {customerPhone}</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {addressLine}, {town}, सांगली
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
                  {language === 'mr' ? 'पिकअप दुकान (Store Pickup)' : 'Pickup Location'}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  10 Mins Ready
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="font-bold text-xs text-slate-900">{currentStore.nameMarathi}</p>
                <p className="text-xs text-slate-600 mt-0.5">{currentStore.address}</p>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
            <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              {language === 'mr' ? 'पेमेंट पद्धत (Payment Method)' : 'Payment Method'}
            </span>

            {/* COD */}
            <div
              onClick={() => setSelectedPayment('cod')}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                selectedPayment === 'cod'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedPayment === 'cod' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900">
                    {language === 'mr' ? 'कॅश ऑन डिलिव्हरी (Cash on Delivery)' : 'Cash on Delivery (COD)'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {language === 'mr' ? 'सामान मिळाल्यावर रोख पैसे द्या' : 'Pay in cash upon delivery'}
                  </p>
                </div>
              </div>
              <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedPayment === 'cod' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
              }`}>
                {selectedPayment === 'cod' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>

            {/* UPI QR */}
            <div
              onClick={() => setSelectedPayment('upi')}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                selectedPayment === 'upi'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedPayment === 'upi' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900">
                    UPI / QR Code (GPay, PhonePe, Paytm)
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {language === 'mr' ? 'डिलिव्हरी बॉयचा QR स्कॅन करून द्या' : 'Scan delivery agent QR or Pay via App'}
                  </p>
                </div>
              </div>
              <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedPayment === 'upi' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
              }`}>
                {selectedPayment === 'upi' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-2">
            <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              {language === 'mr' ? 'बिलाचा तपशील (Bill Details)' : 'Bill Details'}
            </span>

            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{language === 'mr' ? 'वस्तूंची किंमत' : 'Item Total'}</span>
                <span className="font-bold text-slate-900">₹{subtotal > 0 ? subtotal : 248}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{language === 'mr' ? 'डिलिव्हरी शुल्क' : 'Delivery Charge'}</span>
                <span>
                  {fulfilmentMode === 'pickup' || deliveryFee === 0 ? (
                    <strong className="text-emerald-600 uppercase font-black">मोफत (FREE)</strong>
                  ) : (
                    `₹${deliveryFee}`
                  )}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between font-extrabold text-sm text-slate-900">
                <span>{language === 'mr' ? 'एकूण देय रक्कम' : 'Grand Total'}</span>
                <span className="text-emerald-700 text-base">₹{displayTotal}</span>
              </div>
            </div>
          </div>

          {/* Place Order CTA */}
          <Button
            onClick={handlePlaceOrder}
            disabled={isPlacingOrder}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-2xl text-base shadow-md transition-all active:scale-[0.99]"
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
          <SheetContent side="bottom" className="rounded-t-[28px] max-h-[85vh] p-5 bg-white max-w-[430px] mx-auto border-t border-slate-200">
            <SheetHeader className="text-left pb-3 border-b border-slate-100">
              <SheetTitle className="text-base font-bold text-slate-900">
                {language === 'mr' ? 'डिलिव्हरी पत्ता बदला' : 'Edit Delivery Details'}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                {language === 'mr' ? 'आपले नाव, फोन नंबर आणि पत्ता अचूक भरा.' : 'Provide your contact and delivery address'}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 pt-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-slate-700">नाव (Full Name)</Label>
                <Input 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  className="h-10 rounded-xl text-xs" 
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-slate-700">मोबाईल नंबर (Phone)</Label>
                <Input 
                  value={customerPhone} 
                  onChange={(e) => setCustomerPhone(e.target.value)} 
                  className="h-10 rounded-xl text-xs" 
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-slate-700">घर / फ्लॅट व परिसर (Address)</Label>
                <Input 
                  value={addressLine} 
                  onChange={(e) => setAddressLine(e.target.value)} 
                  className="h-10 rounded-xl text-xs" 
                />
              </div>

              <Button
                onClick={() => setIsAddressSheetOpen(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 rounded-xl text-sm mt-2"
              >
                {language === 'mr' ? 'पत्ता सेव्ह करा' : 'Save Address'}
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
