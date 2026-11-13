'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  MapPin, 
  Plus, 
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
  PackageCheck
} from 'lucide-react';
import { GroceryCartProvider, useGroceryCart } from '@/modules/bazar/context/GroceryCartContext';

function CheckoutContent() {
  const router = useRouter();
  const { items, cartStoreId, cartStoreName, totalItems, subtotal, deliveryFee, finalTotal, totalSavings, clearCart } = useGroceryCart();

  // Fulfilment Mode: 'delivery' (Home Delivery) OR 'pickup' (Order & Pick from Bazar)
  const [fulfilmentMode, setFulfilmentMode] = useState<'delivery' | 'pickup'>('pickup');
  
  // Payment: COD (or Pay at Store on Pickup) is pre-selected as the default
  const [selectedPayment, setSelectedPayment] = useState<'cod' | 'upi' | 'card'>('cod');
  const [deliveryInstruction, setDeliveryInstruction] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const displayTotal = totalItems === 0 ? 248 : finalTotal;
  const displayItemsCount = totalItems === 0 ? 3 : totalItems;

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
      storeId: cartStoreId || 'fresh-mart',
      storeName: cartStoreName || 'Fresh Mart Supermarket',
      customerName: 'Prathamesh Kulkarni',
      customerPhone: '+91 98765 43210',
      deliveryType: fulfilmentMode === 'pickup' ? 'store_pickup' : 'home_delivery',
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
    window.location.href = `/bazar/order-tracking?id=${targetOrderId}`;
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAF9] text-[#0F1713] flex justify-center pb-24 selection:bg-[#0D7C4D]/20">
      {/* Mobile-First Frame (430px max width on desktop) */}
      <div className="w-full max-w-[430px] bg-[#FFFFFF] min-h-screen shadow-md flex flex-col relative border-x border-[#E5E9E6]">
        
        {/* ─────────────────────────────────────────────────────────────
            1. TOP HEADER (Row 1, Screen 4 matching)
        ───────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E5E9E6] px-4 pt-3 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[#F2F4F3] active:scale-90 transition-all text-[#0F1713]"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
            </button>
            <h1 className="font-black text-base text-[#0F1713]">
              Checkout
            </h1>
          </div>

          <span className="text-xs font-bold text-[#8A948D]">
            {displayItemsCount} {displayItemsCount === 1 ? 'item' : 'items'}
          </span>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            2. STEP PROGRESS INDICATOR (1. Address/Pickup -> 2. Payment -> 3. Review)
        ───────────────────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-b border-[#F2F4F3] bg-[#FAFBFB]">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-6 right-6 top-3.5 h-[2px] bg-[#E5E9E6] -z-0" />
            
            {/* Step 1: Mode & Location (Done) */}
            <div className="flex flex-col items-center gap-1 relative z-10">
              <div className="h-7 w-7 rounded-full bg-[#0D7C4D] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <Check className="h-4 w-4 stroke-[3]" />
              </div>
              <span className="text-[10px] font-bold text-[#0D7C4D]">
                {fulfilmentMode === 'pickup' ? 'Pickup' : 'Address'}
              </span>
            </div>

            {/* Step 2: Payment (Active) */}
            <div className="flex flex-col items-center gap-1 relative z-10">
              <div className="h-7 w-7 rounded-full bg-[#0D7C4D] text-white flex items-center justify-center font-black text-xs shadow-2xs">
                2
              </div>
              <span className="text-[10px] font-black text-[#0D7C4D]">Payment</span>
            </div>

            {/* Step 3: Review */}
            <div className="flex flex-col items-center gap-1 relative z-10">
              <div className="h-7 w-7 rounded-full bg-[#FFFFFF] text-[#8A948D] border-2 border-[#E5E9E6] flex items-center justify-center font-bold text-xs">
                3
              </div>
              <span className="text-[10px] font-bold text-[#8A948D]">Confirm</span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MAIN FORM BODY
        ───────────────────────────────────────────────────────────── */}
        <main className="p-4 space-y-4 flex-1">
          
          {/* ─────────────────────────────────────────────────────────
              FULFILMENT MODE TOGGLE: [Home Delivery] vs [Order & Pick from Bazar]
          ───────────────────────────────────────────────────────── */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E9E6] p-3 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-[#0F1713] uppercase tracking-wider">
                निवडा (Choose Fulfilment Mode)
              </span>
              <span className="text-[10px] font-bold text-[#0D7C4D] bg-[#E8F5EE] px-2 py-0.5 rounded-full">
                Zero Extra Charges
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Option A: ORDER & PICK FROM BAZAR (HIGHLIGHTED) */}
              <button
                type="button"
                onClick={() => setFulfilmentMode('pickup')}
                className={`p-3 rounded-xl border-2 text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
                  fulfilmentMode === 'pickup'
                    ? 'border-[#0D7C4D] bg-[#E8F5EE] shadow-xs'
                    : 'border-[#E5E9E6] bg-[#FFFFFF] hover:bg-[#FAFBFB]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    fulfilmentMode === 'pickup' ? 'bg-[#0D7C4D] text-white' : 'bg-[#F2F4F3] text-[#525C56]'
                  }`}>
                    <Store className="h-4 w-4" />
                  </div>
                  <span className="bg-[#0D7C4D] text-white text-[8px] font-black px-1.5 py-0.2 rounded">
                    FASTEST
                  </span>
                </div>
                <div className="mt-2">
                  <p className="font-extrabold text-xs text-[#0F1713] leading-tight">
                    Order & Pick from Bazar
                  </p>
                  <p className="text-[10px] text-[#525C56] mt-0.5">
                    दुकानदाराकडून पॅक करून ठेवा, थेट घेऊन जा
                  </p>
                </div>
              </button>

              {/* Option B: HOME DELIVERY */}
              <button
                type="button"
                onClick={() => setFulfilmentMode('delivery')}
                className={`p-3 rounded-xl border-2 text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
                  fulfilmentMode === 'delivery'
                    ? 'border-[#0D7C4D] bg-[#E8F5EE] shadow-xs'
                    : 'border-[#E5E9E6] bg-[#FFFFFF] hover:bg-[#FAFBFB]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    fulfilmentMode === 'delivery' ? 'bg-[#0D7C4D] text-white' : 'bg-[#F2F4F3] text-[#525C56]'
                  }`}>
                    <Bike className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-[#0D7C4D]">
                    15–25m
                  </span>
                </div>
                <div className="mt-2">
                  <p className="font-extrabold text-xs text-[#0F1713] leading-tight">
                    Home Delivery
                  </p>
                  <p className="text-[10px] text-[#525C56] mt-0.5">
                    घरपोच डिलिव्हरी
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              DYNAMIC DETAILS: PICKUP POINT vs DELIVERY ADDRESS
          ───────────────────────────────────────────────────────── */}
          {fulfilmentMode === 'pickup' ? (
            /* PICKUP STORE DETAILS */
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E9E6] p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-[#0F1713] uppercase tracking-wider flex items-center gap-1.5">
                  <PackageCheck className="h-3.5 w-3.5 text-[#0D7C4D]" />
                  Pickup Point (दुकानाचा पत्ता)
                </span>
                <span className="text-[10px] font-bold text-[#10B981] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  Ready in 10-15 mins
                </span>
              </div>

              <div className="bg-[#FAFBFB] rounded-xl p-3 border border-[#F2F4F3] space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-[#0F1713]">Fresh Mart Supermarket</span>
                  <span className="bg-[#0D7C4D] text-white text-[9px] font-black px-1.5 py-0.2 rounded">Open</span>
                </div>
                <p className="text-[11px] text-[#525C56]">
                  एसटी स्टँडसमोर, मेन रोड, पलूस (Palus), जि. सांगली
                </p>
                <p className="text-[10px] text-[#8A948D] pt-0.5 font-medium">
                  ऑर्डर पॅक झाल्यावर फोनवर SMS/WhatsApp मेसेज येईल. थेट काऊंटरवरून पार्सल उचला.
                </p>
              </div>
            </div>
          ) : (
            /* DELIVERY ADDRESS CARD */
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E9E6] p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-[#0F1713] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#0D7C4D]" />
                  Delivery Address
                </span>
                <button className="text-xs font-bold text-[#0D7C4D] hover:underline flex items-center gap-0.5">
                  <span>Change</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              <div className="bg-[#FAFBFB] rounded-xl p-3 border border-[#F2F4F3] space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-[#0F1713]">Home – पलूस, सांगली</span>
                  <span className="bg-[#E8F5EE] text-[#0D7C4D] text-[9px] font-black px-1.5 py-0.2 rounded">Default</span>
                </div>
                <p className="font-bold text-xs text-[#525C56]">Prathamesh Kulkarni</p>
                <p className="text-[11px] text-[#8A948D] leading-relaxed">
                  At. Rajapur, Post. Palus, Tal. Tasgaon, Dist. Sangli - 416310
                </p>
                <p className="text-[11px] text-[#525C56] font-semibold pt-0.5">
                  +91 98765 43210
                </p>
              </div>

              <button className="w-full py-2 rounded-xl border border-dashed border-[#CDEBD8] bg-[#F0FDF4] text-[#0D7C4D] font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all">
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Add New Address</span>
              </button>
            </div>
          )}

          {/* 4. PACKING & PICKUP / DELIVERY INSTRUCTIONS */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E9E6] p-3.5 space-y-2 shadow-2xs">
            <span className="font-extrabold text-xs text-[#0F1713] flex items-center justify-between">
              <span>{fulfilmentMode === 'pickup' ? 'पॅकिंग सूचना (Packing Note)' : 'डिलिव्हरी सूचना (Delivery Note)'}</span>
              <span className="text-[10px] font-normal text-[#8A948D]">(Optional)</span>
            </span>
            <input
              type="text"
              placeholder={fulfilmentMode === 'pickup' ? 'उदा. ताजे पॅकेट द्यावे, सुट्टे पैसे आणावे...' : 'उदा. गेटवर ठेवावे, फोन करावा...'}
              value={deliveryInstruction}
              onChange={(e) => setDeliveryInstruction(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#F2F4F3] text-xs text-[#0F1713] placeholder:text-[#8A948D] font-medium border-transparent focus:bg-[#FFFFFF] focus:border-[#0D7C4D] focus:outline-hidden transition-all"
            />
          </div>

          {/* 5. TIMING ESTIMATE */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E9E6] p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#E8F5EE] text-[#0D7C4D] flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="font-extrabold text-xs text-[#0F1713]">
                  {fulfilmentMode === 'pickup' ? '१०-१५ मिनिटांत पॅक तयार' : '१५–२५ मिनिटे घरपोच'}
                </p>
                <p className="text-[11px] text-[#8A948D]">
                  {fulfilmentMode === 'pickup' ? 'दुकानदार ताबडतोब पॅकिंग सुरू करतील' : 'Today, 10:00 AM – 10:30 AM'}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#0D7C4D]">
              {fulfilmentMode === 'pickup' ? 'Ready Soon' : 'Express'}
            </span>
          </div>

          {/* 6. PAYMENT METHOD SELECTOR (COD / PAY ON PICKUP FIRST, ZERO GATEWAY FEES) */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E9E6] p-3.5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-[#0F1713] uppercase tracking-wider">
                Payment Method
              </span>
              <span className="text-[10px] font-bold text-[#0D7C4D] bg-[#E8F5EE] px-2 py-0.5 rounded-full">
                Zero Fees
              </span>
            </div>

            {/* OPTION 1: CASH ON DELIVERY / PAY AT BAZAR COUNTER (PRIMARY) */}
            <div
              onClick={() => setSelectedPayment('cod')}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                selectedPayment === 'cod'
                  ? 'border-[#0D7C4D] bg-[#E8F5EE]/40 shadow-xs'
                  : 'border-[#E5E9E6] bg-[#FFFFFF] hover:bg-[#FAFBFB]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedPayment === 'cod' ? 'bg-[#0D7C4D] text-white' : 'bg-[#F2F4F3] text-[#525C56]'
                }`}>
                  <Banknote className="h-5 w-5" />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-black text-xs text-[#0F1713]">
                      {fulfilmentMode === 'pickup' ? 'Pay at Counter on Pickup (दुकानी रोख द्या)' : 'Cash on Delivery (घरी रोख द्या)'}
                    </p>
                    <span className="bg-[#0D7C4D] text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-[11px] text-[#525C56] mt-0.5">
                    {fulfilmentMode === 'pickup'
                      ? 'माल पाहून घ्या आणि थेट काऊंटरवर रोख पैसे द्या.'
                      : 'माल घरी आल्यावर तपासून रोख पैसे द्या.'}
                  </p>
                  <p className="text-[10px] text-[#0D7C4D] font-bold mt-0.5">
                    ✓ No Gateway Fee · No Online Transaction Risk
                  </p>
                </div>
              </div>

              {/* Radio Circle */}
              <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                selectedPayment === 'cod' ? 'border-[#0D7C4D] bg-[#0D7C4D]' : 'border-[#8A948D]'
              }`}>
                {selectedPayment === 'cod' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>

            {/* OPTION 2: UPI (GPay, PhonePe, Paytm, QR) */}
            <div
              onClick={() => setSelectedPayment('upi')}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                selectedPayment === 'upi'
                  ? 'border-[#0D7C4D] bg-[#E8F5EE]/40 shadow-xs'
                  : 'border-[#E5E9E6] bg-[#FFFFFF] hover:bg-[#FAFBFB]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedPayment === 'upi' ? 'bg-[#0D7C4D] text-white' : 'bg-[#F2F4F3] text-[#525C56]'
                }`}>
                  <QrCode className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-bold text-xs text-[#0F1713]">
                    UPI / Scan QR (GPay, PhonePe, Paytm)
                  </p>
                  <p className="text-[11px] text-[#8A948D] mt-0.5">
                    दुकानात किंवा डिलिव्हरी बॉयला UPI ने पैसे द्या.
                  </p>
                </div>
              </div>

              <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                selectedPayment === 'upi' ? 'border-[#0D7C4D] bg-[#0D7C4D]' : 'border-[#8A948D]'
              }`}>
                {selectedPayment === 'upi' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>

            {/* OPTION 3: Credit / Debit Card */}
            <div
              onClick={() => setSelectedPayment('card')}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                selectedPayment === 'card'
                  ? 'border-[#0D7C4D] bg-[#E8F5EE]/40 shadow-xs'
                  : 'border-[#E5E9E6] bg-[#FFFFFF] hover:bg-[#FAFBFB]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedPayment === 'card' ? 'bg-[#0D7C4D] text-white' : 'bg-[#F2F4F3] text-[#525C56]'
                }`}>
                  <CreditCard className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-bold text-xs text-[#0F1713]">
                    Credit / Debit Card
                  </p>
                  <p className="text-[11px] text-[#8A948D] mt-0.5">
                    Visa, MasterCard, RuPay
                  </p>
                </div>
              </div>

              <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                selectedPayment === 'card' ? 'border-[#0D7C4D] bg-[#0D7C4D]' : 'border-[#8A948D]'
              }`}>
                {selectedPayment === 'card' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>
          </div>

          {/* 7. ORDER SUMMARY BREAKDOWN */}
          <div className="bg-[#FAFBFB] rounded-2xl p-3.5 border border-[#E5E9E6] space-y-2 text-xs">
            <div className="flex justify-between text-[#525C56]">
              <span>Item Total</span>
              <span className="font-medium text-[#0F1713]">₹{displayTotal}</span>
            </div>
            <div className="flex justify-between text-[#525C56]">
              <span>{fulfilmentMode === 'pickup' ? 'Bazar Pickup Fee' : 'Delivery Fee'}</span>
              <span className="text-[#0D7C4D] font-bold">FREE</span>
            </div>
            <div className="flex justify-between text-[#525C56]">
              <span>Payment Gateway / Convenience Fee</span>
              <span className="text-[#0D7C4D] font-bold">₹0 (FREE)</span>
            </div>
            <div className="pt-2 border-t border-[#E5E9E6] flex justify-between font-black text-sm text-[#0F1713]">
              <span>Amount to Pay</span>
              <span>₹{displayTotal}</span>
            </div>
          </div>

        </main>

        {/* ─────────────────────────────────────────────────────────────
            8. STICKY BOTTOM CONFIRM ACTION BUTTON
        ───────────────────────────────────────────────────────────── */}
        <div className="sticky bottom-0 left-0 right-0 bg-[#FFFFFF] border-t border-[#E5E9E6] p-3.5">
          <button
            onClick={handlePlaceOrder}
            disabled={isPlacingOrder}
            className="w-full h-12 bg-[#0D7C4D] hover:bg-[#0A663F] disabled:opacity-75 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#0D7C4D]/25 active:scale-[0.99] transition-all"
          >
            {isPlacingOrder ? (
              <span>Placing Order with Fresh Mart...</span>
            ) : (
              <span>
                {fulfilmentMode === 'pickup'
                  ? `Order & Pick from Bazar · ₹${displayTotal}`
                  : `Place Order · Pay ₹${displayTotal} on Delivery`}
              </span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

export default function BazarCheckoutPage() {
  return <CheckoutContent />;
}
