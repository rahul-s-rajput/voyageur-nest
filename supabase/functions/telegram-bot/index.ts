// Supabase Edge Function: Telegram Bot (grammY)
// Implements Story 6.1 - Foundation & Auth
// - Whitelist-based auth
// - Minimal rate limiting
// - /start command
// - /switch command (Story 6.2)
// - Webhook handler compatible with Supabase Edge Functions
//
// Environment variables (configure in Supabase project settings):
// - TELEGRAM_BOT_TOKEN (required)
// - BOT_DEFAULT_PROPERTY_ID (optional)
// - BOT_TIMEZONE (optional, default: "Asia/Kolkata")
// - AUTHORIZED_TELEGRAM_USER_IDS (optional, comma-separated numeric IDs). If absent, falls back to hardcoded list below.
// - SUPABASE_URL (required for /switch)
// - SUPABASE_SERVICE_ROLE_KEY (required for /switch)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.24.1/mod.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { parseAdultChild, composeAdultChild, formatDateInTZ, generateCalendarKeyboard, genToken, formatBookingSummary } from "./utils.ts";
import { loadWizard as stateLoadWizard, saveWizard as stateSaveWizard, clearWizard as stateClearWizard } from "./state/wizard.ts";
import { getAvailableRooms as svcGetAvailableRooms, getRoomMaxOccupancy as svcGetRoomMaxOccupancy, loadBookingById as svcLoadBookingById } from "./services/bookings.ts";
import { getActiveProperties as svcGetActiveProperties, loadLastPropertyId as svcLoadLastPropertyId, saveLastPropertyId as svcSaveLastPropertyId } from "./services/properties.ts";
import { registerCore } from "./features/core.ts";
import { registerBooking } from "./features/booking.ts";
import { registerTodayOps } from "./features/today.ts";
import { registerExpenseCapture } from "./features/expense.ts";
import { registerReport } from "./features/report.ts";
import { getBookingFinancials as svcGetBookingFinancials } from "./services/financials.ts";
import { searchMenuItems as svcSearchMenuItems, getMenuItemById as svcGetMenuItemById } from "./services/menu.ts";
import { createBookingCharge as svcCreateBookingCharge, listBookingCharges as svcListBookingCharges, voidBookingCharge as svcVoidBookingCharge } from "./services/charges.ts";
import { listBookingPayments as svcListBookingPayments, createBookingPayment as svcCreateBookingPayment, voidBookingPayment as svcVoidBookingPayment } from "./services/payments.ts";

// --- Config ---
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
if (!TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set");
}

// parseAdultChild, composeAdultChild moved to utils.ts

async function getRoomMaxOccupancy(propertyId: string, roomNo: string): Promise<number> {
  if (!supabase) return 6; // sensible fallback
  return await svcGetRoomMaxOccupancy(supabase, propertyId, roomNo);
}

async function loadBookingById(id: string): Promise<any | null> {
  if (!supabase) return null;
  return await svcLoadBookingById(supabase, id);
}

async function getBookingFinancials(propertyId: string, bookingId: string): Promise<any | null> {
  if (!supabase) return null;
  return await svcGetBookingFinancials(supabase, propertyId, bookingId);
}

async function searchMenuItems(propertyId: string, query: string, limit = 10): Promise<any[]> {
  if (!supabase) return [];
  return await svcSearchMenuItems(supabase, propertyId, query, limit);
}

async function getMenuItemById(propertyId: string, id: string): Promise<any | null> {
  if (!supabase) return null;
  return await svcGetMenuItemById(supabase, propertyId, id);
}

async function createBookingCharge(payload: any): Promise<any | null> {
  if (!supabase) return null;
  return await svcCreateBookingCharge(supabase as any, payload);
}

async function listBookingCharges(propertyId: string, bookingId: string, limit = 5, offset = 0, includeVoided = false): Promise<any[]> {
  if (!supabase) return [];
  return await svcListBookingCharges(supabase, propertyId, bookingId, limit, offset, includeVoided);
}

async function voidBookingCharge(propertyId: string, chargeId: string): Promise<void> {
  if (!supabase) return;
  await svcVoidBookingCharge(supabase, propertyId, chargeId);
}

async function listBookingPayments(propertyId: string, bookingId: string, limit = 5, offset = 0, includeVoided = false): Promise<any[]> {
  if (!supabase) return [];
  return await svcListBookingPayments(supabase, propertyId, bookingId, limit, offset, includeVoided);
}

async function createBookingPayment(payload: any): Promise<any | null> {
  if (!supabase) return null;
  return await svcCreateBookingPayment(supabase as any, payload);
}

async function voidBookingPayment(propertyId: string, paymentId: string): Promise<void> {
  if (!supabase) return;
  await svcVoidBookingPayment(supabase, propertyId, paymentId);
}

// Allow env to override whitelist; else fallback to hardcoded IDs.
const ENV_AUTH_IDS = (Deno.env.get("AUTHORIZED_TELEGRAM_USER_IDS") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => Number(s))
  .filter((n) => Number.isFinite(n));

const AUTHORIZED_TELEGRAM_USER_IDS: number[] = ENV_AUTH_IDS.length
  ? ENV_AUTH_IDS
  : [123456789, 987654321]; // TODO: update with real IDs

const BOT_TIMEZONE = Deno.env.get("BOT_TIMEZONE") ?? "Asia/Kolkata"; // IST by default
const BOT_DEFAULT_PROPERTY_ID = Deno.env.get("BOT_DEFAULT_PROPERTY_ID") ?? "";

// Supabase client (service role recommended for server-side reads)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
} else {
  console.warn(
    "Supabase URL or SERVICE_ROLE_KEY not set; /switch will be disabled until these secrets are configured."
  );
}

// --- Helpers ---
// formatDateInTZ moved to utils.ts

// Basic per-user rate limiter (in-memory, per instance)
const RATE_LIMIT_MS = 500; // drop accidental double-taps within 500ms
const lastHitByUser = new Map<number, number>();
// Track per-chat selected property (non-persistent)
const chatPropertyMap = new Map<number, string>();
// Track per-chat status message id (non-persistent)
const statusMessageMap = new Map<number, number>();

// --- Booking wizard state (DB-persisted) ---
type WizardStep = "guestName" | "checkInDate" | "checkOutDate" | "roomNo" | "adults" | "children" | "amount" | "confirm" | "modify_guest" | "modify_amount" | "modify_notes";
type WizardData = {
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

// generateCalendarKeyboard moved to utils.ts

// Get available rooms for given dates and property
async function getAvailableRooms(
  propertyId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string,
): Promise<{ roomNo: string; roomType?: string }[]> {
  if (!supabase) return [];
  return await svcGetAvailableRooms(supabase, propertyId, checkIn, checkOut, excludeBookingId);
}

async function loadWizard(chatId: number): Promise<{ step: WizardStep; data: Partial<WizardData>; user_id?: number } | null> {
  if (!supabase) return null;
  return await stateLoadWizard(supabase, chatId);
}

async function saveWizard(chatId: number, userId: number | null, step: WizardStep, data: Partial<WizardData>): Promise<void> {
  if (!supabase) return;
  await stateSaveWizard(supabase, chatId, userId, step, data);
}

async function clearWizard(chatId: number): Promise<void> {
  if (!supabase) return;
  await stateClearWizard(supabase, chatId);
}

// genToken moved to utils.ts

function parseDateRange(input: string): { checkIn: string; checkOut: string } | null {
  // Accept formats: "YYYY-MM-DD to YYYY-MM-DD" or "YYYY-MM-DD - YYYY-MM-DD"
  const m = input.trim().match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/i);
  if (!m) return null;
  const [_, ci, co] = m;
  if (ci >= co) return null;
  return { checkIn: ci, checkOut: co };
}

async function getSelectedPropertyId(ctx: any): Promise<string | null> {
  const chatId = ctx.chat?.id as number | undefined;
  if (!chatId) return null;
  let pid = chatPropertyMap.get(chatId) || "";
  if (!pid) {
    // Try to hydrate from persisted setting
    const uid = ctx.from?.id as number | undefined;
    if (uid && supabase) {
      const persisted = await loadLastPropertyId(uid);
      if (persisted) {
        chatPropertyMap.set(chatId, persisted);
        return persisted;
      }
    }
    // Fallback to default env if provided
    if (BOT_DEFAULT_PROPERTY_ID) {
      chatPropertyMap.set(chatId, BOT_DEFAULT_PROPERTY_ID);
      return BOT_DEFAULT_PROPERTY_ID;
    }
    try { await ctx.reply("Please /switch to a property first."); } catch (_) {}
    return null;
  }
  return pid;
}

type Property = { id: string; name: string };

async function getActiveProperties(): Promise<Property[]> {
  if (!supabase) return [];
  return await svcGetActiveProperties(supabase);
}

async function loadLastPropertyId(telegramUserId: number): Promise<string | null> {
  if (!supabase) return null;
  return await svcLoadLastPropertyId(supabase, telegramUserId);
}

async function saveLastPropertyId(telegramUserId: number, propertyId: string): Promise<void> {
  if (!supabase) return;
  await svcSaveLastPropertyId(supabase, telegramUserId, propertyId);
}

// --- Bot Setup ---
const bot = new Bot(TELEGRAM_BOT_TOKEN);

// Register bot commands so Telegram shows them in clients' auto-suggest
const BASE_COMMANDS = [
  { command: "start", description: "Welcome and help" },
  { command: "switch", description: "Switch active property" },
  { command: "book", description: "Start booking wizard" },
  { command: "booking", description: "Show a booking by ID" },
  { command: "today", description: "Today's ops: check-ins/outs" },
  { command: "expense", description: "Capture an expense" },
  { command: "report", description: "Quick KPIs for current property" },
  { command: "ping", description: "Health check" },
];

async function registerBotCommands() {
  try {
    // Default scope
    await bot.api.setMyCommands(BASE_COMMANDS);
    // Private chats
    await bot.api.setMyCommands(BASE_COMMANDS, { scope: { type: "all_private_chats" } as any });
    // Groups/supergroups (if the bot is used there too)
    await bot.api.setMyCommands(BASE_COMMANDS, { scope: { type: "all_group_chats" } as any });
  } catch (e) {
    console.warn("setMyCommands failed:", e);
  }
}

// Attempt registration at cold start (executes on first request warm-up)
registerBotCommands();

// Whitelist auth middleware
bot.use(async (ctx, next) => {
  const uid = ctx.from?.id as number | undefined;
  const isBot = Boolean(ctx.from?.is_bot);
  // Service/bot updates (pin/edit/system) should never trigger auth reply
  const isServiceUpdate =
    isBot ||
    !uid ||
    Boolean((ctx as any).message?.pinned_message) ||
    Boolean((ctx as any).editedMessage) ||
    Boolean((ctx as any).myChatMember) ||
    Boolean((ctx as any).chatMember);

  if (isServiceUpdate) {
    await next();
    return;
  }
  if (!AUTHORIZED_TELEGRAM_USER_IDS.includes(uid)) {
    try { await ctx.reply("⛔ Unauthorized access. Contact admin."); } catch (_) {}
    return;
  }
  await next();
});

// Register feature modules (refactor)
registerCore(bot, {
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
});

registerBooking(bot, {
  supabase,
  BOT_TIMEZONE,
  generateCalendarKeyboard,
  formatDateInTZ,
  parseAdultChild,
  composeAdultChild,
  genToken,
  getAvailableRooms,
  getRoomMaxOccupancy,
  loadBookingById,
  loadWizard,
  saveWizard,
  clearWizard,
  getSelectedPropertyId,
  formatBookingSummary,
  getBookingFinancials,
  searchMenuItems,
  getMenuItemById,
  createBookingCharge,
  listBookingCharges,
  voidBookingCharge,
  listBookingPayments,
  createBookingPayment,
  voidBookingPayment,
});

registerTodayOps(bot, {
  supabase,
  BOT_TIMEZONE,
  formatDateInTZ,
  getSelectedPropertyId,
});

registerReport(bot, {
  supabase,
  BOT_TIMEZONE,
  formatDateInTZ,
  getSelectedPropertyId,
});

registerExpenseCapture(bot, {
  supabase,
  BOT_TIMEZONE,
  formatDateInTZ,
  getSelectedPropertyId,
  loadWizard,
  saveWizard,
  clearWizard,
});

// Minimal rate limiter middleware
bot.use(async (ctx, next) => {
  const uid = ctx.from?.id;
  const chatId = ctx.chat?.id as number | undefined;
  // Determine update type
  const isCallback = Boolean((ctx as any).callbackQuery);
  const isText = typeof ctx.message?.text === "string";
  const isCommand = isText && ctx.message!.text!.trim().startsWith("/");
  // Always bypass for callback queries to avoid UX stalls on inline buttons
  if (isCallback) {
    await next();
    return;
  }
  let hasWizard = false;
  if (chatId) {
    try {
      const st = await loadWizard(chatId);
      hasWizard = Boolean(st);
    } catch (_) {}
  }
  // Bypass rate limit for non-command text or when wizard is active
  const shouldBypass = (isText && !isCommand) || hasWizard;
  if (uid && !shouldBypass) {
    const now = Date.now();
    const last = lastHitByUser.get(uid) ?? 0;
    if (now - last < RATE_LIMIT_MS) {
      // Silently drop fast double-taps on commands/callbacks
      return;
    }
    lastHitByUser.set(uid, now);
  }
  await next();
});

 

// --- Webhook handler ---
const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req) => {
  try {
    if (req.method === "POST") {
      return await handleUpdate(req);
    }
    // Health/diagnostic endpoint
    return new Response("OK", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("telegram-bot error:", err);
    return new Response("Error", { status: 500 });
  }
});
