import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type WizardStep =
  | "guestName"
  | "checkInDate"
  | "checkOutDate"
  | "roomNo"
  | "adults"
  | "children"
  | "amount"
  | "confirm"
  | "modify_guest"
  | "modify_amount"
  | "modify_notes";

export type WizardData = {
  propertyId: string;
  guestName: string;
  roomNo: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number;
  children: number;
  amount: number;
  token?: string; // for confirm callbacks
};

export async function loadWizard(
  supabase: SupabaseClient,
  chatId: number
): Promise<{ step: WizardStep; data: Partial<WizardData>; user_id?: number } | null> {
  const { data } = await supabase
    .from("bot_wizard_state")
    .select("step, data, user_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (!data) return null;
  return {
    step: (data as any).step as WizardStep,
    data: (((data as any).data || {}) as Partial<WizardData>),
    user_id: (data as any).user_id,
  } as any;
}

export async function saveWizard(
  supabase: SupabaseClient,
  chatId: number,
  userId: number | null,
  step: WizardStep,
  data: Partial<WizardData>
): Promise<void> {
  await supabase
    .from("bot_wizard_state")
    .upsert({ chat_id: chatId, user_id: userId ?? null, step, data });
}

export async function clearWizard(
  supabase: SupabaseClient,
  chatId: number
): Promise<void> {
  await supabase
    .from("bot_wizard_state")
    .delete()
    .eq("chat_id", chatId);
}
