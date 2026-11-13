'use client';

import { useState } from 'react';
import { useBazarCart } from '../context/BazarCartContext';
import { 
  ShoppingCart, 
  ArrowRight, 
  MessageCircle, 
  Bike, 
  Store 
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BazarStore } from '../schemas';

interface FloatingCartBarProps {
  store: BazarStore;
}

export function FloatingCartBar({ store }: FloatingCartBarProps) {
  const { items, totalItems, totalPrice, language, clearCart } = useBazarCart();
  const [isOpen, setIsOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'home' | 'pickup'>('home');
  const [paymentMode, setPaymentMode] = useState<'cod' | 'upi' | 'khata'>('cod');

  if (totalItems === 0) return null;

  const handleWhatsAppCheckout = () => {
    if (!customerName || !customerPhone) {
      alert('कृपया नाव आणि फोन नंबर प्रविष्ट करा');
      return;
    }

    const lines = [
      `*नवीन किराणा ऑर्डर - ${store.name}*`,
      `---------------------------------`,
      ...items.map((i, idx) => `${idx + 1}. ${i.product.nameMarathi || i.product.name} (${i.product.unit}) x ${i.quantity} = ₹${i.product.price * i.quantity}`),
      `---------------------------------`,
      `*एकूण रक्कम: ₹${totalPrice}*`,
      ``,
      `*ग्राहक माहिती:*`,
      `नाव: ${customerName}`,
      `मोबाईल: ${customerPhone}`,
      `पत्ता: ${deliveryAddress || 'दुकानात येऊन घेणार (Self-Pickup)'}`,
      `डिलिव्हरी: ${deliveryType === 'home' ? 'घरपोच (Home Delivery)' : 'दुकानातून पिकअप (Store Pickup)'}`,
      `पेमेंट: ${paymentMode === 'cod' ? 'कॅश ऑन डिलिव्हरी (COD)' : paymentMode === 'upi' ? 'UPI' : 'खाते (Store Credit)'}`,
    ];

    const message = encodeURIComponent(lines.join('\n'));
    const phone = store.phone || '';
    if (!phone) {
      alert('दुकानदाराचा मोबाईल क्रमांक उपलब्ध नाही');
      return;
    }
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    clearCart();
    setIsOpen(false);
  };

  return (
    <>
      {/* Sticky Bottom Floater using Native Platform Tokens */}
      <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md md:max-w-lg mx-auto">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full h-14 bg-primary text-primary-foreground rounded-2xl shadow-xl flex items-center justify-between px-4 transition-all active:scale-[0.99] border border-primary/20"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary-foreground/20 text-primary-foreground flex items-center justify-center font-bold text-sm">
              {totalItems}
            </div>
            <div className="text-left">
              <p className="font-extrabold text-sm leading-tight">₹{totalPrice}</p>
              <p className="text-[10px] opacity-80 font-medium">
                {language === 'mr' ? 'काही शुल्के लागू शकतात' : 'Plus delivery if applicable'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-bold text-sm bg-primary-foreground text-primary px-3.5 py-1.5 rounded-xl shadow-xs">
            <span>{language === 'mr' ? 'ऑर्डर करा' : 'View Cart'}</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </button>
      </div>

      {/* Cart & Checkout Bottom Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto px-5 py-6">
          <SheetHeader className="text-left pb-3 border-b">
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              {language === 'mr' ? 'तुमची किराणा पिशवी' : 'Your Grocery Bag'} ({totalItems})
            </SheetTitle>
            <SheetDescription className="text-xs">
              {store.name} • {store.town || 'Palus'}
            </SheetDescription>
          </SheetHeader>

          {/* Cart Items List */}
          <div className="py-3 divide-y divide-border/60 max-h-48 overflow-y-auto text-xs">
            {items.map(item => (
              <div key={item.product.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">
                    {language === 'mr' && item.product.nameMarathi ? item.product.nameMarathi : item.product.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{item.product.unit} • ₹{item.product.price} प्रत्येकी</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-sm text-primary">₹{item.product.price * item.quantity}</p>
                  <span className="text-[11px] text-muted-foreground font-medium">Qty: {item.quantity}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Customer Details Form */}
          <div className="space-y-3 pt-3 border-t">
            <h4 className="font-bold text-xs text-foreground">
              {language === 'mr' ? 'डिलिव्हरी पत्ता आणि तपशील' : 'Delivery Details'}
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="custName" className="text-[11px]">नाव (Name)</Label>
                <Input
                  id="custName"
                  placeholder="राहुल पाटील"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="custPhone" className="text-[11px]">मोबाईल (Phone)</Label>
                <Input
                  id="custPhone"
                  placeholder="9876543210"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="custAddr" className="text-[11px]">पत्ता / लँडमार्क (Address / Landmark)</Label>
              <Input
                id="custAddr"
                placeholder="उदा. एसटी स्टँडजवळ, शिवाजी चौक, पलूस"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Delivery Option Toggle */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeliveryType('home')}
                className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2 ${deliveryType === 'home' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
              >
                <Bike className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="font-bold text-xs">घरपोच (Delivery)</p>
                  <p className="text-[10px] text-muted-foreground">३०-४५ मिनिटांत</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('pickup')}
                className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2 ${deliveryType === 'pickup' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
              >
                <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-bold text-xs">पिकअप (Self-Pickup)</p>
                  <p className="text-[10px] text-muted-foreground">रांगेत उभे न राहता</p>
                </div>
              </button>
            </div>
          </div>

          {/* Checkout CTA Buttons */}
          <div className="space-y-2 pt-4">
            <Button
              onClick={handleWhatsAppCheckout}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl shadow-md flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span>व्हॉट्सअ‍ॅपवर ऑर्डर पाठवा (₹{totalPrice})</span>
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              ऑर्डर पाठवल्यानंतर दुकानदार तात्काळ पुष्टी करेल.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
