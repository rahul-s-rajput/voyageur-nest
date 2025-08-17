import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type SeedItem = { name: string; price: number; isVeg?: boolean };

// Heuristic for veg tag
const inferVeg = (name: string): boolean => {
  const lower = name.toLowerCase();
  if (/(chicken|mutton|egg|bournvita)/.test(lower)) return false;
  return true;
};

const CATEGORIES: Record<string, SeedItem[]> = {
  'Hot Beverages': [
    { name: 'Green Tea', price: 60 },
    { name: 'Regular Tea', price: 40 },
    { name: 'Masala Tea', price: 50 },
    { name: 'Ginger Mint Tea', price: 45 },
    { name: 'Lemon Ginger Honey Tea', price: 75 },
    { name: 'Black Tea', price: 30 },
    { name: 'Milk Coffee', price: 70, isVeg: true },
    { name: 'Black Coffee', price: 50 },
    { name: 'Hot Chocolate', price: 110 },
    { name: 'Hot Bournvita', price: 110, isVeg: true },
    { name: 'Hot Milk', price: 60, isVeg: true },
  ],
  'Cool Refreshments': [
    { name: 'Iced Tea', price: 45 },
    { name: 'Iced Mint Tea', price: 50 },
    { name: 'Iced Lemon Mint Tea', price: 50 },
    { name: 'Iced Lemon Honey Tea', price: 70 },
    { name: 'Fresh Lemon Water', price: 30 },
    { name: 'Fresh Lime Soda', price: 50 },
  ],
  'Shakes & Lassis': [
    { name: 'Cold Coffee', price: 120 },
    { name: 'Chocolate Shake', price: 120 },
    { name: 'Bournvita Shake', price: 120 },
    { name: 'Oreo Shake', price: 120 },
    { name: 'Banana Shake', price: 100 },
    { name: 'Strawberry Shake', price: 120 },
    { name: 'Vanilla Shake', price: 120 },
    { name: 'Plain Lassi', price: 50 },
    { name: 'Lassi Sweet/Salted', price: 60 },
    { name: 'Banana Lassi', price: 70 },
    { name: 'Mango Lassi', price: 70 },
  ],
  'Egg Delights': [
    { name: 'Plain Omelette', price: 90, isVeg: false },
    { name: 'Masala Omelette', price: 100, isVeg: false },
    { name: 'Cheese Omelette', price: 120, isVeg: false },
    { name: 'Cheese Tomato Omelette', price: 120, isVeg: false },
    { name: 'Cheese Mushroom Omelette', price: 140, isVeg: false },
    { name: 'Scrambled Eggs', price: 120, isVeg: false },
    { name: 'Fried Eggs', price: 100, isVeg: false },
    { name: 'Poached Eggs', price: 120, isVeg: false },
    { name: 'French Toast', price: 120 },
    { name: 'Boiled Eggs', price: 90, isVeg: false },
  ],
  'Parantha': [
    { name: 'Plain Parantha', price: 50 },
    { name: 'Aloo Parantha', price: 70 },
    { name: 'Gobi Parantha', price: 80 },
    { name: 'Paneer Parantha', price: 120 },
    { name: 'Mix Veg Parantha', price: 90 },
    { name: 'Egg Parantha', price: 100, isVeg: false },
    { name: 'Chicken Keema Parantha', price: 130, isVeg: false },
    { name: 'Mint Parantha', price: 100 },
  ],
  'Toasts and Spreads': [
    { name: 'Butter Toast', price: 100 },
    { name: 'Jam Toast', price: 90 },
    { name: 'Butter Honey Toast', price: 100 },
    { name: 'Cheese Toast', price: 120 },
    { name: 'Nutella Chocolate Toast', price: 110 },
    { name: 'Peanut Butter Toast', price: 110 },
  ],
  'Soups': [
    { name: 'Tomato Soup', price: 70 },
    { name: 'Veg Clear Soup', price: 70 },
    { name: 'Veg Sweet Corn Soup', price: 70 },
    { name: 'Veg Hot and Sour Soup', price: 70 },
    { name: 'Veg Manchow Soup', price: 80 },
    { name: 'Chicken Hot and Sour Soup', price: 120, isVeg: false },
    { name: 'Chicken Manchow Soup', price: 120, isVeg: false },
  ],
  'Sandwiches & Burgers': [
    { name: 'Chicken Club Sandwich', price: 120, isVeg: false },
    { name: 'Aloo Sandwich', price: 100 },
    { name: 'Veg Sandwich', price: 100 },
    { name: 'Veg Cheese Sandwich', price: 150 },
    { name: 'Chicken Sandwich', price: 120, isVeg: false },
    { name: 'Tomato Cheese Sandwich', price: 90 },
    { name: 'Veg Club Sandwich', price: 100 },
    { name: 'Veg Burger', price: 80 },
    { name: 'Egg Sandwich', price: 90, isVeg: false },
  ],
  'Snacks': [
    { name: 'Mixed Veg Pakoda', price: 125 },
    { name: 'Paneer Pakoda', price: 160 },
    { name: 'Veg Cutlet', price: 110 },
    { name: 'Paneer Cutlet', price: 140 },
    { name: 'Peanut Masala', price: 130 },
    { name: 'Finger Chips', price: 120 },
    { name: 'Plain Papad', price: 30 },
    { name: 'Papad Masala', price: 60 },
    { name: 'Plain Maggi', price: 60 },
    { name: 'Veg Maggi', price: 90 },
    { name: 'Egg Maggi', price: 110, isVeg: false },
    { name: 'Chicken Pakoda', price: 180, isVeg: false },
    { name: 'Egg Pakoda', price: 120, isVeg: false },
    { name: 'Bread Pakoda', price: 120 },
  ],
  'Chinese': [
    { name: 'Honey Chili Potato', price: 180 },
    { name: 'Honey Chili Cauliflower', price: 180 },
    { name: 'Chili Paneer', price: 250 },
    { name: 'Chili Chicken', price: 270, isVeg: false },
    { name: 'Veg Manchurian', price: 170 },
    { name: 'Veg Noodles', price: 150 },
    { name: 'Hakka Noodles', price: 160 },
    { name: 'Egg Noodles', price: 180, isVeg: false },
    { name: 'Chicken Noodles', price: 200, isVeg: false },
    { name: 'Veg Fried Rice', price: 160 },
    { name: 'Chicken Fried Rice', price: 180, isVeg: false },
  ],
  'Indian Main Course': [
    { name: 'Dal Fry Yellow', price: 160 },
    { name: 'Dal Tadka', price: 170 },
    { name: 'Dal Makhani', price: 180 },
    { name: 'Mix Dal', price: 170 },
    { name: 'Mix Veg', price: 180 },
    { name: 'Matar Paneer', price: 190 },
    { name: 'Shahi Paneer', price: 250 },
    { name: 'Kadhai Paneer', price: 280 },
    { name: 'Paneer Butter Masala', price: 280 },
    { name: 'Paneer Do Pyaaza', price: 250 },
    { name: 'Paneer Makhani', price: 280 },
    { name: 'Paneer Bhurji', price: 200 },
    { name: 'Rajma', price: 170 },
    { name: 'Chana Masala', price: 170 },
    { name: 'Aloo Matar', price: 160 },
    { name: 'Matar Korma', price: 180 },
    { name: 'Jeera Aloo', price: 150 },
    { name: 'Butter Chicken (Half)', price: 300, isVeg: false },
    { name: 'Kadhai Chicken', price: 300, isVeg: false },
    { name: 'Lemon Chicken', price: 280, isVeg: false },
    { name: 'Masala Chicken', price: 250, isVeg: false },
    { name: 'Chicken Curry', price: 280, isVeg: false },
    { name: 'Chicken Do Pyaaza', price: 300, isVeg: false },
    { name: 'Mutton Curry', price: 400, isVeg: false },
    { name: 'Mutton Rogan Josh', price: 420, isVeg: false },
  ],
  'Indian Breads and Rice': [
    { name: 'Plain Roti', price: 20 },
    { name: 'Butter Roti', price: 30 },
    { name: 'Lachha Parantha', price: 60 },
    { name: 'Lachha Mint Spicy Parantha', price: 75 },
    { name: 'Plain Rice', price: 90 },
    { name: 'Jeera Rice', price: 120 },
    { name: 'Veg Pulao', price: 150 },
    { name: 'Matar Pulao', price: 160 },
    { name: 'Veg Biryani', price: 200 },
    { name: 'Egg Biryani', price: 220, isVeg: false },
    { name: 'Chicken Biryani', price: 250, isVeg: false },
  ],
  'Salads & Raita': [
    { name: 'Plain Curd', price: 60 },
    { name: 'Green Salad', price: 70 },
    { name: 'Cucumber Salad', price: 60 },
    { name: 'Fruit Salad', price: 120 },
    { name: 'Veg Raita', price: 90 },
    { name: 'Bundi Raita', price: 70 },
  ],
  'Thali': [
    { name: 'Veg Thali', price: 220 },
    { name: 'Chicken Thali', price: 350, isVeg: false },
  ],
};

async function getProperties(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase.from('properties').select('id, name').eq('is_active', true);
  if (error) throw error;
  return data || [];
}

async function upsertCategory(propertyId: string, name: string, sortOrder: number): Promise<string> {
  const { data, error } = await supabase
    .from('menu_categories')
    .upsert({ property_id: propertyId, name, sort_order: sortOrder, is_active: true }, { onConflict: 'property_id,name' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function ensureItem(propertyId: string, categoryId: string, item: SeedItem) {
  const { data: existing } = await supabase
    .from('menu_items')
    .select('id')
    .eq('property_id', propertyId)
    .eq('category_id', categoryId)
    .eq('name', item.name)
    .maybeSingle();
  if (existing?.id) return; // skip

  const isVeg = item.isVeg ?? inferVeg(item.name);
  const payload = {
    property_id: propertyId,
    category_id: categoryId,
    name: item.name,
    price: item.price,
    currency: 'INR',
    is_veg: isVeg,
    is_available: true,
  };
  const { error } = await supabase.from('menu_items').insert(payload);
  if (error) throw error;
}

async function seedForProperty(propertyId: string) {
  let sort = 0;
  for (const [categoryName, items] of Object.entries(CATEGORIES)) {
    const categoryId = await upsertCategory(propertyId, categoryName, sort++);
    for (const it of items) {
      await ensureItem(propertyId, categoryId, it);
    }
  }
}

async function main() {
  console.log('🍽️ Seeding menu categories and items...');
  const props = await getProperties();
  if (props.length === 0) {
    console.log('No properties found. Aborting seed.');
    return;
  }
  for (const p of props) {
    console.log(`➡️  Seeding for property: ${p.name} (${p.id})`);
    await seedForProperty(p.id);
  }
  console.log('✅ Menu seed completed.');
}

main().catch((e) => { console.error('Seed failed:', e); process.exit(1); });

