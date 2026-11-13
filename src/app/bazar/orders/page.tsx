'use client';

import { useState } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { NativeAppBottomNav } from '@/modules/bazar/components/NativeAppBottomNav';

interface OrderItemSummary {
  name: string;
  qty: number;
  imageUrl: string;
}

interface OrderRecord {
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

const DEMO_ORDERS: OrderRecord[] = [
  {
    id: 'ord_1',
    orderNumber: '#BZ12456',
    storeName: 'Fresh Mart Supermarket',
    dateText: 'Today, 10:12 AM',
    status: 'active',
    statusTextMarathi: 'डिलिव्हरीसाठी बाहेर आहे',
    statusTextEn: 'Out for Delivery',
    itemsCount: 3,
    totalAmount: 248,
    items: [
      { name: 'Amul Taaza Milk', qty: 1, imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop&q=80' },
      { name: 'Fresh Farm Eggs', qty: 1, imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&auto=format&fit=crop&q=80' },
      { name: 'Fortune Sunlite Oil', qty: 1, imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop&q=80' },
    ]
  },
  {
    id: 'ord_2',
    orderNumber: '#BZ12034',
    storeName: 'Fresh Mart Supermarket',
    dateText: '12 Oct 2024 · 2:35 PM',
    status: 'delivered',
    statusTextMarathi: 'डिलिव्हरी झाली',
    statusTextEn: 'Delivered',
    itemsCount: 5,
    totalAmount: 412,
    items: [
      { name: 'Fortune Sunlite Oil', qty: 2, imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop&q=80' },
      { name: 'Amul Salted Butter', qty: 1, imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&auto=format&fit=crop&q=80' },
      { name: 'Fresh Red Tomatoes', qty: 2, imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200&auto=format&fit=crop&q=80' },
    ]
  },
  {
    id: 'ord_3',
    orderNumber: '#BZ11876',
    storeName: 'Shree Mahalaxmi Super Bazar',
    dateText: '08 Oct 2024 · 11:20 AM',
    status: 'delivered',
    statusTextMarathi: 'डिलिव्हरी झाली',
    statusTextEn: 'Delivered',
    itemsCount: 2,
    totalAmount: 180,
    items: [
      { name: 'Nashik Red Onions', qty: 2, imageUrl: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=200&auto=format&fit=crop&q=80' },
      { name: 'Fresh Potatoes', qty: 2, imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&auto=format&fit=crop&q=80' },
    ]
  }
];

export default function MyOrdersPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');

  const filteredOrders = DEMO_ORDERS.filter(o => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return o.status === 'active';
    if (activeTab === 'completed') return o.status === 'delivered';
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-[#F8FAF9] text-[#0F1713] flex justify-center pb-24 selection:bg-[#0D7C4D]/20">
      {/* Mobile-First Frame (430px max width on desktop) */}
      <div className="w-full max-w-[430px] bg-[#FFFFFF] min-h-screen shadow-md flex flex-col relative border-x border-[#E5E9E6]">
        
        {/* ─────────────────────────────────────────────────────────────
            1. TOP HEADER (Row 2, Screen 4 matching)
        ───────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E5E9E6] px-4 pt-3 pb-2.5">
          <div className="flex items-center gap-2">
            <Link
              href="/bazar"
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[#F2F4F3] active:scale-90 transition-all text-[#0F1713]"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
            </Link>
            <h1 className="font-black text-base text-[#0F1713]">
              माझी ऑर्डर्स <span className="text-[#8A948D] font-normal text-xs">(My Orders)</span>
            </h1>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            2. TABS ROW: सर्व (All), चालू (Active), पूर्ण झाले (Completed)
        ───────────────────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 flex items-center gap-2 border-b border-[#F2F4F3] bg-[#FAFBFB]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
              activeTab === 'all'
                ? 'bg-[#0D7C4D] text-white shadow-2xs'
                : 'bg-[#FFFFFF] text-[#525C56] border border-[#E5E9E6] hover:bg-[#F2F4F3]'
            }`}
          >
            सर्व (All)
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
              activeTab === 'active'
                ? 'bg-[#0D7C4D] text-white shadow-2xs'
                : 'bg-[#FFFFFF] text-[#525C56] border border-[#E5E9E6] hover:bg-[#F2F4F3]'
            }`}
          >
            चालू (Active)
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
              activeTab === 'completed'
                ? 'bg-[#0D7C4D] text-white shadow-2xs'
                : 'bg-[#FFFFFF] text-[#525C56] border border-[#E5E9E6] hover:bg-[#F2F4F3]'
            }`}
          >
            पूर्ण झाले (Completed)
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. ORDERS LIST (Matches Row 2, Screen 4)
        ───────────────────────────────────────────────────────────── */}
        <main className="px-4 pt-3.5 space-y-3.5 flex-1">
          {filteredOrders.map(order => {
            const isActive = order.status === 'active';

            return (
              <div 
                key={order.id}
                className="bg-[#FFFFFF] rounded-2xl border border-[#E5E9E6] p-3.5 shadow-2xs space-y-3 hover:border-[#0D7C4D]/40 transition-all"
              >
                {/* Header: Order Number, Date, Status */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-[#0F1713]">
                        Order {order.orderNumber}
                      </span>
                      <span className="text-[10px] text-[#8A948D]">
                        {order.dateText}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      {isActive ? (
                        <>
                          <div className="h-2 w-2 rounded-full bg-[#F59E0B] animate-pulse" />
                          <span className="text-xs font-bold text-[#F59E0B]">
                            {order.statusTextEn}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#0D7C4D]" />
                          <span className="text-xs font-bold text-[#0D7C4D]">
                            {order.statusTextEn}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <span className="font-black text-sm text-[#0F1713]">
                    ₹{order.totalAmount}
                  </span>
                </div>

                {/* Items Thumbnails Row */}
                <div className="flex items-center gap-2 py-1 overflow-x-auto no-scrollbar">
                  {order.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="relative h-12 w-12 rounded-xl bg-[#F8FAF9] border border-[#E5E9E6] p-1 flex items-center justify-center shrink-0"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                  ))}
                  <span className="text-xs text-[#8A948D] pl-1 font-medium shrink-0">
                    {order.itemsCount} Items
                  </span>
                </div>

                {/* Action Button Row */}
                <div className="pt-2 border-t border-[#F2F4F3] flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#525C56]">
                    {order.storeName}
                  </span>

                  {isActive ? (
                    <Link href={`/bazar/order-tracking?id=${order.id}`}>
                      <button className="h-8 px-3 rounded-xl bg-[#E8F5EE] text-[#0D7C4D] font-extrabold text-xs flex items-center gap-1 active:scale-95 transition-all">
                        <span>Track Order</span>
                        <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" />
                      </button>
                    </Link>
                  ) : (
                    <button className="h-8 px-3 rounded-xl bg-[#F2F4F3] text-[#0F1713] hover:bg-[#E5E9E6] font-extrabold text-xs flex items-center gap-1 active:scale-95 transition-all">
                      <RotateCw className="h-3 w-3" />
                      <span>Reorder</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </main>

        {/* ─────────────────────────────────────────────────────────────
            4. NATIVE BOTTOM NAVIGATION BAR (Orders Tab Active)
        ───────────────────────────────────────────────────────────── */}
        <NativeAppBottomNav />

      </div>
    </div>
  );
}

