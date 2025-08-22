import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type Property = { id: string; name: string };

export async function getActiveProperties(supabase: SupabaseClient): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id,name")
    .eq("is_active", true)
    .order("name");
  if (error) {
    console.error("Failed to fetch properties:", error);
    return [];
  }
  return data ?? [];
}

export async function loadLastPropertyId(
  supabase: SupabaseClient,
  telegramUserId: number
): Promise<string | null> {
  const { data, error } = await supabase
    .from("bot_user_settings")
    .select("last_property_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  if (error) {
    console.warn("loadLastPropertyId error:", error);
    return null;
  }
  return (data as any)?.last_property_id ?? null;
}

export async function saveLastPropertyId(
  supabase: SupabaseClient,
  telegramUserId: number,
  propertyId: string
): Promise<void> {
  const { error } = await supabase
    .from("bot_user_settings")
    .upsert({ telegram_user_id: telegramUserId, last_property_id: propertyId });
  if (error) console.warn("saveLastPropertyId error:", error);
}
