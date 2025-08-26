import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type MenuItem = {
  id: string;
  property_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string | null;
  is_available: boolean;
  is_veg: boolean | null;
};

export async function searchMenuItems(
  supabase: SupabaseClient,
  propertyId: string,
  query: string,
  limit = 10,
): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, property_id, category_id, name, description, price, currency, is_available, is_veg")
    .eq("property_id", propertyId)
    .ilike("name", `%${query}%`)
    .order("name", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data || []) as MenuItem[];
}

export async function getMenuItemById(
  supabase: SupabaseClient,
  propertyId: string,
  id: string,
): Promise<MenuItem | null> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, property_id, category_id, name, description, price, currency, is_available, is_veg")
    .eq("property_id", propertyId)
    .eq("id", id)
    .single();
  if (error) throw error;
  return (data || null) as MenuItem | null;
}
