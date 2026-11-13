'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Bike, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  RotateCw, 
  ShoppingBag, 
  Store,
  AlertCircle,
  Loader2,
  PackageSearch
} from 'lucide-react';
import { NativeAppBottomNav } from '@/modules/bazar/components/NativeAppBottomNav';
import type { BazarOrder } from '@/modules/bazar/schemas';

interface OrderItemSummary {
  name: string;
  qty: number;
  imageUrl?: string;
}

interface DisplayOrder {
  id: string;
  orderNumber: string;
  storeName: string;
  dateText: string;
  status: 'active' | 'delivered' | 'cancelled';
  statusTextMarathi: string;
  statusTextEn: string;
  itemsCount: number;
  totalAmount: number;
  items: OrderItemSummary[];
}

function mapBazarOrderToDisplay(order: BazarOrder): DisplayOrder {
  const isDelivered = order.orderStatus === 'delivered';
  const isCancelled = order.orderStatus === 'cancelled';
  const isActive = !isDelivered && !isCancelled;

  let statusTextEn = 'Placed';
  let statusTextMarathi = 'ऑर्डर दिली';

  if (order.orderStatus === 'confirmed') {
    statusTextEn = 'Confirmed';
    statusTextMarathi = 'स्वीकारली';
  } else if (order.orderStatus === 'preparing') {
    statusTextEn = 'Packing';
    statusTextMarathi = 'पॅक करत आहे';
  } else if (order.orderStatus === 'dispatched') {
    statusTextEn = 'Out for Delivery';
    statusTextMarathi = 'डिलिव्हरीसाठी बाहेर आहे';
  } else if (isDelivered) {
    statusTextEn = 'Delivered';
    statusTextMarathi = 'डिलिव्हरी झाली';
  } else if (isCancelled) {
    statusTextEn = 'Cancelled';
    statusTextMarathi = 'रद्द केली';
  }

  let dateText = 'Recent';
  if (order.createdAt) {
    try {
      const d = new Date(order.createdAt);
      dateText = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      dateText = 'Recently';
    }
  }

  const items: OrderItemSummary[] = (order.items || []).map(it => ({
    name: it.productName || 'Item',
    qty: it.quantity || 1,
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80'
  }));

  return {
    id: order.id,
    orderNumber: order.orderNumber ? `#${order.orderNumber}` : `#${order.id.slice(-6).toUpperCase()}`,
    storeName: order.storeName || 'Local Town Store',
    dateText,
    status: isDelivered ? 'delivered' : isCancelled ? 'cancelled' : 'active',
    statusTextMarathi,
    statusTextEn,
    itemsCount: items.reduce((acc, curr) => acc + curr.qty, 0) || items.length || 1,
    totalAmount: order.totalAmount || 0,
    items
  };
}

export default function MyOrdersPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);

  useEffect(() => {
    const savedPhone = typeof window !== 'undefined' ? localStorage.getItem('bazar_customer_phone') : null;
    setCustomerPhone(savedPhone);

    async function fetchOrders() {
      if (!savedPhone) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/bazar/orders?customerPhone=${encodeURIComponent(savedPhone)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.orders)) {
          const mapped = json.orders.map(mapBazarOrderToDisplay);
          setOrders(mapped);
        }
      } catch (err) {
        console.warn('Failed to fetch customer orders:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return o.status === 'active';
    if (activeTab === 'completed') return o.status === 'delivered';
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex justify-center pb-24">
      {/* Mobile-First Frame (430px max width on desktop) */}
      <div className="w-full max-w-[430px] bg-card min-h-screen shadow-md flex flex-col relative border-x border-border">
        
        {/* ─────────────────────────────────────────────────────────────
            1. TOP HEADER
        ───────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border px-4 pt-3 pb-2.5">
          <div className="flex items-center gap-2">
            <Link
              href="/bazar"
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all text-foreground"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
            </Link>
            <h1 className="font-black text-base text-foreground">
              माझी ऑर्डर्स <span className="text-muted-foreground font-normal text-xs">(My Orders)</span>
            </h1>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            2. TABS ROW: सर्व (All), चालू (Active), पूर्ण झाले (Completed)
        ───────────────────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border/60 bg-muted/30">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card text-muted-foreground border border-border hover:bg-muted'
            }`}
          >
            सर्व (All) {orders.length > 0 && `(${orders.length})`}
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
              activeTab === 'active'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card text-muted-foreground border border-border hover:bg-muted'
            }`}
          >
            चालू (Active)
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
              activeTab === 'completed'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card text-muted-foreground border border-border hover:bg-muted'
            }`}
          >
            पूर्ण झाले (Completed)
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. ORDERS LIST
        ───────────────────────────────────────────────────────────── */}
        <main className="px-4 pt-3.5 space-y-3.5 flex-1">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-medium text-muted-foreground">ऑर्डर्स लोड होत आहेत... (Loading orders)</p>
            </div>
          ) : !customerPhone || orders.length === 0 ? (
            <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-foreground">अद्याप कोणतीही ऑर्डर नाही</h3>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  तुम्ही अजून कोणतीही ऑर्डर दिलेली नाही. तुमच्या गावातील दुकानांतून खरेदी सुरू करा!
                </p>
              </div>
              <Link
                href="/bazar"
                className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all"
              >
                <Store className="h-4 w-4" />
                <span>दुकान पहा (Explore Stores)</span>
              </Link>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-1">
              <PackageSearch className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
              <p>या श्रेणीमध्ये कोणतीही ऑर्डर आढळली नाही.</p>
              <p className="text-[11px]">(No orders found in this filter)</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const isActive = order.status === 'active';

              return (
                <div 
                  key={order.id}
                  className="bg-card rounded-2xl border border-border p-3.5 shadow-2xs space-y-3 hover:border-primary/40 transition-all"
                >
                  {/* Header: Order Number, Date, Status */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-foreground">
                          Order {order.orderNumber}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {order.dateText}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 pt-0.5">
                        {isActive ? (
                          <>
                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                              {order.statusTextEn}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              ({order.statusTextMarathi})
                            </span>
                          </>
                        ) : order.status === 'cancelled' ? (
                          <>
                            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                            <span className="text-xs font-bold text-destructive">
                              {order.statusTextEn}
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-bold text-primary">
                              {order.statusTextEn}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <span className="font-black text-sm text-foreground">
                      ₹{order.totalAmount}
                    </span>
                  </div>

                  {/* Items Names & Count */}
                  <div className="py-1 space-y-1">
                    <div className="text-xs font-medium text-foreground line-clamp-1">
                      {order.items.map(i => `${i.name} (x${i.qty})`).join(', ')}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium block">
                      {order.itemsCount} Total Items
                    </span>
                  </div>

                  {/* Action Button Row */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {order.storeName}
                    </span>

                    {isActive ? (
                      <Link href={`/bazar/order-tracking?id=${order.id}`}>
                        <button className="h-8 px-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-extrabold text-xs flex items-center gap-1 active:scale-95 transition-all">
                          <span>Track Order</span>
                          <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" />
                        </button>
                      </Link>
                    ) : (
                      <Link href="/bazar">
                        <button className="h-8 px-3 rounded-xl bg-muted text-foreground hover:bg-muted/80 font-extrabold text-xs flex items-center gap-1 active:scale-95 transition-all">
                          <RotateCw className="h-3 w-3" />
                          <span>Reorder</span>
                        </button>
                      </Link>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </main>

        {/* ─────────────────────────────────────────────────────────────
            4. NATIVE BOTTOM NAVIGATION BAR (Orders Tab Active)
        ───────────────────────────────────────────────────────────── */}
        <NativeAppBottomNav />

      </div>
    </div>
  );
}
