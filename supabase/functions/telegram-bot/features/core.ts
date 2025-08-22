import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Bot } from "https://deno.land/x/grammy@v1.24.1/mod.ts";
import { loadStatusMessageId, saveStatusMessageId } from "../services/settings.ts";

export type Property = { id: string; name: string };

export type CoreDeps = {
  BASE_COMMANDS: { command: string; description: string }[];
  registerBotCommands: () => Promise<void>;
  supabase: any | null;
  BOT_DEFAULT_PROPERTY_ID: string;
  BOT_TIMEZONE: string;
  formatDateInTZ: (d: Date, tz: string) => string;
  loadLastPropertyId: (telegramUserId: number) => Promise<string | null>;
  getActiveProperties: () => Promise<Property[]>;
  saveLastPropertyId: (telegramUserId: number, propertyId: string) => Promise<void>;
  chatPropertyMap: Map<number, string>;
  statusMessageMap: Map<number, number>;
};

export function registerCore(bot: Bot, deps: CoreDeps) {
  const {
    BASE_COMMANDS,
    registerBotCommands,
    supabase,
    BOT_DEFAULT_PROPERTY_ID,
    BOT_TIMEZONE,
    formatDateInTZ,
    loadLastPropertyId,
    getActiveProperties,
    saveLastPropertyId,
    chatPropertyMap,
    statusMessageMap,
  } = deps;

  async function upsertStatusMessage(ctx: any) {
    const chatId = ctx.chat?.id as number | undefined;
    if (!chatId) return;
    let pid = chatPropertyMap.get(chatId) || "";
    const today = formatDateInTZ(new Date(), BOT_TIMEZONE);
    let name = "";
    if (pid && supabase) {
      try {
        const { data: prop } = await supabase.from("properties").select("name").eq("id", pid).single();
        name = prop?.name ?? "";
      } catch (_) {}
    }
    const title = name || (pid ? `ID ${pid}` : "None");
    const text = [
      `🏨 Active property: ${title}`,
      `⏱️ Timezone: ${BOT_TIMEZONE}`,
      `📅 Today: ${today}`,
    ].join("\n");

    // Try in-memory first, then DB for cold starts
    let existingId = statusMessageMap.get(chatId) || null;
    if (!existingId && supabase) {
      try {
        const mid = await loadStatusMessageId(supabase, chatId);
        if (mid) {
          existingId = mid;
          statusMessageMap.set(chatId, mid);
        }
      } catch (_) {}
    }
    if (existingId) {
      try {
        await ctx.api.editMessageText(chatId, existingId, text);
        return;
      } catch (_) {
        // fall through to send new
      }
    }
    try {
      const msg = await ctx.api.sendMessage(chatId, text);
      statusMessageMap.set(chatId, (msg as any).message_id);
      if (supabase) {
        try { await saveStatusMessageId(supabase, chatId, (msg as any).message_id); } catch (_) {}
      }
      try { await ctx.api.pinChatMessage(chatId, (msg as any).message_id, { disable_notification: true } as any); } catch (_) {}
    } catch (_) {}
  }

  // /start command
  bot.command("start", async (ctx) => {
    const tz = BOT_TIMEZONE;
    const today = formatDateInTZ(new Date(), tz);
    const chatId = ctx.chat?.id as number | undefined;
    const uid = ctx.from?.id as number | undefined;

    if (chatId) {
      if (uid) {
        const persisted = await loadLastPropertyId(uid);
        if (persisted) {
          chatPropertyMap.set(chatId, persisted);
        } else if (BOT_DEFAULT_PROPERTY_ID && !chatPropertyMap.has(chatId)) {
          chatPropertyMap.set(chatId, BOT_DEFAULT_PROPERTY_ID);
        }
      } else if (BOT_DEFAULT_PROPERTY_ID && !chatPropertyMap.has(chatId)) {
        chatPropertyMap.set(chatId, BOT_DEFAULT_PROPERTY_ID);
      }
    }

    // Ensure persistent status message exists/updated and pinned
    await upsertStatusMessage(ctx);

    const lines = [
      "Welcome 👋",
      "Commands:",
      "/switch - choose property",
      "/today - check-ins/check-outs/dues",
      "/book - quick booking",
      "/expense - capture expense",
      "/report - quick KPIs",
      "",
      `Timezone: ${tz} | Today: ${today}`,
    ];
    await ctx.reply(lines.join("\n"));
  });

  // Health
  bot.command("ping", (ctx) => ctx.reply("pong"));

  // Local command list
  bot.command("commands", async (ctx) => {
    const list = BASE_COMMANDS.map((c) => `/${c.command} - ${c.description}`).join("\n");
    await ctx.reply(list || "No commands configured.");
  });

  // Refresh commands
  bot.command("refresh_commands", async (ctx) => {
    await registerBotCommands();
    try {
      const [def, priv, grp, chat] = await Promise.all([
        bot.api.getMyCommands(),
        bot.api.getMyCommands({ scope: { type: "all_private_chats" } as any }),
        bot.api.getMyCommands({ scope: { type: "all_group_chats" } as any }),
        bot.api.getMyCommands({ scope: { type: "chat", chat_id: (ctx.chat as any)?.id } as any }),
      ]);
      const fmt = (arr: any[]) => arr.map((c) => `/${c.command}`).join(", ") || "(none)";
      const msg = [
        "Commands refreshed ✅",
        `Default: ${fmt(def)}`,
        `Private: ${fmt(priv)}`,
        `Groups: ${fmt(grp)}`,
        `This chat: ${fmt(chat)}`,
        "Tip: In Telegram, tap the menu button or type '/' to see suggestions. You may need to close/reopen the chat to refresh cache.",
      ].join("\n");
      await ctx.reply(msg);
    } catch (e) {
      await ctx.reply(`Refreshed, but couldn't read back commands: ${e}`);
    }
  });

  // /switch command (inline keyboard of active properties)
  bot.command("switch", async (ctx) => {
    const props = await getActiveProperties();
    if (!props.length) {
      await ctx.reply("No active properties found.");
      return;
    }
    const rows = props.map((p) => [{ text: p.name, callback_data: `prop:${p.id}` }]);
    await ctx.reply("Select property:", { reply_markup: { inline_keyboard: rows } });
  });

  // Property selection callback
  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery?.data ?? "";
    if (!data.startsWith("prop:")) return await next();

    const pid = data.slice(5);
    const chatId = ctx.chat?.id as number | undefined;
    if (chatId) chatPropertyMap.set(chatId, pid);
    const uid = ctx.from?.id as number | undefined;
    if (uid) {
      await saveLastPropertyId(uid, pid);
    }

    try {
      await ctx.answerCallbackQuery({ text: "Property updated" });
    } catch (_) {}

    // Update pinned status message for this chat
    await upsertStatusMessage(ctx);

    try {
      let name = "";
      if (supabase) {
        const { data: prop } = await supabase
          .from("properties")
          .select("name")
          .eq("id", pid)
          .single();
        name = prop?.name ?? "";
      }
      await ctx.editMessageText(name ? `Property set to: ${name} ✓` : `Property set ✓`);
    } catch (_) {
      await ctx.reply("Property set ✓");
    }
  });
}
