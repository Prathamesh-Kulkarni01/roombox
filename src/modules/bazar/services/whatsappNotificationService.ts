import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';
import type { BazarOrder } from '../schemas';

/**
 * Regional Marathi WhatsApp Notification Service for Bazar
 * Designed for rural/semi-urban merchants and local customers across Maharashtra.
 */
export class BazarWhatsAppNotificationService {
  /**
   * 1. Customer Order Confirmation (मराठी)
   */
  static async sendOrderPlacedCustomerNotification(order: BazarOrder, trackingUrl?: string) {
    if (!order.customerPhone) return { success: false, reason: 'No customer phone' };

    const storeName = order.storeName || 'स्थानिक सुपर बझार';
    const totalAmount = order.totalAmount || 0;
    const itemsSummary = (order.items || [])
      .map(item => `• ${item.name} (${item.quantity} ${item.unit || 'नग'}) - ₹${item.price * item.quantity}`)
      .join('\n');

    const paymentText = order.paymentMethod === 'cod' ? 'रोख / काउंटरवर देणे (Pay at Counter)' : 'ऑनलाइन भरले (Paid)';
    const trackingLink = trackingUrl || `https://bazar.roombox.in/bazar/order-tracking?id=${order.id}`;

    const message = 
`🙏 *सस्नेह नमस्कार, ${order.customerName || 'ग्राहक'}!*

आपली ऑर्डर यशस्वीरित्या नोंदवली गेली आहे! 🛍️

🏪 *दुकान:* ${storeName}
📦 *ऑर्डर क्र.:* #${order.id ? order.id.slice(-6).toUpperCase() : 'ORD'}
💰 *एकूण रक्कम:* ₹${totalAmount}
💳 *पद्धत:* ${paymentText}

🛒 *सामान तपशील:*
${itemsSummary}

📍 *ऑर्डरची सध्याची स्थिती पाहण्यासाठी येथे क्लिक करा:*
${trackingLink}

_स्थानिक दुकानांना सहकार्य केल्याबद्दल धन्यवाद!_`;

    return sendWhatsAppMessage(order.customerPhone, message);
  }

  /**
   * 2. Merchant New Order Alert (दुकानदारासाठी नवीन ऑर्डर सूचना)
   */
  static async sendNewOrderMerchantAlert(merchantPhone: string, order: BazarOrder) {
    if (!merchantPhone) return { success: false, reason: 'No merchant phone' };

    const totalAmount = order.totalAmount || 0;
    const itemCount = (order.items || []).reduce((acc, curr) => acc + (curr.quantity || 1), 0);

    const message = 
`🔔 *नवीन ऑर्डर प्राप्त झाली!* 🔔

👤 *ग्राहक:* ${order.customerName || 'ग्राहक'} (${order.customerPhone || 'मोबाईल नाही'})
📦 *ऑर्डर क्र.:* #${order.id ? order.id.slice(-6).toUpperCase() : 'ORD'}
🛍️ *एकूण वस्तू:* ${itemCount} नग
💵 *रक्कम:* ₹${totalAmount} (${order.paymentMethod === 'cod' ? 'काउंटरवर देणार' : 'ऑनलाइन प्राप्त'})

पॅकिंग सुरू करण्यासाठी व ऑर्डर व्यवस्थापित करण्यासाठी आपला *Bazar Merchant Queue* तपासा:
https://bazar.roombox.in/bazar/queue`;

    return sendWhatsAppMessage(merchantPhone, message);
  }

  /**
   * 3. Order Status Update to Customer (ऑर्डर स्थिती बदल - पॅकिंग / तयार)
   */
  static async sendOrderStatusUpdateNotification(order: BazarOrder, newStatus: string) {
    if (!order.customerPhone) return { success: false, reason: 'No customer phone' };

    const storeName = order.storeName || 'सुपर बझार';
    const orderNo = order.id ? order.id.slice(-6).toUpperCase() : 'ORD';
    let statusMessage = '';

    switch (newStatus) {
      case 'packing':
        statusMessage = 
`🛍️ *आपल्या ऑर्डरचे पॅकिंग सुरू झाले आहे!*

नमस्कार ${order.customerName || 'ग्राहक'}, 
*${storeName}* आपल्या ऑर्डर #${orderNo} मधील वस्तू काळजीपूर्वक पॅक करत आहे. 
थोड्याच वेळात आपली बॅग काउंटरवर तयार होईल.`;
        break;

      case 'ready':
        statusMessage = 
`✅ *आपली ऑर्डर पिकअपसाठी तयार आहे!* 🛍️

नमस्कार ${order.customerName || 'ग्राहक'}, 
आपली ऑर्डर #${orderNo} *${storeName}* च्या काउंटरवर सुरक्षित पॅक करून तयार ठेवली आहे.

कृपया दुकानात येऊन आपले पार्सल घेऊन जावे.
📍 *दुकान:* ${storeName}
💰 *देय रक्कम:* ₹${order.totalAmount || 0} (${order.paymentMethod === 'cod' ? 'रोख द्यावे' : 'आधीच भरले आहे'})`;
        break;

      case 'delivered':
        statusMessage = 
`🎉 *ऑर्डर यशस्वीरित्या पूर्ण झाली!*

नमस्कार ${order.customerName || 'ग्राहक'}, 
*${storeName}* कडून खरेदी केल्याबद्दल आपले मनापासून आभार! 

पुन्हा लवकरच सेवा करण्याची संधी द्या. आपला दिवस आनंदात जावो!`;
        break;

      default:
        return { success: false, reason: 'Ignored status' };
    }

    return sendWhatsAppMessage(order.customerPhone, statusMessage);
  }

  /**
   * 4. Customer Registration / Login Welcome (स्वागत संदेश)
   */
  static async sendCustomerWelcomeNotification(customerPhone: string, customerName?: string) {
    if (!customerPhone) return { success: false };

    const message = 
`🌸 *स्वागतम! Roombox Bazar मध्ये आपले सहर्ष स्वागत आहे.* 🌸

नमस्कार ${customerName || ''}! 
आता आपल्या गावातील व परिसरातील स्थानिक किराणा, भाजीपाला आणि सुपर बझारमधून थेट घरातून खरेदी करा.

✨ *खास वैशिष्ट्ये:*
• ५ किमी अंतरातील खात्रीशीर दुकाने
• अस्सल स्थानिक दर आणि MRP वर सूट
• काउंटर पिकअप व घरपोच डिलिव्हरी

🛒 *जवळची दुकाने पाहण्यासाठी येथे क्लिक करा:*
https://bazar.roombox.in/bazar`;

    return sendWhatsAppMessage(customerPhone, message);
  }

  /**
   * 5. Merchant Customer Addition & Khata / Udhar Note (खाते / उधारी संदेश)
   */
  static async sendMerchantCustomerAddedNotification(
    customerPhone: string, 
    customerName: string, 
    storeName: string, 
    storePhone?: string
  ) {
    if (!customerPhone) return { success: false };

    const message = 
`🏪 *${storeName}* कडून सुचना:

सस्नेह नमस्कार ${customerName}, 
आपले नाव *${storeName}* च्या डिजिटल ग्राहक नोंदवहीत यशस्वीरित्या जोडले गेले आहे. 

आता आपण दुकानातील सर्व वस्तू थेट मोबाईलवरून पाहू शकता व ऑर्डर करू शकता:
👉 https://bazar.roombox.in/bazar

काही अडचण असल्यास संपर्क: ${storePhone || 'दुकानदार'}`;

    return sendWhatsAppMessage(customerPhone, message);
  }
}

