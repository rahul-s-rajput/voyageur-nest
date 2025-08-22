import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore Remote import for Deno Edge runtime; local TS may not resolve types
import { Bot, InlineKeyboard } from "https://deno.land/x/grammy@v1.24.1/mod.ts";
import { extractFromReceipt } from "../lib/receipt-extractor.ts";
// Local TS in Node context may not know Deno types; declare to satisfy lints.
declare const Deno: any;

export type ExpenseDeps = {
  supabase: any | null;
  BOT_TIMEZONE: string;
  formatDateInTZ: (d: Date, tz: string) => string;
  getSelectedPropertyId: (ctx: any) => Promise<string | null>;
  loadWizard: (chatId: number) => Promise<any | null>;
  saveWizard: (chatId: number, userId: number | null, step: any, data: any) => Promise<void>;
  clearWizard: (chatId: number) => Promise<void>;
};

// Wizard step identifiers (kept local to avoid cross-feature type coupling)
const STEP_MODE = "exp_mode";
const STEP_CATEGORY = "exp_category";
const STEP_AMOUNT = "exp_amount";
const STEP_VENDOR = "exp_vendor";
const STEP_DATE = "exp_date";
const STEP_CURRENCY = "exp_currency";
const STEP_ITEMS = "exp_items";
const STEP_RECEIPT = "exp_receipt"; // manual flow optional receipt
const STEP_RECEIPT_WAIT = "exp_receipt_wait"; // receipt mode
const STEP_SUMMARY = "exp_summary";
// Item add mini-wizard steps
const STEP_ITEM_NAME = "exp_item_name";
const STEP_ITEM_QTY = "exp_item_qty";
const STEP_ITEM_PRICE = "exp_item_price";
const STEP_ITEM_EDIT = "exp_item_edit";

// Category picker config
const CATS_PAGE_SIZE = 12; // 4 rows x 3 cols

async function fetchCategoriesForProperty(supabase: any, propertyId: string): Promise<{ id: string; name: string }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id,name")
    .or(`property_id.eq.${propertyId},property_id.is.null`)
    .order("name", { ascending: true })
    .limit(300);
  if (error || !Array.isArray(data)) return [];
  // De-duplicate by name (keep first), but keep IDs for callback
  const seen = new Set<string>();
  const out: { id: string; name: string }[] = [];
  for (const r of data) {
    const nm = String(r.name || "").trim();
    if (!nm || seen.has(nm.toLowerCase())) continue;
    seen.add(nm.toLowerCase());
    out.push({ id: String(r.id), name: nm });
  }
  return out;
}

function buildCategoryKeyboard(cats: { id: string; name: string }[], page: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  const total = cats.length;
  const pages = Math.max(1, Math.ceil(total / CATS_PAGE_SIZE));
  const p = Math.min(Math.max(0, page), pages - 1);
  const start = p * CATS_PAGE_SIZE;
  const end = Math.min(total, start + CATS_PAGE_SIZE);
  const slice = cats.slice(start, end);
  // 3 per row
  for (let i = 0; i < slice.length; i += 3) {
    const row = slice.slice(i, i + 3);
    for (const c of row) {
      const label = c.name.length > 20 ? c.name.slice(0, 19) + "…" : c.name;
      kb.text(label, `exp_cat:${c.id}`);
    }
    if (i + 3 < slice.length) kb.row();
  }
  // Nav row
  kb.row();
  if (pages > 1) {
    if (p > 0) kb.text("⬅️ Prev", `exp_cat_page:${p - 1}`);
    kb.text(`Page ${p + 1}/${pages}`, `exp_cat_page:${p}`);
    if (p < pages - 1) kb.text("Next ➡️", `exp_cat_page:${p + 1}`);
  }
  // Skip/Other
  kb.row().text("No Category", "exp_cat_skip");
  return kb;
}

function itemsMenuKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text("➕ Add item", "exp_items_add")
    .text("🧾 List", "exp_items_list")
    .row()
    .text("↩️ Undo", "exp_items_undo")
    .text("✅ Done", "exp_items_done")
    .row()
    .text("Use total as single line", "exp_items_use_total");
  return kb;
}

function buildItemsManageKeyboard(items: any[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  const max = Math.min(items.length, 10);
  for (let i = 0; i < max; i++) {
    const idx = i;
    const labelNum = `${i + 1}`;
    kb.text(`✏️ ${labelNum}`, `exp_item_edit:${idx}`).text(`🗑 ${labelNum}`, `exp_item_del:${idx}`).row();
  }
  kb.text("⬅️ Back", "exp_items_back");
  return kb;
}

export function registerExpenseCapture(bot: Bot, deps: ExpenseDeps) {
  const { supabase, BOT_TIMEZONE, formatDateInTZ, getSelectedPropertyId, loadWizard, saveWizard, clearWizard } = deps;

  function parseAmount(text: string): number | null {
    const v = Number((text || "").replace(/[^0-9.\-]/g, ""));
    if (!Number.isFinite(v) || v <= 0) return null;
    return Math.round(v * 100) / 100;
  }

  function isValidISODate(d: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(d || "");
  }

  async function finalizeAndCreate(ctx: any) {
    if (!supabase) { await ctx.reply("Database not configured."); return; }
    const chatId = ctx.chat?.id as number | undefined; if (!chatId) return;
    const state = await loadWizard(chatId); if (!state) return;
    const d = state.data || {};
    // Resolve category name to ID (prefer property-specific over template)
    let categoryId: string | null = d.categoryId || null;
    const catNameRaw = (d.categoryName || "").toString().trim();
    if (!categoryId && catNameRaw) {
      try {
        const { data: propCat } = await supabase
          .from("expense_categories")
          .select("id")
          .eq("property_id", d.propertyId)
          .ilike("name", catNameRaw)
          .limit(1);
        if (propCat && propCat[0]?.id) {
          categoryId = propCat[0].id;
        } else {
          const { data: tmplCat } = await supabase
            .from("expense_categories")
            .select("id")
            .is("property_id", null as any)
            .ilike("name", catNameRaw)
            .limit(1);
          if (tmplCat && tmplCat[0]?.id) categoryId = tmplCat[0].id;
        }
      } catch (_) {
        // ignore lookup failures; treat as uncategorized
      }
    }
    if (!d.propertyId) { await ctx.reply("Property not set. Use /switch and try again."); return; }
    if (!d.amount || Number(d.amount) <= 0) { await ctx.reply("Amount is missing. Please enter a valid amount."); return; }

    const payload: any = {
      property_id: d.propertyId,
      amount: Number(d.amount || 0),
      expense_date: d.expenseDate || formatDateInTZ(new Date(), BOT_TIMEZONE),
      currency: (d.currency || "INR").toUpperCase(),
      category_id: categoryId,
      receipt_path: d.receiptPath || null,
      approval_status: "pending",
      notes: d.notes || null,
      vendor: d.vendor || null,
      payment_method: d.paymentMethod || null,
    };
    try {
      const { data, error } = await supabase.from("expenses").insert(payload).select("id").single();
      if (error) { await ctx.reply(`Failed to save expense. ${error.message}`); return; }
      const expenseId = data.id as string;

      // Save line items if present
      const items = Array.isArray(d.items) ? d.items : [];
      if (items.length > 0) {
        const payloadItems = items.map((i: any) => ({
          expense_id: expenseId,
          description: String(i.description || "").slice(0, 300),
          quantity: typeof i.quantity === "number" ? i.quantity : 1,
          unit_amount: typeof i.unit_amount === "number" ? i.unit_amount : 0,
          tax_amount: typeof i.tax_amount === "number" ? i.tax_amount : null,
          line_total: typeof i.line_total === "number" ? i.line_total : ((typeof i.quantity === "number" ? i.quantity : 1) * (typeof i.unit_amount === "number" ? i.unit_amount : 0)),
        }));
        const { error: liErr } = await supabase.from("expense_line_items").insert(payloadItems);
        if (liErr) { await ctx.reply(`Saved expense but failed items: ${liErr.message}`); }
      }

      // Default share: 100% to active property
      const shareRow = { expense_id: expenseId, property_id: d.propertyId, share_percent: 100, share_amount: null };
      const { error: shareErr } = await supabase.from("expense_shares").insert(shareRow as any);
      if (shareErr) {
        await ctx.reply(`Saved expense but failed default share: ${shareErr.message}`);
      }

      await clearWizard(chatId);
      await ctx.reply(`Expense recorded ✓ ID: ${expenseId}`);
    } catch (e: any) {
      await ctx.reply(`Failed to save expense. ${e?.message ?? e ?? ""}`.trim());
    }
  }

  // /expense command
  bot.command("expense", async (ctx) => {
    const pid = await getSelectedPropertyId(ctx);
    if (!pid) return; // message already sent by helper
    const chatId = ctx.chat?.id as number | undefined; if (!chatId) return;
    await saveWizard(chatId, ctx.from?.id ?? null, STEP_MODE as any, { propertyId: pid, items: [] });
    const kb = new InlineKeyboard()
      .text("Manual Entry", "exp_mode:manual").text("From Receipt", "exp_mode:receipt");
    await ctx.reply("How would you like to add the expense?", { reply_markup: kb });
    await ctx.reply("You can /cancel at any time.");
  });

  // Allow cancelling the expense wizard
  bot.command("cancel", async (ctx) => {
    const chatId = ctx.chat?.id as number | undefined; if (!chatId) return;
    const st = await loadWizard(chatId);
    if (st && String(st.step || "").startsWith("exp_")) {
      await clearWizard(chatId);
      await ctx.reply("Expense wizard cancelled.");
    }
  });

  // Handle callback queries (mode selection, confirmation)
  bot.on("callback_query:data", async (ctx, next) => {
    const chatId = ctx.chat?.id as number | undefined;
    if (!chatId) return await next();
    const data = String(ctx.callbackQuery?.data || "");
    const st = await loadWizard(chatId);
    if (!st || !String(st.step || "").startsWith("exp_")) return await next();

    if (data.startsWith("exp_mode:")) {
      const mode = data.split(":")[1];
      if (mode === "manual") {
        await saveWizard(chatId, ctx.from?.id ?? null, STEP_CATEGORY as any, { ...(st.data || {}), mode: "manual" });
        try {
          const cats = await fetchCategoriesForProperty(supabase, (st.data || {}).propertyId);
          const kb = buildCategoryKeyboard(cats, 0);
          await ctx.editMessageText("Choose a category or type one (or /skip):", { reply_markup: kb });
        } catch {
          await ctx.editMessageText("Enter category name (optional) or /skip:").catch(() => {});
        }
      } else if (mode === "receipt") {
        await saveWizard(chatId, ctx.from?.id ?? null, STEP_RECEIPT_WAIT as any, { ...(st.data || {}), mode: "receipt" });
        await ctx.editMessageText("Send receipt photo now to extract details.").catch(() => {});
      }
      await ctx.answerCallbackQuery();
      return;
    }

    // Category picker pagination
    if (data.startsWith("exp_cat_page:")) {
      const page = Number(data.split(":")[1] || 0) || 0;
      try {
        const cats = await fetchCategoriesForProperty(supabase, (st.data || {}).propertyId);
        const kb = buildCategoryKeyboard(cats, page);
        await ctx.editMessageText("Choose a category or type one (or /skip):", { reply_markup: kb });
      } catch (e) {
        console.warn("[expense] category page render error", e);
      }
      await ctx.answerCallbackQuery();
      return;
    }

    // Category skip
    if (data === "exp_cat_skip") {
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_AMOUNT as any, { ...(st.data || {}), categoryId: null, categoryName: null });
      await ctx.answerCallbackQuery();
      await ctx.reply("Enter total amount (e.g., 123.45):");
      return;
    }

    // Category selected
    if (data.startsWith("exp_cat:")) {
      const catId = data.split(":")[1];
      try {
        let catName: string | null = null;
        if (supabase && catId) {
          const { data: row } = await supabase.from("expense_categories").select("name").eq("id", catId).limit(1).maybeSingle();
          catName = row?.name || null;
        }
        await saveWizard(chatId, ctx.from?.id ?? null, STEP_AMOUNT as any, { ...(st.data || {}), categoryId: catId, categoryName: catName });
        await ctx.answerCallbackQuery();
        await ctx.reply("Enter total amount (e.g., 123.45):");
      } catch (e) {
        console.warn("[expense] category select error", e);
      }
      return;
    }

    // Items menu actions
    if (data === "exp_items_add") {
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEM_NAME as any, { ...(st.data || {}) });
      await ctx.answerCallbackQuery();
      await ctx.reply("Item name? (e.g., Bread)");
      return;
    }
    if (data === "exp_items_list") {
      const items = Array.isArray(st.data?.items) ? st.data.items : [];
      if (!items.length) {
        await ctx.answerCallbackQuery();
        await ctx.reply("No items yet. Use ➕ Add item, or type 'name | qty | unit_price'.");
        return;
      }
      const lines = items.map((i: any, idx: number) => `${idx + 1}. ${i.description} • ${i.quantity} × ${i.unit_amount} = ${Number(i.line_total || (i.quantity * i.unit_amount)).toFixed(2)}`);
      await ctx.answerCallbackQuery();
      await ctx.reply(["Items:", ...lines].join("\n"), { reply_markup: buildItemsManageKeyboard(items) });
      return;
    }
    if (data === "exp_items_undo") {
      const items = Array.isArray(st.data?.items) ? st.data.items.slice(0, -1) : [];
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEMS as any, { ...(st.data || {}), items });
      await ctx.answerCallbackQuery();
      await ctx.reply("Removed last item. Add another or tap ✅ Done.", { reply_markup: itemsMenuKeyboard() });
      return;
    }
    if (data === "exp_items_use_total") {
      const amt = Number(st.data?.amount || 0) || 0;
      const desc = st.data?.vendor ? String(st.data.vendor) : "Expense";
      const newItems = amt > 0 ? [{ description: desc, quantity: 1, unit_amount: amt, line_total: amt }] : [];
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEMS as any, { ...(st.data || {}), items: newItems });
      await ctx.answerCallbackQuery();
      if (newItems.length) {
        await ctx.reply(`Added single item: ${desc} • 1 × ${amt}.`, { reply_markup: itemsMenuKeyboard() });
      } else {
        await ctx.reply("Amount not set yet. Please enter amount first.", { reply_markup: itemsMenuKeyboard() });
      }
      return;
    }
    if (data === "exp_items_done") {
      await ctx.answerCallbackQuery();
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_RECEIPT as any, { ...(st.data || {}) });
      await ctx.reply("Send receipt photo now, or /skip to continue without photo.");
      return;
    }

    if (data === "exp_items_back") {
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEMS as any, { ...(st.data || {}) });
      await ctx.answerCallbackQuery();
      await ctx.reply("Back to items.", { reply_markup: itemsMenuKeyboard() });
      return;
    }

    if (data.startsWith("exp_item_del:")) {
      const idx = Number(data.split(":")[1] || "-1");
      const items = Array.isArray(st.data?.items) ? st.data.items.slice() : [];
      if (idx >= 0 && idx < items.length) items.splice(idx, 1);
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEMS as any, { ...(st.data || {}), items });
      await ctx.answerCallbackQuery();
      await ctx.reply(`Deleted item #${idx + 1}.`, { reply_markup: itemsMenuKeyboard() });
      return;
    }

    if (data.startsWith("exp_item_edit:")) {
      const idx = Number(data.split(":")[1] || "-1");
      const items = Array.isArray(st.data?.items) ? st.data.items : [];
      if (idx < 0 || idx >= items.length) {
        await ctx.answerCallbackQuery();
        await ctx.reply("Invalid item index.", { reply_markup: itemsMenuKeyboard() });
        return;
      }
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEM_EDIT as any, { ...(st.data || {}), editIndex: idx });
      await ctx.answerCallbackQuery();
      await ctx.reply("Send updated item as 'name | qty | unit' or 'name 2x45.5' or 'name 45.5'. /skip to cancel.");
      return;
    }

    // Item qty quick-pick
    if (data.startsWith("exp_item_qty:")) {
      const qty = Number(data.split(":")[1] || "1") || 1;
      const ni = { ...((st.data || {}).newItem || {}), quantity: qty };
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEM_PRICE as any, { ...(st.data || {}), newItem: ni });
      const kb = new InlineKeyboard().text("Use remaining", "exp_item_price_remaining").text("Custom", "exp_item_price_custom");
      await ctx.answerCallbackQuery();
      await ctx.reply(`Unit price for '${ni.description}'?`, { reply_markup: kb });
      return;
    }
    if (data === "exp_item_price_remaining") {
      const items = Array.isArray(st.data?.items) ? st.data.items : [];
      const itemsTotal = items.reduce((s: number, i: any) => s + (Number(i.line_total || ((i.quantity||1)*(i.unit_amount||0))) || 0), 0);
      const remaining = Math.max(0, Number(st.data?.amount || 0) - itemsTotal);
      const ni = { ...((st.data || {}).newItem || {}) } as any;
      const unit = remaining > 0 ? remaining / (Number(ni.quantity || 1) || 1) : 0;
      const newItem = { description: ni.description || "Item", quantity: Number(ni.quantity || 1), unit_amount: Math.round(unit * 100) / 100, line_total: Math.round((unit * (Number(ni.quantity || 1))) * 100) / 100 };
      const newItems = [...items, newItem];
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEMS as any, { ...(st.data || {}), items: newItems, newItem: null });
      await ctx.answerCallbackQuery();
      await ctx.reply(`Added: ${newItem.description} • ${newItem.quantity} × ${newItem.unit_amount}.`, { reply_markup: itemsMenuKeyboard() });
      return;
    }
    if (data === "exp_item_price_custom") {
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEM_PRICE as any, { ...(st.data || {}) });
      await ctx.answerCallbackQuery();
      await ctx.reply("Enter unit price (number), or /skip to use 0:");
      return;
    }

    if (data === "exp_confirm_save") {
      await ctx.answerCallbackQuery();
      await finalizeAndCreate(ctx);
      return;
    }

    await next();
  });

  // Handle text inputs for wizard steps
  bot.on("message:text", async (ctx, next) => {
    const chatId = ctx.chat?.id as number | undefined;
    if (!chatId) return await next();
    const st = await loadWizard(chatId);
    if (!st || !String(st.step || "").startsWith("exp_")) return await next();

    const text = (ctx.message?.text || "").trim();

    if (st.step === STEP_CATEGORY) {
      const categoryText = text.toLowerCase() === "/skip" ? "" : text;
      const nextData = { ...(st.data || {}), categoryName: categoryText || null };
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_AMOUNT as any, nextData);
      await ctx.reply("Enter total amount (e.g., 123.45):");
      return;
    }

    if (st.step === STEP_AMOUNT) {
      const amt = parseAmount(text);
      if (amt == null) { await ctx.reply("Please enter a valid amount (e.g., 250 or 250.75)"); return; }
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_VENDOR as any, { ...(st.data || {}), amount: amt });
      await ctx.reply("Enter vendor (optional) or /skip:");
      return;
    }

    if (st.step === STEP_VENDOR) {
      const vendor = text.toLowerCase() === "/skip" ? null : text;
      const today = formatDateInTZ(new Date(), BOT_TIMEZONE);
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_DATE as any, { ...(st.data || {}), vendor });
      await ctx.reply(`Enter date YYYY-MM-DD or /skip (default ${today}).`);
      return;
    }

    if (st.step === STEP_DATE) {
      const today = formatDateInTZ(new Date(), BOT_TIMEZONE);
      let iso = (text || "").trim().toLowerCase();
      if (iso === "/skip") iso = today;
      if (!isValidISODate(iso)) { await ctx.reply("Please enter date in YYYY-MM-DD or /skip"); return; }
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEMS as any, { ...(st.data || {}), expenseDate: iso, currency: (st.data?.currency || "INR"), items: Array.isArray((st.data||{}).items) ? (st.data||{}).items : [] });
      await ctx.reply("Add items. You can:\n- Tap ➕ Add item for guided entry\n- Type 'Bread 2x45.50' or 'Bread | 2 | 45.50'\n- Tap 'Use total as single line'\nSend /done when finished.", { reply_markup: itemsMenuKeyboard() });
      return;
    }

    

    if (st.step === STEP_ITEMS) {
      if (text.toLowerCase() === "/done") {
        await saveWizard(chatId, ctx.from?.id ?? null, STEP_RECEIPT as any, { ...(st.data || {}) });
        await ctx.reply("Send receipt photo now, or /skip to continue without photo.");
        return;
      }
      // Flexible parse: support 'name | qty | unit', 'name 2x45.5', 'name 45.5', or just a number
      let name = ""; let qty: number | null = null; let unit: number | null = null;
      if (text.includes("|")) {
        const parts = text.split("|").map(s => s.trim());
        name = parts[0] || "Item";
        qty = parts[1] ? Number(parts[1]) : 1;
        unit = parts[2] ? Number(parts[2]) : 0;
      } else {
        const m = text.match(/^(.*?)(?:\s+(\d+(?:\.\d+)?)\s*[x×@]\s*(\d+(?:\.\d+)?))\s*$/i);
        if (m) {
          name = (m[1] || "Item").trim() || "Item";
          qty = Number(m[2] || "1");
          unit = Number(m[3] || "0");
        } else {
          const tokens = text.split(/\s+/);
          const last = tokens[tokens.length - 1];
          const maybePrice = Number(last);
          if (Number.isFinite(maybePrice)) {
            unit = maybePrice;
            name = tokens.slice(0, -1).join(" ").trim() || "Item";
            qty = 1;
          } else if (Number.isFinite(Number(text))) {
            // Just a number -> price only
            unit = Number(text);
            qty = 1; name = "Item";
          } else {
            // Only name
            name = text; qty = 1; unit = 0;
          }
        }
      }
      if (!Number.isFinite(qty as number) || !Number.isFinite(unit as number)) { await ctx.reply("Couldn't parse. Try 'Bread 2x45.5' or 'Bread | 2 | 45.50'."); return; }
      const newItem = { description: name, quantity: (qty as number) || 1, unit_amount: (unit as number) || 0, line_total: ((qty as number) || 1) * ((unit as number) || 0) };
      const items = Array.isArray(st.data?.items) ? [...st.data.items, newItem] : [newItem];
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEMS as any, { ...(st.data || {}), items });
      await ctx.reply(`Added: ${newItem.description} • ${newItem.quantity} × ${newItem.unit_amount}.`, { reply_markup: itemsMenuKeyboard() });
      return;
    }

    // Item add mini-wizard (name -> qty -> price)
    if (st.step === STEP_ITEM_NAME) {
      const desc = text.trim();
      if (!desc) { await ctx.reply("Please enter a non-empty name:"); return; }
      const ni = { description: desc } as any;
      const kb = new InlineKeyboard().text("1", "exp_item_qty:1").text("2", "exp_item_qty:2").text("3", "exp_item_qty:3").row().text("5", "exp_item_qty:5").text("10", "exp_item_qty:10").row().text("Custom", "exp_item_qty:custom");
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEM_QTY as any, { ...(st.data || {}), newItem: ni });
      await ctx.reply("Quantity? (tap a button or type a number, /skip = 1)", { reply_markup: kb });
      return;
    }
    if (st.step === STEP_ITEM_QTY) {
      let qty = 1;
      const low = text.trim().toLowerCase();
      if (low !== "/skip") {
        const n = Number(low);
        if (Number.isFinite(n) && n > 0) qty = Math.floor(n);
        else if (low.startsWith("/")) { /* keep default 1 */ }
        else { await ctx.reply("Please enter a positive integer for quantity or /skip"); return; }
      }
      const ni = { ...((st.data || {}).newItem || {}), quantity: qty } as any;
      const kb = new InlineKeyboard().text("Use remaining", "exp_item_price_remaining").text("Custom", "exp_item_price_custom");
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEM_PRICE as any, { ...(st.data || {}), newItem: ni });
      await ctx.reply(`Unit price for '${ni.description}'?`, { reply_markup: kb });
      return;
    }
    if (st.step === STEP_ITEM_PRICE) {
      let price = 0;
      const low = text.trim().toLowerCase();
      if (low !== "/skip") {
        const n = Number(low);
        if (Number.isFinite(n) && n >= 0) price = Math.round(n * 100) / 100;
        else if (low.startsWith("/")) { /* keep default 0 */ }
        else { await ctx.reply("Please enter a valid number for unit price or /skip"); return; }
      }
      const ni = { ...((st.data || {}).newItem || {}), unit_amount: price } as any;
      const newItem = { description: ni.description || "Item", quantity: Number(ni.quantity || 1), unit_amount: Number(ni.unit_amount || 0), line_total: Number(ni.quantity || 1) * Number(ni.unit_amount || 0) };
      const items = Array.isArray(st.data?.items) ? [...st.data.items, newItem] : [newItem];
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEMS as any, { ...(st.data || {}), items, newItem: null });
      await ctx.reply(`Added: ${newItem.description} • ${newItem.quantity} × ${newItem.unit_amount}.`, { reply_markup: itemsMenuKeyboard() });
      return;
    }

    if (st.step === STEP_ITEM_EDIT) {
      if (text.trim().toLowerCase() === "/skip") {
        await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEMS as any, { ...(st.data || {}), editIndex: null });
        await ctx.reply("Edit cancelled.", { reply_markup: itemsMenuKeyboard() });
        return;
      }
      const items = Array.isArray(st.data?.items) ? st.data.items.slice() : [];
      const idx = typeof st.data?.editIndex === "number" ? st.data.editIndex : -1;
      if (idx < 0 || idx >= items.length) {
        await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEMS as any, { ...(st.data || {}), editIndex: null });
        await ctx.reply("Invalid item index.", { reply_markup: itemsMenuKeyboard() });
        return;
      }
      const existing = items[idx] || {};
      // Parse input similar to add flow
      let name = ""; let qty: number | null = null; let unit: number | null = null;
      if (text.includes("|")) {
        const parts = text.split("|").map(s => s.trim());
        name = parts[0] || existing.description || "Item";
        qty = parts[1] ? Number(parts[1]) : existing.quantity || 1;
        unit = parts[2] ? Number(parts[2]) : existing.unit_amount || 0;
      } else {
        const m = text.match(/^(.*?)(?:\s+(\d+(?:\.\d+)?)\s*[x×@]\s*(\d+(?:\.\d+)?))\s*$/i);
        if (m) {
          name = (m[1] || existing.description || "Item").trim() || existing.description || "Item";
          qty = Number(m[2] || existing.quantity || 1);
          unit = Number(m[3] || existing.unit_amount || 0);
        } else {
          const tokens = text.split(/\s+/);
          const last = tokens[tokens.length - 1];
          const maybePrice = Number(last);
          if (Number.isFinite(maybePrice)) {
            unit = maybePrice;
            name = tokens.slice(0, -1).join(" ").trim() || existing.description || "Item";
            qty = existing.quantity || 1;
          } else if (Number.isFinite(Number(text))) {
            // Just a number -> price only
            unit = Number(text);
            qty = existing.quantity || 1;
            name = existing.description || "Item";
          } else {
            // Only name
            name = text || existing.description || "Item";
            qty = existing.quantity || 1; unit = existing.unit_amount || 0;
          }
        }
      }
      if (!Number.isFinite(qty as number) || !Number.isFinite(unit as number)) { await ctx.reply("Couldn't parse. Try 'Bread 2x45.5' or 'Bread | 2 | 45.50'."); return; }
      const updated = { description: name, quantity: (qty as number) || 1, unit_amount: (unit as number) || 0, line_total: ((qty as number) || 1) * ((unit as number) || 0) };
      items[idx] = updated;
      await saveWizard(chatId, ctx.from?.id ?? null, STEP_ITEMS as any, { ...(st.data || {}), items, editIndex: null });
      await ctx.reply(`Updated #${idx + 1}: ${updated.description} • ${updated.quantity} × ${updated.unit_amount}.`, { reply_markup: itemsMenuKeyboard() });
      return;
    }

    if (st.step === STEP_RECEIPT) {
      if (text.toLowerCase() === "/skip") {
        // Proceed to summary for confirmation
        const items = Array.isArray(st.data?.items) ? st.data.items : [];
        const itemsTotal = items.reduce((s: number, i: any) => s + (Number(i.line_total || ((i.quantity||1)*(i.unit_amount||0))) || 0), 0);
        const diff = (Number(st.data?.amount || 0) - itemsTotal);
        const summary = [
          `Amount: ${st.data?.amount ?? "-"} ${st.data?.currency || "INR"}`,
          `Date: ${st.data?.expenseDate || formatDateInTZ(new Date(), BOT_TIMEZONE)}`,
          st.data?.vendor ? `Vendor: ${st.data.vendor}` : null,
          st.data?.categoryName ? `Category: ${st.data.categoryName}` : null,
          items.length ? `Items: ${items.length} (sum ${itemsTotal.toFixed(2)})` : `Items: none`,
          Math.abs(diff) > 0.01 ? `Warning: items total differs by ${diff.toFixed(2)}` : null,
        ].filter(Boolean).join("\n");
        await saveWizard(chatId, ctx.from?.id ?? null, STEP_SUMMARY as any, { ...(st.data || {}) });
        const kb = new InlineKeyboard().text("Confirm Save", "exp_confirm_save");
        await ctx.reply(`Review and confirm:\n${summary}`, { reply_markup: kb });
        return;
      }
      // If user typed text instead of photo, re-prompt
      await ctx.reply("Please send a photo receipt or /skip");
      return;
    }

    await next();
  });

  // Handle photo upload for receipt
  bot.on("message:photo", async (ctx, next) => {
    const chatId = ctx.chat?.id as number | undefined;
    if (!chatId) return await next();
    const st = await loadWizard(chatId);
    if (!st || (st.step !== STEP_RECEIPT && st.step !== STEP_RECEIPT_WAIT)) return await next();

    try {
      console.log("[expense] photo handler start", { chatId, step: st.step });
      const pid = (st.data || {}).propertyId as string;
      if (!pid) { await ctx.reply("Property not set. Use /switch and try again."); await clearWizard(chatId); return; }
      const sizes = ctx.message?.photo || [];
      const sz = sizes[sizes.length - 1];
      if (!sz) { await ctx.reply("Please send a photo receipt or /skip"); return; }
      console.log("[expense] photo sizes", { count: sizes.length, last: sz ? { width: (sz as any).width, height: (sz as any).height, file_id: (sz as any).file_id } : null });
      const file = await ctx.api.getFile(sz.file_id);
      console.log("[expense] telegram file", { file_path: file.file_path, file_size: (file as any).file_size });
      const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
      if (!token) console.error("[expense] TELEGRAM_BOT_TOKEN not set");
      const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const resp = await fetch(url);
      console.log("[expense] telegram fetch", { status: resp.status, statusText: resp.statusText });
      const buf = new Uint8Array(await resp.arrayBuffer());
      console.log("[expense] photo bytes", { length: buf.length });
      // Build storage path
      const today = formatDateInTZ(new Date(), BOT_TIMEZONE);
      const ym = today.slice(0, 7); // YYYY-MM
      const id = (globalThis.crypto && "randomUUID" in globalThis.crypto) ? (globalThis.crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // Guess extension from Telegram path
      let ext = (file.file_path?.split(".").pop() || "jpg").toLowerCase();
      if (!/^(jpg|jpeg|png|webp)$/.test(ext)) ext = "jpg";
      const objectPath = `${pid}/${ym}/${id}.${ext}`;
      const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      console.log("[expense] upload to storage", { bucket: "receipts", objectPath, contentType });
      const { error } = await supabase.storage.from("receipts").upload(objectPath, buf, { contentType, upsert: false });
      if (error) { console.error("[expense] storage upload error", error); await ctx.reply(`Upload failed: ${error.message}`); return; }

      if (st.step === STEP_RECEIPT) {
        // Manual flow: set path and go to summary
        const nextData = { ...(st.data || {}), receiptPath: objectPath };
        await saveWizard(chatId, ctx.from?.id ?? null, STEP_SUMMARY as any, nextData);
        const items = Array.isArray(nextData.items) ? nextData.items : [];
        const itemsTotal = items.reduce((s: number, i: any) => s + (Number(i.line_total || ((i.quantity||1)*(i.unit_amount||0))) || 0), 0);
        const diff = (Number(nextData.amount || 0) - itemsTotal);
        const summary = [
          `Amount: ${nextData.amount ?? "-"} ${nextData.currency || "INR"}`,
          `Date: ${nextData.expenseDate || formatDateInTZ(new Date(), BOT_TIMEZONE)}`,
          nextData.vendor ? `Vendor: ${nextData.vendor}` : null,
          nextData.categoryName ? `Category: ${nextData.categoryName}` : null,
          items.length ? `Items: ${items.length} (sum ${itemsTotal.toFixed(2)})` : `Items: none`,
          Math.abs(diff) > 0.01 ? `Warning: items total differs by ${diff.toFixed(2)}` : null,
          `Receipt: uploaded ✓`,
        ].filter(Boolean).join("\n");
        const kb = new InlineKeyboard().text("Confirm Save", "exp_confirm_save");
        await ctx.reply(`Review and confirm:\n${summary}`, { reply_markup: kb });
        return;
      }

      // Receipt mode: extract details
      let extracted: any = null;
      try {
        // Load categories from DB for this property (plus global templates)
        let categories: string[] | undefined = undefined;
        try {
          if (supabase) {
            const { data: catRows, error: catErr } = await supabase
              .from("expense_categories")
              .select("name")
              .or(`property_id.eq.${pid},property_id.is.null`)
              .limit(200);
            if (!catErr && Array.isArray(catRows)) {
              categories = Array.from(new Set(catRows.map((r: any) => String(r.name || "").trim()).filter(Boolean)));
            } else if (catErr) {
              console.warn("[expense] categories fetch error", catErr);
            }
          }
        } catch (e) {
          console.warn("[expense] categories fetch exception", e);
        }
        console.log("[expense] categories for extraction", { count: categories?.length || 0, sample: categories ? categories.slice(0, 10) : [] });

        const hints = {
          locale: "en-IN",
          currency: (st.data?.currency || "INR").toUpperCase(),
          categories,
          mimeType: contentType,
        } as any;
        console.log("[expense] extractFromReceipt begin", { objectPath, hints });
        extracted = await extractFromReceipt(buf, hints);
        console.log("[expense] extractFromReceipt done", { amount: extracted?.amount, date: extracted?.expense_date, items: Array.isArray(extracted?.line_items) ? extracted.line_items.length : 0, confidence: extracted?.confidence });
      } catch (e: any) {
        // proceed without extraction
        console.error("[expense] extractFromReceipt error", { message: e?.message, stack: e?.stack });
        await ctx.reply("Uploaded receipt. Failed to extract automatically; please enter amount.");
        await saveWizard(chatId, ctx.from?.id ?? null, STEP_AMOUNT as any, { ...(st.data || {}), receiptPath: objectPath });
        return;
      }

      const nextData = {
        ...(st.data || {}),
        amount: (typeof extracted?.amount === "number" && extracted.amount > 0) ? extracted.amount : (st.data?.amount || null),
        expenseDate: extracted?.expense_date || st.data?.expenseDate || null,
        currency: (extracted?.currency || st.data?.currency || "INR").toUpperCase(),
        vendor: extracted?.vendor || st.data?.vendor || null,
        categoryName: extracted?.category_hint || st.data?.categoryName || null,
        items: Array.isArray(extracted?.line_items) ? extracted.line_items : (Array.isArray(st.data?.items) ? st.data.items : []),
        receiptPath: objectPath,
        extractedConfidence: extracted?.confidence || null,
      };

      if (!nextData.amount) {
        await saveWizard(chatId, ctx.from?.id ?? null, STEP_AMOUNT as any, nextData);
        await ctx.reply("Please enter total amount (e.g., 250.75):");
        return;
      }

      await saveWizard(chatId, ctx.from?.id ?? null, STEP_SUMMARY as any, nextData);
      const items = Array.isArray(nextData.items) ? nextData.items : [];
      const itemsTotal = items.reduce((s: number, i: any) => s + (Number(i.line_total || ((i.quantity||1)*(i.unit_amount||0))) || 0), 0);
      const diff = (Number(nextData.amount || 0) - itemsTotal);
      const summary = [
        `Amount: ${nextData.amount ?? "-"} ${nextData.currency || "INR"}`,
        `Date: ${nextData.expenseDate || formatDateInTZ(new Date(), BOT_TIMEZONE)}`,
        nextData.vendor ? `Vendor: ${nextData.vendor}` : null,
        nextData.categoryName ? `Category: ${nextData.categoryName}` : null,
        items.length ? `Items: ${items.length} (sum ${itemsTotal.toFixed(2)})` : `Items: none`,
        Math.abs(diff) > 0.01 ? `Warning: items total differs by ${diff.toFixed(2)}` : null,
        `Receipt: uploaded ✓ (AI confidence: ${nextData.extractedConfidence ?? "-"})`,
      ].filter(Boolean).join("\n");
      const kb = new InlineKeyboard().text("Confirm Save", "exp_confirm_save");
      await ctx.reply(`Review and confirm:\n${summary}`, { reply_markup: kb });
    } catch (e: any) {
      await ctx.reply(`Failed to process photo. ${e?.message ?? e ?? ""}`.trim());
    }
  });
}
