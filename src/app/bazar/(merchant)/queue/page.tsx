'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/lib/hooks';
import { getMerchantStoreAction } from '@/modules/bazar/actions';
import { 
  ArrowLeft, 
  Store, 
  ShoppingCart, 
  Clock, 
  CheckCircle2, 
  Bike, 
  PackageCheck, 
  Phone, 
  MessageSquare,
  Search,
  Filter,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MerchantOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  fulfilmentType: 'pickup' | 'delivery';
  paymentMode: 'cod' | 'upi';
  status: 'received' | 'packing' | 'ready' | 'dispatched';
  totalAmount: number;
  timeText: string;
  items: { name: string; qty: number; unitPrice: number }[];
}

export default function MerchantOrdersQueuePage() {
  const { currentUser } = useAppSelector((state) => state.user);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'pickup' | 'delivery'>('all');
  const [activeStoreId, setActiveStoreId] = useState<string>('fresh-mart');

  // 1. Resolve merchant's actual store ID
  useEffect(() => {
    let isMounted = true;
    async function resolveStore() {
      try {
        const ownerId = currentUser?.id || 'default_store';
        const storeData = await getMerchantStoreAction(ownerId);
        if (isMounted && storeData?.id) {
          setActiveStoreId(storeData.id);
        }
      } catch (err) {
        console.warn('Could not resolve merchant store:', err);
      }
    }
    resolveStore();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // 2. Poll live orders for the active store
  useEffect(() => {
    let isMounted = true;
    const fetchLiveOrders = async () => {
      try {
        const res = await fetch(`/api/bazar/orders?storeId=${encodeURIComponent(activeStoreId)}`);
        if (!res.ok) {
          if (isMounted) setIsLoading(false);
          return;
        }
        const data = await res.json();
        if (data && data.success && Array.isArray(data.orders)) {
          const liveOrders: MerchantOrder[] = data.orders.map((o: any, idx: number) => {
            let timeText = 'Just now';
            if (o.createdAt) {
              try {
                const diffMin = Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000);
                timeText = diffMin <= 1 ? 'Just now' : `${diffMin} mins ago`;
              } catch {
                timeText = 'Recent';
              }
            }

            return {
              id: o.id || `live_ord_${idx}`,
              orderNumber: o.orderNumber ? `#${o.orderNumber}` : `#BZ${(o.id || String(idx)).slice(-5).toUpperCase()}`,
              customerName: o.customerName || 'Customer',
              customerPhone: o.customerPhone ? `+91 ${o.customerPhone.replace(/\D/g, '').slice(-10)}` : 'No phone',
              fulfilmentType: (o.deliveryType === 'store_pickup' ? 'pickup' : 'delivery') as 'pickup' | 'delivery',
              paymentMode: (o.paymentMethod === 'cod' ? 'cod' : 'upi') as 'cod' | 'upi',
              status: (o.orderStatus === 'placed' ? 'received' : (o.orderStatus || 'received')) as MerchantOrder['status'],
              totalAmount: o.totalAmount || 0,
              timeText,
              items: Array.isArray(o.items)
                ? o.items.map((item: any) => ({
                    name: item.productName || item.name || 'Product',
                    qty: item.quantity || item.qty || 1,
                    unitPrice: item.price || item.unitPrice || 0,
                  }))
                : [],
            };
          });

          if (isMounted) {
            setOrders(liveOrders);
            setIsLoading(false);
          }
        } else {
          if (isMounted) setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLiveOrders();
    const interval = setInterval(fetchLiveOrders, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeStoreId]);

  const updateOrderStatus = async (orderId: string, newStatus: MerchantOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    try {
      await fetch('/api/bazar/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
    } catch (e) {
      console.warn('Failed to sync status update:', e);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filterMode === 'all') return true;
    return o.fulfilmentType === filterMode;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/bazar/dashboard"
            className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span>Live Packing & Dispatch Queue</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fresh Mart Supermarket (Palus) · Instant Customer Orders
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filterMode === 'all' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
            }`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setFilterMode('pickup')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filterMode === 'pickup' ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground'
            }`}
          >
            Counter Pickup ({orders.filter(o => o.fulfilmentType === 'pickup').length})
          </button>
          <button
            onClick={() => setFilterMode('delivery')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filterMode === 'delivery' ? 'bg-background shadow-xs text-blue-600' : 'text-muted-foreground'
            }`}
          >
            Home Delivery ({orders.filter(o => o.fulfilmentType === 'delivery').length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading && orders.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-border p-12 text-center">
            <p className="text-sm font-semibold text-muted-foreground animate-pulse">
              ऑर्डर्स लोड होत आहेत... (Checking for incoming orders...)
            </p>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-border p-12 text-center space-y-2">
            <Store className="h-8 w-8 text-muted-foreground mx-auto stroke-[1.5]" />
            <p className="text-sm font-bold text-foreground">
              कोणतीही ऑर्डर नाही (No orders in this queue)
            </p>
            <p className="text-xs text-muted-foreground">
              नवीन ग्राहकांची ऑर्डर आल्यावर ती येथे आपोआप दिसेल.
            </p>
          </Card>
        ) : (
          filteredOrders.map(order => {
          return (
            <Card key={order.id} className="rounded-2xl border-border overflow-hidden">
              <CardHeader className="p-4 bg-muted/20 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm text-foreground">
                    Order {order.orderNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">· {order.timeText}</span>
                  
                  {order.fulfilmentType === 'pickup' ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                      <Store className="h-3 w-3 mr-1" />
                      ORDER & PICK FROM BAZAR
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                      <Bike className="h-3 w-3 mr-1" />
                      HOME DELIVERY
                    </Badge>
                  )}

                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    Pay via COD (₹{order.totalAmount})
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="h-8 px-2.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>{order.customerPhone}</span>
                  </a>
                  <a
                    href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 w-8 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center text-emerald-600 transition-colors"
                    title="WhatsApp Customer"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </a>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Customer name & item list */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">
                    Customer: <span className="text-primary">{order.customerName}</span>
                  </p>

                  <div className="bg-muted/30 rounded-xl p-3 border border-border/60 divide-y divide-border/40 text-xs">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {it.name} <strong className="text-primary font-bold">× {it.qty}</strong>
                        </span>
                        <span className="font-semibold text-foreground">₹{it.unitPrice * it.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Current Status:</span>
                    <Badge className={
                      order.status === 'received' ? 'bg-amber-500' :
                      order.status === 'packing' ? 'bg-blue-600' :
                      'bg-emerald-600'
                    }>
                      {order.status === 'received' ? 'Order Received' :
                       order.status === 'packing' ? 'Packing in Progress' :
                       order.fulfilmentType === 'pickup' ? 'Ready for Pickup at Counter' : 'Dispatched'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {order.status === 'received' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'packing')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                      >
                        Start Packing Bag
                      </Button>
                    )}

                    {order.status === 'packing' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        <PackageCheck className="h-4 w-4" />
                        <span>{order.fulfilmentType === 'pickup' ? 'Mark Ready for Pickup' : 'Handover to Rider'}</span>
                      </Button>
                    )}

                    {order.status === 'ready' && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Customer Notified via WhatsApp/SMS</span>
                      </span>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>
          );
        }))}
      </div>
    </div>
  );
}

