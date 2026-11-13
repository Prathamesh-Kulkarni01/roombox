export interface ProductVariant {
  id: string;
  unit: string;
  price: number;
  mrp: number;
  discountPercent?: number;
}

export interface GroceryProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  section: string;
  price: number;
  mrp: number;
  unit: string;
  discountPercent: number;
  imageUrl: string;
  inStock: boolean;
  maxStock: number;
  rating?: number;
  totalRatings?: number;
  ratingCountText?: string;
  descriptionMarathi?: string;
  variants?: ProductVariant[];
}

export const BAZAR_PRODUCT_CATALOG: GroceryProduct[] = [
  {
    id: 'amul-taaza-toned-milk',
    name: 'Amul Taaza Toned Fresh Milk',
    brand: 'AMUL',
    category: 'dairy',
    section: 'Bestsellers',
    price: 28,
    mrp: 30,
    unit: '500 ml',
    discountPercent: 7,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
    inStock: true,
    maxStock: 25,
    rating: 4.6,
    totalRatings: 2100,
    ratingCountText: '200+ bought today',
    descriptionMarathi: 'ताजे आणि पौष्टिक दूध, रोजच्या वापरासाठी योग्य.',
    variants: [
      { id: 'v-500ml', unit: '500 ml', price: 28, mrp: 30, discountPercent: 7 },
      { id: 'v-1l', unit: '1 L', price: 54, mrp: 58, discountPercent: 7 },
      { id: 'v-2l', unit: '2 L', price: 102, mrp: 110, discountPercent: 7 },
    ]
  },
  {
    id: 'amul-salted-butter',
    name: 'Amul Pasteurised Salted Butter',
    brand: 'AMUL',
    category: 'dairy',
    section: 'Bestsellers',
    price: 56,
    mrp: 60,
    unit: '100 g',
    discountPercent: 7,
    imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=80',
    inStock: true,
    maxStock: 30,
    rating: 4.8,
    totalRatings: 1850,
    descriptionMarathi: 'स्वादिष्ट आणि ताजे लोणी.',
    variants: [
      { id: 'v-100g', unit: '100 g', price: 56, mrp: 60, discountPercent: 7 },
      { id: 'v-500g', unit: '500 g', price: 275, mrp: 290, discountPercent: 5 },
    ]
  },
  {
    id: 'fresh-farm-white-eggs',
    name: 'Fresh Farm White Eggs (Protein Rich)',
    brand: 'FARM FRESH',
    category: 'dairy',
    section: 'Bestsellers',
    price: 48,
    mrp: 60,
    unit: '6 pcs',
    discountPercent: 20,
    imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=80',
    inStock: true,
    maxStock: 40,
    rating: 4.7,
    totalRatings: 940,
    variants: [
      { id: 'v-6pcs', unit: '6 pcs', price: 48, mrp: 60, discountPercent: 20 },
      { id: 'v-12pcs', unit: '12 pcs', price: 92, mrp: 115, discountPercent: 20 },
      { id: 'v-30pcs', unit: '30 pcs Tray', price: 210, mrp: 260, discountPercent: 19 },
    ]
  },
  {
    id: 'fortune-sunlite-sunflower-oil',
    name: 'Fortune Sunlite Refined Sunflower Oil Pouch',
    brand: 'FORTUNE',
    category: 'staples',
    section: 'Bestsellers',
    price: 138,
    mrp: 155,
    unit: '1 L',
    discountPercent: 11,
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
    inStock: true,
    maxStock: 50,
    rating: 4.7,
    totalRatings: 3200,
  },
  {
    id: 'fresh-yellow-bananas',
    name: 'Fresh Robusta Golden Bananas',
    brand: 'FRESH PRODUCE',
    category: 'fruits',
    section: 'Fresh Fruits',
    price: 38,
    mrp: 45,
    unit: '1 kg (5-6 pcs)',
    discountPercent: 13,
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=80',
    inStock: true,
    maxStock: 60,
    rating: 4.8,
  },
  {
    id: 'fresh-red-tomatoes',
    name: 'Farm Fresh Red Hybrid Tomatoes',
    brand: 'FARM FRESH',
    category: 'vegetables',
    section: 'Fresh Vegetables',
    price: 28,
    mrp: 32,
    unit: '1 kg',
    discountPercent: 10,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80',
    inStock: true,
    maxStock: 80,
    rating: 4.7,
  },
  {
    id: 'fresh-onions-nashik',
    name: 'Nashik Premium Quality Red Onions',
    brand: 'LOCAL FARM',
    category: 'vegetables',
    section: 'Fresh Vegetables',
    price: 24,
    mrp: 28,
    unit: '1 kg',
    discountPercent: 14,
    imageUrl: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=500&auto=format&fit=crop&q=80',
    inStock: true,
    maxStock: 100,
    rating: 4.6,
  },
  {
    id: 'fresh-potatoes-jyoti',
    name: 'Fresh Jyoti Potatoes (Medium Size)',
    brand: 'FARM FRESH',
    category: 'vegetables',
    section: 'Fresh Vegetables',
    price: 22,
    mrp: 25,
    unit: '1 kg',
    discountPercent: 12,
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80',
    inStock: true,
    maxStock: 120,
    rating: 4.5,
  },
  {
    id: 'fresh-cauliflower',
    name: 'Fresh White Cauliflower (Gobi)',
    brand: 'LOCAL FARM',
    category: 'vegetables',
    section: 'Fresh Vegetables',
    price: 32,
    mrp: 40,
    unit: '1 pc (600-800g)',
    discountPercent: 20,
    imageUrl: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=500&auto=format&fit=crop&q=80',
    inStock: true,
    maxStock: 40,
    rating: 4.8,
  }
];

export const BAZAR_CATEGORIES = [
  { id: 'all', label: 'All', iconUrl: 'grid' },
  { id: 'vegetables', label: 'Vegetables', iconUrl: 'broccoli' },
  { id: 'fruits', label: 'Fruits', iconUrl: 'apple' },
  { id: 'dairy', label: 'Dairy & Bakery', iconUrl: 'milk' },
  { id: 'snacks', label: 'Snacks', iconUrl: 'chips' },
  { id: 'beverages', label: 'Beverages', iconUrl: 'juice' },
  { id: 'staples', label: 'Atta, Rice & Dal', iconUrl: 'grain' },
  { id: 'personal', label: 'Person Care', iconUrl: 'soap' },
];

export const BAZAR_STORE_OFFERS = [
  {
    id: 'free-del',
    headline: 'FREE Delivery',
    subline: 'On orders above ₹299',
    badge: 'FREE Delivery',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    icon: 'bike',
  },
  {
    id: 'snacks-off',
    headline: '20% OFF',
    subline: 'Snacks & Namkeen',
    badge: '20% OFF',
    bg: '#FFF1F2',
    border: '#FECDD3',
    icon: 'chips',
  },
  {
    id: 'fresh-fruits',
    headline: 'Fresh',
    subline: 'Fruits & Veggies',
    badge: 'Fresh',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    icon: 'fruits',
  },
];

export const STORE_CATEGORIES = BAZAR_CATEGORIES;
export const STORE_PROMOTIONAL_OFFERS = BAZAR_STORE_OFFERS;
export const STORE_PRODUCTS_CATALOG = BAZAR_PRODUCT_CATALOG;

