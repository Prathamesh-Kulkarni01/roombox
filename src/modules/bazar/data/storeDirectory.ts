export interface BazarTownStore {
  id: string;
  name: string;
  nameMarathi: string;
  slug: string;
  address: string;
  category: string;
  categoryMarathi: string;
  town: 'Palus' | 'Tasgaon' | 'Islampur' | 'Sangli';
  isOpen: boolean;
  distanceKm: number;
  deliveryTimeMins: string;
  minOrder: number;
  rating: number;
  ratingCount: number;
  ratingCountText: string;
  imageUrl: string;
  shortCode: string;
  verified: boolean;
  offersText?: string;
  offersTextMarathi?: string;
  brandTheme?: 'violet' | 'green' | 'saffron' | 'rose' | 'blue';
}

export interface StoreCategoryItem {
  id: string;
  name: string;
  nameMarathi: string;
  iconName: string;
  countText: string;
  bgGradient: string;
  textColor: string;
}

export const POPULAR_SHOP_CATEGORIES: StoreCategoryItem[] = [
  {
    id: 'grocery',
    name: 'Grocery & Kirana',
    nameMarathi: 'किराणा व धान्य',
    iconName: 'ShoppingBasket',
    countText: '250+ Items',
    bgGradient: 'from-emerald-50 to-teal-50',
    textColor: 'text-emerald-700',
  },
  {
    id: 'dairy',
    name: 'Dairy & Milk',
    nameMarathi: 'दूध व डेअरी',
    iconName: 'Milk',
    countText: 'Daily Fresh',
    bgGradient: 'from-blue-50 to-sky-50',
    textColor: 'text-blue-700',
  },
  {
    id: 'vegetables',
    name: 'Vegetables',
    nameMarathi: 'ताजी भाजीपाला',
    iconName: 'Carrot',
    countText: 'Farm Direct',
    bgGradient: 'from-green-50 to-lime-50',
    textColor: 'text-green-700',
  },
  {
    id: 'fruits',
    name: 'Fresh Fruits',
    nameMarathi: 'ताजी फळे',
    iconName: 'Apple',
    countText: 'Seasonal',
    bgGradient: 'from-rose-50 to-red-50',
    textColor: 'text-rose-700',
  },
  {
    id: 'bakery',
    name: 'Bakery & Snacks',
    nameMarathi: 'बेकरी व स्नॅक्स',
    iconName: 'Cookie',
    countText: 'Fresh Bakes',
    bgGradient: 'from-amber-50 to-orange-50',
    textColor: 'text-amber-700',
  },
  {
    id: 'spices',
    name: 'Spices & Oils',
    nameMarathi: 'मसाले व तेल',
    iconName: 'Flame',
    countText: 'Pure & Local',
    bgGradient: 'from-orange-50 to-amber-50',
    textColor: 'text-orange-700',
  },
  {
    id: 'beverages',
    name: 'Tea, Coffee & Drinks',
    nameMarathi: 'चहा, कॉफी व पेये',
    iconName: 'Coffee',
    countText: 'Chilled & Hot',
    bgGradient: 'from-cyan-50 to-teal-50',
    textColor: 'text-cyan-700',
  },
  {
    id: 'household',
    name: 'Home Essentials',
    nameMarathi: 'घरगुती साहित्य',
    iconName: 'Home',
    countText: 'Daily Needs',
    bgGradient: 'from-violet-50 to-purple-50',
    textColor: 'text-violet-700',
  },
];

export const BAZAR_TOWN_STORES: BazarTownStore[] = [
  {
    id: 'fresh-mart',
    name: 'Fresh Mart Supermarket',
    nameMarathi: 'फ्रेश मार्ट सुपरमार्केट',
    slug: 'fresh-mart',
    address: 'एसटी स्टँडसमोर, मेन रोड, पलूस',
    category: 'Grocery & Daily Essentials',
    categoryMarathi: 'किराणा व दैनंदिन गरजा',
    town: 'Palus',
    isOpen: true,
    distanceKm: 0.8,
    deliveryTimeMins: '15–25 min',
    minOrder: 99,
    rating: 4.8,
    ratingCount: 1240,
    ratingCountText: '1.2k+ ratings',
    shortCode: 'FM',
    verified: true,
    offersText: 'FREE Delivery above ₹299',
    offersTextMarathi: '₹२९९ वर मोफत डिलिव्हरी',
    imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80',
    brandTheme: 'green',
  },
  {
    id: 'shree-super-bazar',
    name: 'Shree Mahalaxmi Super Bazar',
    nameMarathi: 'श्री महालक्ष्मी सुपर बाजार',
    slug: 'shree-super-bazar',
    address: 'पटेल स्टँडसमोर, बाजार पेठ, पलूस',
    category: 'Grains, Spices & Groceries',
    categoryMarathi: 'धान्य, मसाले व किराणा',
    town: 'Palus',
    isOpen: true,
    distanceKm: 0.8,
    deliveryTimeMins: '25–35 min',
    minOrder: 199,
    rating: 4.8,
    ratingCount: 890,
    ratingCountText: '890+ ratings',
    shortCode: 'श्री',
    verified: true,
    offersText: '10% OFF on Monthly Ration',
    offersTextMarathi: 'मासिक किराण्यावर १०% सूट',
    imageUrl: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&auto=format&fit=crop&q=80',
    brandTheme: 'violet',
  },
  {
    id: 'ganesh-dairy-palus',
    name: 'Ganesh Dairy & Fresh Bakery',
    nameMarathi: 'गणेश डेअरी आणि फ्रेश बेकरी',
    slug: 'ganesh-dairy-palus',
    address: 'शिवाजी चौक, पलूस',
    category: 'Pure Cow Milk, Paneer & Bakes',
    categoryMarathi: 'ताजे गाईचे दूध, पनीर व बेकरी',
    town: 'Palus',
    isOpen: true,
    distanceKm: 0.5,
    deliveryTimeMins: '15–20 min',
    minOrder: 99,
    rating: 4.9,
    ratingCount: 650,
    ratingCountText: '650+ ratings',
    shortCode: 'गणेश',
    verified: true,
    offersText: 'Morning Milk slots active',
    offersTextMarathi: 'सकाळची दूध डिलिव्हरी सुरू',
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80',
    brandTheme: 'saffron',
  },
  {
    id: 'tasgaon-krishi-bazar',
    name: 'Tasgaon Fresh Krishi Bazar',
    nameMarathi: 'तासगाव ताजी शेतमाल भाजीपाला',
    slug: 'tasgaon-krishi-bazar',
    address: 'गणपती मंदिराशेजारी, तासगाव',
    category: 'Farm Direct Vegetables & Fruits',
    categoryMarathi: 'शेतकऱ्यांचा थेट भाजीपाला व फळे',
    town: 'Tasgaon',
    isOpen: true,
    distanceKm: 1.4,
    deliveryTimeMins: '25–30 min',
    minOrder: 149,
    rating: 4.7,
    ratingCount: 420,
    ratingCountText: '420+ ratings',
    shortCode: 'तासगाव',
    verified: true,
    offersText: 'Fresh harvest arrived at 6 AM',
    offersTextMarathi: 'सकाळी ६ वाजता आलेला ताजा माल',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
    brandTheme: 'green',
  },
];

