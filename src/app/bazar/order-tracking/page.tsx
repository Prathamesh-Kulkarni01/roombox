'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  HelpCircle, 
  Check, 
  Phone, 
  MessageSquare, 
  Store, 
  Bike, 
  ChevronRight, 
} from 'lucide-react';
import type { BazarOrder } from '@/modules/bazar/schemas';
import { BAZAR_TOWN_STORES } from '@/modules/bazar/data/storeDirectory';

function OrderTrackingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id') || 'BZ12456';

  const [order, setOrder] = useState<Partial<BazarOrder> | null>(null);
  const [fulfilmentMode, setFulfilmentMode] = useState<'pickup' | 'delivery'>('pickup');
  const [currentStatus, setCurrentStatus] = useState<string>('placed');

  useEffect(() => {
    let isMounted = true;
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/bazar/orders?id=${orderId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success && data.order) {
          if (isMounted) {
            setOrder(data.order);
            if (data.order.deliveryType === 'home_delivery') {
              setFulfilmentMode('delivery');
            } else {
              setFulfilmentMode('pickup');
            }
            if (data.order.orderStatus) {
              setCurrentStatus(data.order.orderStatus);
            }
          }
        }
      } catch (err) {
        // Fallback gracefully
      }
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderId]);

  // Tracking Steps dynamic based on currentStatus
  const isPackingOrAbove = currentStatus === 'packing' || currentStatus === 'ready' || currentStatus === 'delivered';
  const isReadyOrAbove = currentStatus === 'ready' || currentStatus === 'delivered';
  const isDelivered = currentStatus === 'delivered';

  const steps = [
    { title: 'Order Placed', time: 'Received', completed: true },
    { title: 'Packing Bag', time: isPackingOrAbove ? 'In Progress' : 'Pending', completed: isPackingOrAbove, active: currentStatus === 'packing' },
    { title: fulfilmentMode === 'pickup' ? 'Ready at Counter' : 'Out for Delivery', time: isReadyOrAbove ? 'Ready' : 'Pending', completed: isReadyOrAbove, active: currentStatus === 'ready' },
    { title: 'Completed', time: isDelivered ? 'Done' : 'Pending', completed: isDelivered, active: isDelivered },
  ];

  const storeName = order?.storeName || 'Fresh Mart Supermarket';
  const matchedStore = BAZAR_TOWN_STORES.find(s => s.id === order?.storeId || s.name === storeName) || BAZAR_TOWN_STORES[0];
  const storePhone = matchedStore?.phone || '918067528791';
  const displayTotal = order?.totalAmount || 214;
  const items = order?.items && order.items.length > 0 ? order.items : [
    { productName: 'Amul Taaza Toned Milk (500 ml)', quantity: 1, price: 28 },
    { productName: 'Fresh Farm White Eggs (6 pcs)', quantity: 1, price: 48 },
    { productName: 'Fortune Sunlite Sunflower Oil (1 L)', quantity: 1, price: 138 },
  ];

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex justify-center pb-12 selection:bg-primary/20">
      <div className="w-full max-w-[430px] bg-card min-h-screen shadow-md flex flex-col relative border-x border-border">
        
        {/* TOP APP BAR */}
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 pt-3 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/bazar')}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all text-foreground"
              aria-label="Back to Bazar"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
            </button>
            <div>
              <h1 className="font-black text-sm text-foreground">
                Order #{order?.orderNumber || orderId}
              </h1>
              <p className="text-[10px] text-muted-foreground/80">
                {storeName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary capitalize">
              {currentStatus === 'placed' ? 'Order Placed' : currentStatus === 'packing' ? 'Packing Bag' : currentStatus === 'ready' ? 'Ready' : currentStatus}
            </span>
          </div>
        </header>

        {/* 4-STEP TIMELINE TRACKER */}
        <div className="p-4 border-b border-border/60 bg-card/50">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-4 right-4 top-3.5 h-[2px] bg-[#E5E9E6] -z-0" />
            
            {steps.map((s, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1 relative z-10 text-center">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s.completed
                    ? 'bg-primary text-white shadow-2xs'
                    : s.active
                    ? 'bg-primary text-white ring-4 ring-primary/20 animate-pulse'
                    : 'bg-card text-muted-foreground/80 border-2 border-border'
                }`}>
                  {s.completed ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : idx + 1}
                </div>
                <span className={`text-[9px] font-bold max-w-[70px] leading-tight ${
                  s.active || s.completed ? 'text-primary' : 'text-muted-foreground/80'
                }`}>
                  {s.title}
                </span>
                <span className="text-[8px] text-muted-foreground/80">{s.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* STATUS CARD */}
        <main className="flex-1 p-4 space-y-4">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
              {fulfilmentMode === 'pickup' ? <Store className="h-5 w-5" /> : <Bike className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-primary">
                {currentStatus === 'ready' 
                  ? 'Your Order is Packed & Ready!' 
                  : currentStatus === 'packing' 
                  ? 'Store is Packing Your Items' 
                  : 'Order Confirmed by Store'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {fulfilmentMode === 'pickup' 
                  ? 'Pick up directly from shop counter with Order ID'
                  : 'Delivery arriving at your location shortly'}
              </p>
            </div>
          </div>

          {/* STORE & CONTACT CARD */}
          <div className="bg-card rounded-2xl border border-border p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center shrink-0">
                {storeName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-xs text-foreground">
                    {storeName}
                  </h4>
                  <span className="bg-primary/10 text-primary text-[9px] font-bold px-1.5 rounded">
                    ★ 4.9
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  Palus / Sangli · Direct Kirana
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <a
                href={`tel:+${storePhone}`}
                className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all active:scale-95"
                aria-label="Call"
              >
                <Phone className="h-4 w-4" />
              </a>
              <a
                href={`https://wa.me/${storePhone}?text=${encodeURIComponent(`Hi ${storeName}, regarding my Order #${order?.orderNumber || orderId}`)}`}
                target="_blank"
                rel="noreferrer"
                className="h-9 w-9 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all active:scale-95"
                aria-label="WhatsApp"
              >
                <MessageSquare className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* ORDER ITEMS SUMMARY */}
          <div className="bg-card/50 rounded-2xl border border-border p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-foreground">
              <span>Order Details ({items.length} items)</span>
              <span className="text-primary">
                {order?.paymentMethod === 'upi' ? 'Paid via UPI' : 'Pay via Cash (COD)'}
              </span>
            </div>
            <div className="divide-y divide-[#E5E9E6]/60 pt-1">
              {items.map((it: any, idx: number) => (
                <div key={idx} className="py-1.5 flex justify-between text-muted-foreground">
                  <span>{it.productName || it.name} × {it.quantity || it.qty || 1}</span>
                  <span className="font-medium text-foreground">₹{(it.price || it.unitPrice || 0) * (it.quantity || it.qty || 1)}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-border flex justify-between font-black text-sm text-foreground">
              <span>Total Bill</span>
              <span>₹{displayTotal}</span>
            </div>
          </div>
        </main>

        {/* BOTTOM CTA */}
        <div className="p-4 border-t border-border bg-card">
          <Link href="/bazar">
            <button className="w-full h-11 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all">
              <span>Back to Bazar Shopping</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-muted-foreground">Loading order status...</div>}>
      <OrderTrackingContent />
    </Suspense>
  );
}
