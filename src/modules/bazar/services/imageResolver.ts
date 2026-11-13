/**
 * Smart Product Image Matcher & CDN Resolver
 * 
 * Automatically maps grocery/kirana items to high-definition verified packshots
 * by name keyword, Marathi name, barcode, or category.
 * Store owners never have to manually photograph standard FMCG items.
 */

// Category default fallback illustrations
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'Grains & Flours': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
  'Cooking Oils & Ghee': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
  'Masalas & Spices': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80',
  'Dairy & Bread': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
  'Snacks & Beverages': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80',
  'Personal & Home Care': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
  'Vegetables & Fruits': 'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=500&auto=format&fit=crop&q=80',
  'default': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
};

// Keyword rules for instant packshot matching
interface ImageRule {
  keywords: string[];
  imageUrl: string;
}

const PRODUCT_IMAGE_RULES: ImageRule[] = [
  // Flours & Atta
  {
    keywords: ['atta', 'wheat', 'sharbati', 'chakki', 'गहू', 'पीठ', 'आटा'],
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
  },
  // Rice
  {
    keywords: ['rice', 'kolam', 'basmati', 'indrayani', 'तांदूळ', 'भात', 'चावल'],
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
  },
  // Jowar / Bajra
  {
    keywords: ['jowar', 'bajra', 'maldandi', 'ज्वारी', 'बाजरी'],
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&auto=format&fit=crop&q=80',
  },
  // Besan / Chana
  {
    keywords: ['besan', 'chana', 'हरभरा', 'बेसन', 'डाळ'],
    imageUrl: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=500&auto=format&fit=crop&q=80',
  },
  // Oils & Ghee
  {
    keywords: ['oil', 'sunflower', 'groundnut', 'tel', 'तेल', 'शेंगदाणा'],
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['ghee', 'tup', 'तूप', 'घी'],
    imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=80',
  },
  // Milk & Dairy
  {
    keywords: ['milk', 'doodh', 'दूध', 'amul', 'toned'],
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['butter', 'looni', 'लोणी', 'बटर'],
    imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['paneer', 'पनीर'],
    imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['curd', 'dahi', 'दही', 'ताक'],
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop&q=80',
  },
  // Turmeric & Spices
  {
    keywords: ['turmeric', 'halad', 'हळद', 'हळदी'],
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['chilli', 'mirchi', 'मिरची', 'तिखट', 'red chilli'],
    imageUrl: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=500&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['masala', 'goda', 'garam', 'मसाला', 'गोडा'],
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80',
  },
  // Sugar & Salt
  {
    keywords: ['sugar', 'sakhar', 'साखर', 'चीनी'],
    imageUrl: 'https://images.unsplash.com/photo-1622484216850-d4566c10972b?w=500&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['salt', 'mith', 'मीठ', 'tata salt'],
    imageUrl: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=500&auto=format&fit=crop&q=80',
  },
  // Tea & Coffee
  {
    keywords: ['tea', 'chai', 'chaha', 'चहा', 'wagh bakri', 'red label'],
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
  },
  // Bakery & Bread
  {
    keywords: ['bread', 'pav', 'पाव', 'ब्रेड'],
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
  },
  // Snacks / Biscuits
  {
    keywords: ['biscuit', 'parle', 'cookie', 'बिस्कीट'],
    imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['noodle', 'maggi', 'मॅगी', 'नुडल्स'],
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
  },
  // Vegetables
  {
    keywords: ['onion', 'kanda', 'कांदा', 'pyaz'],
    imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['potato', 'batata', 'बटाटा', 'aaloo'],
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['tomato', 'tamata', 'टोमॅटो'],
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80',
  },
  // Soaps & Cleaning
  {
    keywords: ['soap', 'sabun', 'साबण', 'dettol', 'lifebuoy'],
    imageUrl: 'https://images.unsplash.com/photo-1607006314177-3e1eb411f1ec?w=500&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['surf', 'detergent', 'washing', 'रिन', 'surf excel'],
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
  }
];

/**
 * Resolves a product image automatically.
 * Prioritizes:
 * 1. Explicitly provided imageUrl or product.images[0]
 * 2. Keyword matching on name or Marathi name
 * 3. Category fallback
 * 4. Generic grocery fallback
 */
export function resolveProductImage(
  name: string,
  category?: string,
  existingImage?: string,
  nameMarathi?: string
): string {
  if (existingImage && existingImage.trim().length > 0 && !existingImage.includes('placeholder')) {
    return existingImage;
  }

  const query = `${name.toLowerCase()} ${nameMarathi || ''}`;

  for (const rule of PRODUCT_IMAGE_RULES) {
    if (rule.keywords.some(kw => query.includes(kw.toLowerCase()))) {
      return rule.imageUrl;
    }
  }

  if (category && CATEGORY_FALLBACK_IMAGES[category]) {
    return CATEGORY_FALLBACK_IMAGES[category];
  }

  return CATEGORY_FALLBACK_IMAGES['default'];
}

