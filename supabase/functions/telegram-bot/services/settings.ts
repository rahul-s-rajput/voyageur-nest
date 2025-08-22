import "jsr:@supabase/functions-js/edge-runtime.d.ts";

export async function loadStatusMessageId(supabase: any, chatId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from("bot_chat_settings")
    .select("status_message_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (error) return null;
  const id = (data?.status_message_id ?? null);
  return typeof id === "number" ? id : (id ? Number(id) : null);
}

export async function saveStatusMessageId(supabase: any, chatId: number, messageId: number): Promise<void> {
  await supabase
    .from("bot_chat_settings")
    .upsert({ chat_id: chatId, status_message_id: messageId }, { onConflict: "chat_id" });
}
