import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Bot } from "https://deno.land/x/grammy@v1.24.1/mod.ts";

export type BookingDeps = {
  supabase: any | null;
  BOT_TIMEZONE: string;
  // utils
  generateCalendarKeyboard: (y: number, m: number, prefix: string) => any[][];
  formatDateInTZ: (d: Date, tz: string) => string;
  parseAdultChild: (v: string) => { adults: number; children: number };
  composeAdultChild: (adults: number, children: number) => string;
  genToken: (len: number) => string;
  // services/state
  getAvailableRooms: (propertyId: string, checkIn: string, checkOut: string, excludeBookingId?: string) => Promise<{ roomNo: string; roomType?: string }[]>;
  getRoomMaxOccupancy: (propertyId: string, roomNo: string) => Promise<number>;
  loadBookingById: (id: string) => Promise<any | null>;
  loadWizard: (chatId: number) => Promise<any | null>;
  saveWizard: (chatId: number, userId: number | null, step: any, data: any) => Promise<void>;
  clearWizard: (chatId: number) => Promise<void>;
  getSelectedPropertyId: (ctx: any) => Promise<string | null>;
  formatBookingSummary: (b: any) => { text: string; keyboard?: any[][] };
};

export function registerBooking(bot: Bot, deps: BookingDeps) {
  const {
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
  } = deps;

  type WizardData = {
    propertyId: string;
    guestName: string;
    roomNo: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    amount: number;
    token?: string;
  };

  // Helper: show booking results
  async function showBookingResults(ctx: any, bookings: any[], _searchType: string) {
    if (!bookings.length) {
      await ctx.editMessageText("No bookings found.", {
        reply_markup: { inline_keyboard: [[{ text: "← Back to Search", callback_data: "booking:search:menu" }]] }
      });
      return;
    }
    if (bookings.length === 1) {
      const { text, keyboard } = formatBookingSummary(bookings[0]);
      await ctx.editMessageText(text, {
        reply_markup: { inline_keyboard: [...(keyboard || []), [{ text: "← Back to Search", callback_data: "booking:search:menu" }]] }
      });
      return;
    }
    const resultButtons = bookings.slice(0, 10).map((booking: any) => ([
      { text: `${booking.guest_name} - Room ${booking.room_no} (${booking.check_in})`, callback_data: `booking:show:${booking.id}` }
    ]));
    resultButtons.push([{ text: "← Back to Search", callback_data: "booking:search:menu" }]);
    const header = bookings.length > 10 ? `Found ${bookings.length} bookings (showing first 10):` : `Found ${bookings.length} bookings:`;
    await ctx.editMessageText(header, { reply_markup: { inline_keyboard: resultButtons } });
  }

  // Modify dates calendar callbacks (mdd_ci| / mdd_co|)
  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery?.data ?? "";
    if (!(data.startsWith("mdd_ci|") || data.startsWith("mdd_co|"))) return await next();

    const [prefixWithId, action, ...params] = data.split(":");
    const [prefixBase, bookingId] = prefixWithId.split("|");
    const isCI = prefixBase === "mdd_ci";
    const isCO = prefixBase === "mdd_co";
    if (!bookingId) return;

    // Swallow non-interactive calendar taps
    if (action === "header" || action === "day_header" || action === "empty") {
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "select") {
      const selectedDate = params[0];
      const b = await loadBookingById(bookingId);
      if (!b) { await ctx.reply("Booking not found."); return; }
      if (isCI) {
        try { await saveWizard(ctx.chat!.id as number, ctx.from?.id ?? null, "checkOutDate" as any, { bookingId, tempCheckIn: selectedDate } as any); } catch (_) {}
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const prefix = `mdd_co|${bookingId}`;
        const calendar = generateCalendarKeyboard(nextDay.getFullYear(), nextDay.getMonth() + 1, prefix);
        try { await ctx.editMessageText(`Check-in: ${selectedDate}\n\nSelect new check-out date:`, { reply_markup: { inline_keyboard: [...calendar, [{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] } }); } catch (_) { try { await ctx.reply(`Check-in: ${selectedDate}\n\nSelect new check-out date:`, { reply_markup: { inline_keyboard: [...calendar, [{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] } }); } catch (_) {} }
      } else if (isCO) {
        const b2 = await loadBookingById(bookingId);
        let newCI = b2?.check_in;
        try {
          const st = await loadWizard(ctx.chat!.id as number);
          const tmp = (st?.data as any) || {};
          if (tmp.bookingId === bookingId && tmp.tempCheckIn) newCI = tmp.tempCheckIn;
        } catch (_) {}
        const newCO = selectedDate;
        if (!newCI || newCO <= newCI) {
          try { await ctx.answerCallbackQuery({ text: "Check-out must be after check-in!", show_alert: true }); } catch (_) {}
          return;
        }
        const avail = await getAvailableRooms(b2!.property_id, newCI, newCO, bookingId);
        const currentRoomAvailable = avail.some((r) => r.roomNo === b2!.room_no);
        if (!currentRoomAvailable) {
          if (!avail.length) {
            try { await ctx.editMessageText(`No rooms available for ${newCI} → ${newCO}`); } catch (_) {}
            try { await ctx.editMessageReplyMarkup({ inline_keyboard: [[{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] }); } catch (_) {}
            return;
          }
          try { await saveWizard(ctx.chat!.id as number, ctx.from?.id ?? null, "checkOutDate" as any, { bookingId, tempCheckIn: newCI, tempCheckOut: newCO } as any); } catch (_) {}
          const rows = avail.map((r) => ([{ text: `Room ${r.roomNo}${r.roomType ? ` (${r.roomType})` : ""}`, callback_data: `bk:set_room_for_dates:${bookingId}:${r.roomNo}` }]));
          rows.push([{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]);
          try { await ctx.editMessageText(`Selected dates not available for current room. Choose a different room:`, { reply_markup: { inline_keyboard: rows } }); } catch (_) { try { await ctx.reply(`Selected dates not available for current room. Choose a different room:`, { reply_markup: { inline_keyboard: rows } }); } catch (_) {} }
          return;
        }
        await supabase!.from('bookings').update({ check_in: newCI, check_out: newCO }).eq('id', bookingId);
        const updated = await loadBookingById(bookingId);
        const { text, keyboard } = formatBookingSummary(updated);
        try { await ctx.editMessageText(text, { reply_markup: { inline_keyboard: keyboard || [] } }); } catch (_) { await ctx.reply(text); }
      }
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "prev" || action === "next") {
      const year = parseInt(params[0]);
      const month = parseInt(params[1]);
      let newYear = year;
      let newMonth = action === "next" ? month + 1 : month - 1;
      if (newMonth > 12) { newMonth = 1; newYear++; }
      if (newMonth < 1) { newMonth = 12; newYear--; }
      const calendar = generateCalendarKeyboard(newYear, newMonth, prefixWithId);
      const backRow = [[{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]];
      const label = isCI ? "Select new check-in date:" : "Select new check-out date:";
      try { await ctx.editMessageText(label, { reply_markup: { inline_keyboard: [...calendar, ...backRow] } }); }
      catch (_) { try { await ctx.reply(label, { reply_markup: { inline_keyboard: [...calendar, ...backRow] } }); } catch (_) {} }
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "today") {
      const today = formatDateInTZ(new Date(), BOT_TIMEZONE);
      if (isCI) {
        const nextDay = new Date(); nextDay.setDate(nextDay.getDate() + 1);
        const prefix = `mdd_co|${bookingId}|${today}`;
        const calendar = generateCalendarKeyboard(nextDay.getFullYear(), nextDay.getMonth() + 1, prefix);
        try { await ctx.editMessageText(`Check-in: ${today}\n\nSelect new check-out date:`, { reply_markup: { inline_keyboard: [...calendar, [{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] } }); } catch (_) { try { await ctx.reply(`Check-in: ${today}\n\nSelect new check-out date:`, { reply_markup: { inline_keyboard: [...calendar, [{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] } }); } catch (_) {} }
      }
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }
  });

  // Check-in/out calendars (wizard)
  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery?.data ?? "";
    if (!(data.startsWith("checkin:") || data.startsWith("checkout:"))) return await next();

    const [prefix, action, ...params] = data.split(":");
    const chatId = ctx.chat?.id as number | undefined;
    if (!chatId) return;
    const state = await loadWizard(chatId);
    if (!state) return;

    // Swallow non-interactive calendar taps
    if (action === "header" || action === "day_header" || action === "empty") {
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "select") {
      const selectedDate = params[0];
      const currentData = { ...state.data } as Partial<WizardData>;
      if (prefix === "checkin") {
        currentData.checkIn = selectedDate;
        await saveWizard(chatId, ctx.from?.id ?? null, "checkOutDate", currentData);
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const calendar = generateCalendarKeyboard(nextDay.getFullYear(), nextDay.getMonth() + 1, 'checkout');
        try { await ctx.editMessageText(`Check-in: ${selectedDate}\n\nSelect check-out date:`, { reply_markup: { inline_keyboard: calendar } }); } catch (_) {}
      } else if (prefix === "checkout") {
        if (selectedDate <= (currentData.checkIn || '')) {
          try { await ctx.answerCallbackQuery({ text: "Check-out must be after check-in!", show_alert: true }); } catch (_) {}
          return;
        }
        currentData.checkOut = selectedDate;
        const availableRooms = await getAvailableRooms(currentData.propertyId || '', currentData.checkIn || '', selectedDate);
        if (availableRooms.length === 0) {
          try { await ctx.editMessageText(`No rooms available for ${currentData.checkIn} → ${selectedDate}`); } catch (_) {}
          await ctx.editMessageReplyMarkup({ inline_keyboard: [[{ text: "Start Over", callback_data: "bk:restart" }]] });
          return;
        }
        await saveWizard(chatId, ctx.from?.id ?? null, "roomNo", currentData);
        const roomButtons = availableRooms.map((room) => ([{ text: `Room ${room.roomNo}${room.roomType ? ` (${room.roomType})` : ''}`, callback_data: `room:select:${room.roomNo}` }]));
        try { await ctx.editMessageText(`Dates: ${currentData.checkIn} → ${selectedDate}\n\nSelect available room:`, { reply_markup: { inline_keyboard: roomButtons } }); } catch (_) {}
      }
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "prev" || action === "next") {
      const year = parseInt(params[0]);
      const month = parseInt(params[1]);
      let newYear = year;
      let newMonth = action === "next" ? month + 1 : month - 1;
      if (newMonth > 12) { newMonth = 1; newYear++; }
      if (newMonth < 1) { newMonth = 12; newYear--; }
      const calendar = generateCalendarKeyboard(newYear, newMonth, prefix);
      const label = prefix === "checkin" ? "Select check-in date:" : prefix === "checkout" ? "Select check-out date:" : "Select date:";
      try { await ctx.editMessageText(label, { reply_markup: { inline_keyboard: calendar } }); }
      catch (_) { try { await ctx.reply(label, { reply_markup: { inline_keyboard: calendar } }); } catch (_) {} }
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "today") {
      const today = formatDateInTZ(new Date(), BOT_TIMEZONE);
      const state2 = await loadWizard(chatId);
      const currentData = { ...(state2?.data || {}) } as Partial<WizardData>;
      if (prefix === "checkin") {
        currentData.checkIn = today;
        await saveWizard(chatId, ctx.from?.id ?? null, "checkOutDate", currentData);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const calendar = generateCalendarKeyboard(tomorrow.getFullYear(), tomorrow.getMonth() + 1, 'checkout');
        try { await ctx.editMessageText(`Check-in: ${today}\n\nSelect check-out date:`, { reply_markup: { inline_keyboard: calendar } }); } catch (_) {}
      }
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }
  });

  // Room selection
  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery?.data ?? "";
    if (!data.startsWith("room:")) return await next();

    const [, action, roomNo] = data.split(":", 3);
    const chatId = ctx.chat?.id as number | undefined;
    if (!chatId) return;
    if (action === "select") {
      const state = await loadWizard(chatId);
      if (!state) return;
      const currentData = { ...state.data, roomNo } as Partial<WizardData>;
      const nextData = { ...currentData, adults: 2, children: 0 } as Partial<WizardData>;
      await saveWizard(chatId, ctx.from?.id ?? null, "adults" as any, nextData);
      const cap = await getRoomMaxOccupancy((nextData.propertyId || '') as string, roomNo);
      const rows: any[][] = [];
      let row: any[] = [];
      for (let a = 1; a <= cap; a++) {
        row.push({ text: String(a), callback_data: `wiz_adults:${a}` });
        if (row.length === 5) { rows.push(row); row = []; }
      }
      if (row.length) rows.push(row);
      rows.push([{ text: "← Back", callback_data: "bk:restart:" }]);
      try { await ctx.editMessageText(`Room ${roomNo} selected\n\nSelect number of adults (max ${cap}):`, { reply_markup: { inline_keyboard: rows } }); } catch (_) { try { await ctx.reply(`Room ${roomNo} selected\n\nSelect number of adults (max ${cap}):`, { reply_markup: { inline_keyboard: rows } }); } catch (_) {} }
    }
    try { await ctx.answerCallbackQuery(); } catch (_) {}
    return;
  });

  // Adults / Children pickers
  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery?.data ?? "";
    if (!data.startsWith("wiz_adults:")) return await next();
    const chatId = ctx.chat?.id as number | undefined; if (!chatId) return;
    const state = await loadWizard(chatId); if (!state) return;
    const selAdults = Number(data.split(":")[1] || 1);
    const d = { ...(state.data as any) } as Partial<WizardData>;
    d.adults = selAdults;
    const cap = await getRoomMaxOccupancy((d.propertyId || '') as string, (d.roomNo || '') as string);
    const maxChildren = Math.max(0, cap - (d.adults || 1));
    await saveWizard(chatId, ctx.from?.id ?? null, "children" as any, d);
    const rows: any[][] = [];
    let row: any[] = [];
    for (let c = 0; c <= Math.min(maxChildren, 10); c++) {
      row.push({ text: String(c), callback_data: `wiz_children:${c}` });
      if (row.length === 5) { rows.push(row); row = []; }
    }
    if (row.length) rows.push(row);
    rows.push([{ text: "← Back", callback_data: "bk:restart:" }]);
    try { await ctx.editMessageText(`Adults: ${selAdults}\n\nSelect number of children (max ${maxChildren}):`, { reply_markup: { inline_keyboard: rows } }); } catch (_) { try { await ctx.reply(`Adults: ${selAdults}\n\nSelect number of children (max ${maxChildren}):`, { reply_markup: { inline_keyboard: rows } }); } catch (_) {} }
    try { await ctx.answerCallbackQuery(); } catch (_) {}
    return;
  });

  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery?.data ?? "";
    if (!data.startsWith("wiz_children:")) return await next();
    const chatId = ctx.chat?.id as number | undefined; if (!chatId) return;
    const state = await loadWizard(chatId); if (!state) return;
    const selChildren = Number(data.split(":")[1] || 0);
    const d = { ...(state.data as any) } as Partial<WizardData>;
    d.children = selChildren;
    await saveWizard(chatId, ctx.from?.id ?? null, "amount" as any, d);
    try { await ctx.editMessageText(`Guests set: Adults ${d.adults ?? 1} / Children ${selChildren}\n\nEnter total amount:`, { reply_markup: { inline_keyboard: [] } }); } catch (_) { try { await ctx.reply(`Guests set: Adults ${d.adults ?? 1} / Children ${selChildren}\n\nEnter total amount:`); } catch (_) {} }
    try { await ctx.answerCallbackQuery(); } catch (_) {}
    return;
  });

  // Booking search menu callbacks
  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery?.data ?? "";
    if (!data.startsWith("booking:search:")) return await next();

    const [, , mode] = data.split(":", 3);
    const chatId = ctx.chat?.id as number | undefined;
    const pid = await getSelectedPropertyId(ctx);
    if (!chatId || !pid) { try { await ctx.answerCallbackQuery({ text: "Select a property first" }); } catch (_) {} return; }

    if (mode === "menu") {
      const searchOptions = [
        [{ text: "🔍 Search by Guest Name", callback_data: "booking:search:name" }],
        [{ text: "📅 Search by Date", callback_data: "booking:search:date" }],
        [{ text: "📋 Recent Bookings (Last 10)", callback_data: "booking:search:recent" }],
      ];
      try { await ctx.editMessageText("How would you like to search for bookings?", { reply_markup: { inline_keyboard: searchOptions } }); } catch (_) {}
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (mode === "name") {
      await saveWizard(chatId, ctx.from?.id ?? null, "guestName" as any, { searchType: "booking_name" } as any);
      try { await ctx.editMessageText("Enter guest name to search:", { reply_markup: { inline_keyboard: [[{ text: "← Back", callback_data: "booking:search:menu" }]] } }); } catch (_) { await ctx.reply("Enter guest name to search:"); }
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (mode === "date") {
      const now = new Date();
      const cal = generateCalendarKeyboard(now.getFullYear(), now.getMonth() + 1, 'booking_date');
      try { await ctx.editMessageText("Select a date:", { reply_markup: { inline_keyboard: [...cal, [{ text: "← Back", callback_data: "booking:search:menu" }]] } }); } catch (_) {}
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (mode === "recent") {
      if (!supabase) { try { await ctx.answerCallbackQuery({ text: "DB not configured", show_alert: true }); } catch (_) {} return; }
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, guest_name, room_no, check_in, check_out, total_amount, status, cancelled")
        .eq("property_id", pid)
        .order('check_in', { ascending: false })
        .limit(10);
      await showBookingResults(ctx, bookings || [], "recent");
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }
  });

  // Booking show
  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery?.data ?? "";
    if (!data.startsWith("booking:show:")) return await next();
    const bookingId = data.split(":")[2];
    const b = await loadBookingById(bookingId);
    if (!b) { try { await ctx.answerCallbackQuery({ text: "Booking not found", show_alert: true }); } catch (_) {} return; }
    const { text, keyboard } = formatBookingSummary(b);
    try { await ctx.editMessageText(text, { reply_markup: { inline_keyboard: [...(keyboard || []), [{ text: "← Back to Search", callback_data: "booking:search:menu" }]] } }); } catch (_) { await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard || [] } as any }); }
    try { await ctx.answerCallbackQuery(); } catch (_) {}
    return;
  });

  // Booking date calendar for search
  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery?.data ?? "";
    if (!data.startsWith("booking_date:")) return await next();

    const [prefix, action, ...params] = data.split(":");
    const chatId = ctx.chat?.id as number | undefined;

    // Swallow non-interactive calendar taps
    if (action === "header" || action === "day_header" || action === "empty") {
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "select") {
      const selectedDate = params[0];
      if (!supabase || !chatId) return;
      const pid = await getSelectedPropertyId(ctx);
      if (!pid) return;
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, guest_name, room_no, check_in, check_out, total_amount, status, cancelled")
        .eq("property_id", pid)
        .or(`check_in.eq.${selectedDate},check_out.eq.${selectedDate}`);
      await showBookingResults(ctx, bookings || [], "date");
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "prev" || action === "next") {
      const year = parseInt(params[0]);
      const month = parseInt(params[1]);
      let newYear = year;
      let newMonth = action === "next" ? month + 1 : month - 1;
      if (newMonth > 12) { newMonth = 1; newYear++; }
      if (newMonth < 1) { newMonth = 12; newYear--; }
      const calendar = generateCalendarKeyboard(newYear, newMonth, 'booking_date');
      const label = "Select a date:";
      try { await ctx.editMessageText(label, { reply_markup: { inline_keyboard: [...calendar, [{ text: "← Back", callback_data: "booking:search:menu" }]] } }); }
      catch (_) { try { await ctx.reply(label, { reply_markup: { inline_keyboard: [...calendar, [{ text: "← Back", callback_data: "booking:search:menu" }]] } }); } catch (_) {} }
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "today") {
      const today = formatDateInTZ(new Date(), BOT_TIMEZONE);
      if (!supabase) return;
      const pid = await getSelectedPropertyId(ctx);
      if (!pid) return;
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, guest_name, room_no, check_in, check_out, total_amount, status, cancelled")
        .eq("property_id", pid)
        .or(`check_in.eq.${today},check_out.eq.${today}`);
      await showBookingResults(ctx, bookings || [], "date");
      try { await ctx.answerCallbackQuery(); } catch (_) {}
    }
    return;
  });

  // Booking callbacks (bk:)
  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery?.data ?? "";
    if (!data.startsWith("bk:")) return await next();

    const parts = data.split(":");
    const action = parts[1];
    const payload = parts.slice(2).join(":");

    try { await ctx.answerCallbackQuery({ text: action === "confirm" ? "Creating booking…" : "Working…" }); } catch (_) {}

    if (action === "confirm") {
      if (!supabase) { await ctx.reply("Database not configured."); return; }
      const chatId = ctx.chat?.id as number | undefined; if (!chatId) return;
      const current = await loadWizard(chatId);
      const wiz = current?.data as WizardData | undefined;
      if (!current || current.step !== "confirm" || !wiz || wiz.token !== payload) { await ctx.reply("Confirmation expired. Please /book again."); return; }
      try {
        const { data: ins, error } = await supabase
          .from("bookings")
          .insert({
            property_id: (wiz as any).propertyId,
            guest_name: (wiz as any).guestName,
            room_no: (wiz as any).roomNo,
            check_in: (wiz as any).checkIn,
            check_out: (wiz as any).checkOut,
            no_of_pax: ((wiz as any).adults ?? 1) + ((wiz as any).children ?? 0),
            adult_child: composeAdultChild((wiz as any).adults ?? 1, (wiz as any).children ?? 0),
            total_amount: (wiz as any).amount,
            status: "confirmed",
            cancelled: false,
            booking_date: formatDateInTZ(new Date(), BOT_TIMEZONE),
            source: "direct",
            source_details: { via: "telegram" },
          })
          .select("id")
          .single();
        if (error || !ins) { await ctx.reply(`Failed to create booking. ${error?.message ?? ""}`.trim()); return; }
        await clearWizard(chatId);
        try { if (ctx.callbackQuery?.message?.reply_markup?.inline_keyboard?.length > 0) { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } } catch (_) {}
        await ctx.reply(`Booking created ✅ ID: ${ins.id}`);
        return;
      } catch (e: any) { await ctx.reply(`Failed to create booking. ${e?.message ?? e ?? ""}`.trim()); return; }
    }

    if (action === "decline") {
      const chatId = ctx.chat?.id as number | undefined; if (chatId) await clearWizard(chatId);
      try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch (_) {}
      await ctx.reply("Booking cancelled.");
      return;
    }

    if (action === "restart") {
      const chatId = ctx.chat?.id as number | undefined; if (chatId) await clearWizard(chatId);
      try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch (_) {}
      await ctx.reply("Booking wizard cancelled. Use /book to start over.");
      return;
    }

    if (action === "cancel") {
      if (!supabase) { await ctx.reply("Database not configured."); return; }
      const bookingId = payload;
      const { error } = await supabase.from('bookings').update({ cancelled: true, updated_at: new Date().toISOString() }).eq('id', bookingId);
      if (error) { await ctx.reply("Failed to cancel booking."); return; }
      await ctx.reply(`Booking ${bookingId} cancelled ✓`);
      return;
    }

    if (action === "modify") {
      const bookingId = payload;
      const b = await loadBookingById(bookingId); if (!b) { await ctx.reply("Booking not found."); return; }
      const menu: any[][] = [
        [{ text: "Dates", callback_data: `bk:modify_dates:${bookingId}` }],
        [{ text: "Room", callback_data: `bk:modify_room:${bookingId}` }],
        [{ text: "Guest name", callback_data: `bk:modify_guest:${bookingId}` }],
        [{ text: "Adults", callback_data: `bk:modify_adults:${bookingId}` }],
        [{ text: "Children", callback_data: `bk:modify_children:${bookingId}` }],
        [{ text: "Amount", callback_data: `bk:modify_amount:${bookingId}` }],
        [{ text: "Notes", callback_data: `bk:modify_notes:${bookingId}` }],
        [{ text: "← Back to Summary", callback_data: `bk:show:${bookingId}` }],
      ];
      try { await ctx.editMessageText("What would you like to modify?", { reply_markup: { inline_keyboard: menu } }); } catch (_) { try { await ctx.reply("What would you like to modify?", { reply_markup: { inline_keyboard: menu } }); } catch (_) {} }
      return;
    }

    if (action === "show") {
      const bookingId = payload;
      const b = await loadBookingById(bookingId); if (!b) { await ctx.reply("Booking not found."); return; }
      const { text, keyboard } = formatBookingSummary(b);
      try { await ctx.editMessageText(text, { reply_markup: { inline_keyboard: keyboard || [] } }); } catch (_) { await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard || [] } as any }); }
      return;
    }

    if (action === "done") {
      // Hide action buttons for the current message
      try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch (_) {}
      try { await ctx.answerCallbackQuery({ text: "Done" }); } catch (_) {}
      return;
    }

    if (action === "modify_dates") {
      const bookingId = payload;
      const b = await loadBookingById(bookingId); if (!b) { await ctx.reply("Booking not found."); return; }
      const ci = new Date(b.check_in);
      const calendar = generateCalendarKeyboard(ci.getFullYear(), ci.getMonth() + 1, `mdd_ci|${bookingId}`);
      try { await ctx.editMessageText(`Current: ${b.check_in} → ${b.check_out}\n\nSelect new check-in date:`, { reply_markup: { inline_keyboard: [...calendar, [{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] } }); } catch (_) { try { await ctx.reply(`Current: ${b.check_in} → ${b.check_out}\n\nSelect new check-in date:`, { reply_markup: { inline_keyboard: [...calendar, [{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] } }); } catch (_) {} }
      return;
    }

    if (action === "modify_room") {
      const bookingId = payload;
      const b = await loadBookingById(bookingId); if (!b) { await ctx.reply("Booking not found."); return; }
      const avail = await getAvailableRooms(b.property_id, b.check_in, b.check_out, bookingId);
      if (!avail.length) {
        try { await ctx.editMessageText(`No alternate rooms available for ${b.check_in} → ${b.check_out}`); } catch (_) {}
        try { await ctx.editMessageReplyMarkup({ inline_keyboard: [[{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] }); } catch (_) {}
        return;
      }
      const rows = avail.map((r) => ([{ text: `Room ${r.roomNo}${r.roomType ? ` (${r.roomType})` : ""}${r.roomNo === b.room_no ? " ✓" : ""}`, callback_data: `bk:set_room:${bookingId}:${r.roomNo}` }]));
      rows.push([{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]);
      try { await ctx.editMessageText(`Select room for ${b.check_in} → ${b.check_out}:`, { reply_markup: { inline_keyboard: rows } }); } catch (_) { try { await ctx.reply(`Select room for ${b.check_in} → ${b.check_out}:`, { reply_markup: { inline_keyboard: rows } }); } catch (_) {} }
      return;
    }

    if (action === "set_room") {
      const [bookingId, roomNo] = (payload || "").split(":");
      const b = await loadBookingById(bookingId);
      if (!b) { await ctx.reply("Booking not found."); try { await ctx.answerCallbackQuery({ text: "Booking not found", show_alert: true }); } catch (_) {} return; }
      const avail = await getAvailableRooms(b.property_id, b.check_in, b.check_out, bookingId);
      if (!avail.some((r) => r.roomNo === roomNo)) { try { await ctx.answerCallbackQuery({ text: "Room not available", show_alert: true }); } catch (_) {} return; }
      const { adults, children } = parseAdultChild(b.adult_child);
      const pax = (Number(b.no_of_pax) || (adults + children));
      const cap = await getRoomMaxOccupancy(b.property_id, roomNo);
      if (pax > cap) { try { await ctx.answerCallbackQuery({ text: `Over capacity for selected room (max ${cap}). Adjust guests first.`, show_alert: true }); } catch (_) {} return; }
      const { error } = await supabase!.from('bookings').update({ room_no: roomNo }).eq('id', bookingId);
      if (error) { try { await ctx.answerCallbackQuery({ text: "Update failed", show_alert: true }); } catch (_) {} return; }
      try { await clearWizard(ctx.chat!.id as number); } catch (_) {}
      const updated = await loadBookingById(bookingId);
      const { text, keyboard } = formatBookingSummary(updated);
      try { await ctx.editMessageText(text, { reply_markup: { inline_keyboard: keyboard || [] } }); } catch (editError) { try { await ctx.editMessageReplyMarkup({ inline_keyboard: [[{ text: "Open updated booking", callback_data: `bk:show:${bookingId}` }]] }); } catch (_) {} try { await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard || [] } as any }); } catch (_) {} }
      try { await ctx.answerCallbackQuery({ text: "Room updated ✓" }); } catch (_) {}
      return;
    }

    if (action === "set_room_for_dates") {
      const [bookingId, roomNo] = (payload || "").split(":");
      const b = await loadBookingById(bookingId);
      if (!b) { await ctx.reply("Booking not found."); return; }
      let newCI = b.check_in;
      let newCO = b.check_out;
      try {
        const st = await loadWizard(ctx.chat!.id as number);
        const tmp = (st?.data as any) || {};
        if (tmp.bookingId === bookingId && tmp.tempCheckIn && tmp.tempCheckOut) {
          newCI = tmp.tempCheckIn; newCO = tmp.tempCheckOut;
        }
      } catch (_) {}
      if (!newCI || !newCO || newCO <= newCI) { try { await ctx.answerCallbackQuery({ text: "Date selection expired. Open Modify → Dates again.", show_alert: true }); } catch (_) {} return; }
      const { adults, children } = parseAdultChild(b.adult_child);
      const pax = (Number(b.no_of_pax) || (adults + children));
      const cap = await getRoomMaxOccupancy(b.property_id, roomNo);
      if (pax > cap) { try { await ctx.answerCallbackQuery({ text: `Over capacity for selected room (max ${cap}). Adjust guests first.`, show_alert: true }); } catch (_) {} return; }
      await supabase!.from('bookings').update({ room_no: roomNo, check_in: newCI, check_out: newCO }).eq('id', bookingId);
      try { await clearWizard(ctx.chat!.id as number); } catch (_) {}
      const updated = await loadBookingById(bookingId);
      const { text, keyboard } = formatBookingSummary(updated);
      try { await ctx.editMessageText(text, { reply_markup: { inline_keyboard: keyboard || [] } }); } catch (_) { try { await ctx.editMessageReplyMarkup({ inline_keyboard: [[{ text: "Open updated booking", callback_data: `bk:show:${bookingId}` }]] }); } catch (_) {} try { await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard || [] } as any }); } catch (_) {} }
      try { await ctx.answerCallbackQuery({ text: "Room + Dates updated ✓" }); } catch (_) {}
      return;
    }

    if (action === "modify_guest") {
      const bookingId = payload;
      await saveWizard(ctx.chat!.id as number, ctx.from?.id ?? null, "modify_guest" as any, { bookingId } as any);
      try { await ctx.editMessageText("Enter new guest name:", { reply_markup: { inline_keyboard: [[{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] } }); } catch (_) { await ctx.reply("Enter new guest name:", { reply_markup: { inline_keyboard: [[{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] } }); }
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "modify_amount") {
      const bookingId = payload;
      await saveWizard(ctx.chat!.id as number, ctx.from?.id ?? null, "modify_amount" as any, { bookingId } as any);
      try { await ctx.editMessageText("Enter new total amount:", { reply_markup: { inline_keyboard: [[{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] } }); } catch (_) { await ctx.reply("Enter new total amount:", { reply_markup: { inline_keyboard: [[{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] } }); }
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "modify_notes") {
      const bookingId = payload;
      await saveWizard(ctx.chat!.id as number, ctx.from?.id ?? null, "modify_notes" as any, { bookingId } as any);
      try { await ctx.editMessageText("Enter notes (special requests):", { reply_markup: { inline_keyboard: [[{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] } }); } catch (_) { await ctx.reply("Enter notes (special requests):", { reply_markup: { inline_keyboard: [[{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]] } }); }
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "modify_adults") {
      const bookingId = payload;
      const b = await loadBookingById(bookingId); if (!b) { await ctx.reply("Booking not found."); return; }
      const { adults, children } = parseAdultChild(b.adult_child);
      const cap = await getRoomMaxOccupancy(b.property_id, b.room_no);
      const rows: any[][] = [];
      let row: any[] = [];
      for (let a = 1; a <= Math.min(cap, 10); a++) {
        row.push({ text: `${a}${a===adults?" ✓":""}`, callback_data: `bk:set_adults:${bookingId}:${a}` });
        if (row.length === 5) { rows.push(row); row = []; }
      }
      if (row.length) rows.push(row);
      rows.push([{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]);
      try { await ctx.editMessageText(`Current: ${adults} adults, ${children} children (Room capacity: ${cap})\n\nSelect number of adults:`, { reply_markup: { inline_keyboard: rows } }); } catch (_) { await ctx.reply(`Select number of adults (current: ${adults}, capacity: ${cap}):`, { reply_markup: { inline_keyboard: rows } }); }
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "set_adults") {
      const [bookingId, aStr] = (payload || "").split(":");
      const newAdults = Number(aStr || 1);
      const b = await loadBookingById(bookingId); if (!b) { await ctx.reply("Booking not found."); return; }
      const { adults: curA, children: curC } = parseAdultChild(b.adult_child);
      const cap = await getRoomMaxOccupancy(b.property_id, b.room_no);
      const maxChildren = Math.max(0, cap - newAdults);
      if (curC > maxChildren) {
        const rows: any[][] = [];
        let row: any[] = [];
        for (let c = 0; c <= Math.min(maxChildren, 10); c++) {
          row.push({ text: String(c), callback_data: `bk:set_children:${bookingId}:${newAdults}:${c}` });
          if (row.length === 5) { rows.push(row); row = []; }
        }
        if (row.length) rows.push(row);
        rows.push([{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]);
        try { await ctx.editMessageText(`Adults set to ${newAdults}. Select children (0-${maxChildren}):`, { reply_markup: { inline_keyboard: rows } }); } catch (_) {}
        return;
      }
      const ac = composeAdultChild(newAdults, curC);
      await supabase!.from('bookings').update({ no_of_pax: newAdults + curC, adult_child: ac }).eq('id', bookingId);
      const updated = await loadBookingById(bookingId);
      const { text, keyboard } = formatBookingSummary(updated);
      try { await ctx.editMessageText(text, { reply_markup: { inline_keyboard: keyboard || [] } }); } catch (_) { await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard || [] } as any }); }
      try { await ctx.answerCallbackQuery({ text: "Adults updated ✓" }); } catch (_) {}
      return;
    }

    if (action === "modify_children") {
      const bookingId = payload;
      const b = await loadBookingById(bookingId); if (!b) { await ctx.reply("Booking not found."); return; }
      const { adults, children } = parseAdultChild(b.adult_child);
      const cap = await getRoomMaxOccupancy(b.property_id, b.room_no);
      const maxChildren = Math.max(0, cap - (adults || 1));
      const rows: any[][] = [];
      let row: any[] = [];
      for (let c = 0; c <= Math.min(maxChildren, 10); c++) {
        row.push({ text: `${c}${c===children?" ✓":""}`, callback_data: `bk:set_children:${bookingId}:${adults}:${c}` });
        if (row.length === 5) { rows.push(row); row = []; }
      }
      if (row.length) rows.push(row);
      rows.push([{ text: "← Back", callback_data: `bk:modify:${bookingId}` }]);
      try { await ctx.editMessageText(`Current: ${adults} adults, ${children} children (Room capacity: ${cap})\n\nSelect number of children (max ${maxChildren}):`, { reply_markup: { inline_keyboard: rows } }); } catch (_) { await ctx.reply(`Select number of children (current: ${children}, max: ${maxChildren}):`, { reply_markup: { inline_keyboard: rows } }); }
      try { await ctx.answerCallbackQuery(); } catch (_) {}
      return;
    }

    if (action === "set_children") {
      const [bookingId, aStr, cStr] = (payload || "").split(":");
      const newAdults = Number(aStr || 1);
      const newChildren = Number(cStr || 0);
      const b = await loadBookingById(bookingId);
      if (!b) { await ctx.reply("Booking not found."); try { await ctx.answerCallbackQuery({ text: "Booking not found", show_alert: true }); } catch (_) {} return; }
      const cap = await getRoomMaxOccupancy(b.property_id, b.room_no);
      if (newAdults + newChildren > cap) { try { await ctx.answerCallbackQuery({ text: `Over capacity (max ${cap})`, show_alert: true }); } catch (_) {} return; }
      const ac = composeAdultChild(newAdults, newChildren);
      const { error } = await supabase!.from('bookings').update({ no_of_pax: newAdults + newChildren, adult_child: ac }).eq('id', bookingId);
      if (error) { try { await ctx.answerCallbackQuery({ text: "Update failed", show_alert: true }); } catch (_) {} return; }
      const updated = await loadBookingById(bookingId);
      const { text, keyboard } = formatBookingSummary(updated);
      try { await ctx.editMessageText(text, { reply_markup: { inline_keyboard: keyboard || [] } }); } catch (_) { await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard || [] } as any }); }
      try { await ctx.answerCallbackQuery({ text: "Children updated ✓" }); } catch (_) {}
      return;
    }
  });

  // Command: /book
  bot.command("book", async (ctx) => {
    if (!supabase) { await ctx.reply("Database not configured. Ask admin to set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."); return; }
    const pid = await getSelectedPropertyId(ctx); if (!pid) return;
    const chatId = ctx.chat?.id as number | undefined; if (!chatId) return;
    try { await clearWizard(chatId); } catch (_) {}
    const uid = ctx.from?.id as number | undefined;
    await saveWizard(chatId, uid ?? null, "guestName", { propertyId: pid });
    await ctx.reply("Guest name?");
  });

  // Wizard steps via plain text
  bot.on("message:text", async (ctx, next) => {
    const chatId = ctx.chat?.id as number | undefined; if (!chatId) return;
    const text = (ctx.message?.text ?? "").trim();
    if (text.startsWith("/")) { return await next(); }
    const state = await loadWizard(chatId);
    if (!state) { return await next(); }

    if (state.step === "guestName") {
      if ((state.data as any)?.searchType === "booking_name") {
        if (text.length < 2) { await ctx.reply("Please enter at least 2 characters to search."); return; }
        if (!supabase) { await ctx.reply("Database not configured."); return; }
        const pid = await getSelectedPropertyId(ctx); if (!pid) return;
        const { data: bookings } = await supabase
          .from("bookings")
          .select("id, guest_name, room_no, check_in, check_out, total_amount, status, cancelled")
          .eq("property_id", pid)
          .ilike("guest_name", `%${text}%`)
          .order("check_in", { ascending: false })
          .limit(20);
        await clearWizard(chatId);
        if (!bookings?.length) {
          await ctx.reply("No bookings found for that guest name.", { reply_markup: { inline_keyboard: [[{ text: "Search Again", callback_data: "booking:search:name" }]] } });
          return;
        }
        if (bookings.length === 1) {
          const { text: summary, keyboard } = formatBookingSummary(bookings[0]);
          await ctx.reply(summary, { reply_markup: { inline_keyboard: [...(keyboard || []), [{ text: "← Back to Search", callback_data: "booking:search:menu" }]] } });
        } else {
          const resultButtons = bookings.slice(0, 10).map((booking: any) => ([{ text: `${booking.guest_name} - Room ${booking.room_no} (${booking.check_in})`, callback_data: `booking:show:${booking.id}` }]));
          resultButtons.push([{ text: "← Back to Search", callback_data: "booking:search:menu" }]);
          const header = bookings.length > 10 ? `Found ${bookings.length} bookings (showing first 10):` : `Found ${bookings.length} bookings:`;
          await ctx.reply(header, { reply_markup: { inline_keyboard: resultButtons } });
        }
        return;
      }
      if (text.length < 2) { await ctx.reply("Please enter a valid guest name (min 2 chars)."); return; }
      const nextData = { ...state.data, guestName: text } as Partial<WizardData>;
      await saveWizard(chatId, ctx.from?.id ?? null, "checkInDate", nextData);
      const now = new Date();
      const calendar = generateCalendarKeyboard(now.getFullYear(), now.getMonth() + 1, 'checkin');
      await ctx.reply("Select check-in date:", { reply_markup: { inline_keyboard: calendar } });
      return;
    }

    if (state.step === "amount") {
      const amt = Number(text.replace(/[\,\s]/g, ""));
      if (!Number.isFinite(amt) || amt <= 0) { await ctx.reply("Amount must be a positive number."); return; }
      const d = { ...(state.data as any), amount: amt } as WizardData;
      const token = genToken(8);
      d.token = token;
      await saveWizard(chatId, ctx.from?.id ?? null, "confirm", d);
      const summary = [
        "Confirm booking:",
        `Guest: ${d.guestName}`,
        `Room: ${d.roomNo}`,
        `Dates: ${d.checkIn} → ${d.checkOut}`,
        `Guests: ${(d.adults ?? 1) + (d.children ?? 0)} (${d.adults ?? 1}/${d.children ?? 0})`,
        `Amount: ${d.amount}`,
      ].join("\n");
      await ctx.reply(summary, { reply_markup: { inline_keyboard: [[{ text: "Confirm", callback_data: `bk:confirm:${token}` }, { text: "Cancel", callback_data: `bk:decline:${token}` }]] } });
      return;
    }

    if (state.step === "modify_guest") {
      const bookingId = (state.data as any)?.bookingId as string | undefined;
      if (!bookingId) { await clearWizard(chatId); await ctx.reply("Session expired. Open modify again."); return; }
      if (text.length < 2) { await ctx.reply("Please enter a valid guest name (min 2 chars).\n← Back: use the inline button in the previous message."); return; }
      await supabase!.from('bookings').update({ guest_name: text }).eq('id', bookingId);
      await clearWizard(chatId);
      const updated = await loadBookingById(bookingId);
      const { text: summary, keyboard } = formatBookingSummary(updated);
      try { await ctx.editMessageText(summary, { reply_markup: { inline_keyboard: keyboard || [] } }); } catch (_) { await ctx.reply(summary, { reply_markup: { inline_keyboard: keyboard || [] } as any }); }
      return;
    }

    if (state.step === "modify_amount") {
      const bookingId = (state.data as any)?.bookingId as string | undefined;
      if (!bookingId) { await clearWizard(chatId); await ctx.reply("Session expired. Open modify again."); return; }
      const amt = Number(text.replace(/[\,\s]/g, ""));
      if (!Number.isFinite(amt) || amt <= 0) { await ctx.reply("Amount must be a positive number."); return; }
      await supabase!.from('bookings').update({ total_amount: amt }).eq('id', bookingId);
      await clearWizard(chatId);
      const updated = await loadBookingById(bookingId);
      const { text: summary, keyboard } = formatBookingSummary(updated);
      try { await ctx.editMessageText(summary, { reply_markup: { inline_keyboard: keyboard || [] } }); } catch (_) { await ctx.reply(summary, { reply_markup: { inline_keyboard: keyboard || [] } as any }); }
      return;
    }

    if (state.step === "modify_notes") {
      const bookingId = (state.data as any)?.bookingId as string | undefined;
      if (!bookingId) { await clearWizard(chatId); await ctx.reply("Session expired. Open modify again."); return; }
      await supabase!.from('bookings').update({ special_requests: text || null }).eq('id', bookingId);
      await clearWizard(chatId);
      const updated = await loadBookingById(bookingId);
      const { text: summary, keyboard } = formatBookingSummary(updated);
      try { await ctx.editMessageText(summary, { reply_markup: { inline_keyboard: keyboard || [] } }); } catch (_) { await ctx.reply(summary, { reply_markup: { inline_keyboard: keyboard || [] } as any }); }
      return;
    }

    return await next();
  });

  // Command: /booking
  bot.command("booking", async (ctx) => {
    if (!supabase) { await ctx.reply("Database not configured."); return; }
    const pid = await getSelectedPropertyId(ctx); if (!pid) return;
    try { await clearWizard(ctx.chat!.id as number); } catch (_) {}
    const searchOptions = [
      [{ text: "🔍 Search by Guest Name", callback_data: "booking:search:name" }],
      [{ text: "📅 Search by Date", callback_data: "booking:search:date" }],
      [{ text: "📋 Recent Bookings (Last 10)", callback_data: "booking:search:recent" }],
    ];
    await ctx.reply("How would you like to search for bookings?", { reply_markup: { inline_keyboard: searchOptions } });
  });
}
