import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Bot } from "https://deno.land/x/grammy@v1.24.1/mod.ts";

export type ReportDeps = {
  supabase: any | null;
  BOT_TIMEZONE: string;
  formatDateInTZ: (d: Date, tz: string) => string;
  getSelectedPropertyId: (ctx: any) => Promise<string | null>;
};

function parseISODateParts(iso: string): { y: number; m: number; d: number } | null {
  const m = (iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function diffDays(ci: string, co: string): number {
  const a = parseISODateParts(ci);
  const b = parseISODateParts(co);
  if (!a || !b) return 0;
  const da = Date.UTC(a.y, a.m - 1, a.d);
  const db = Date.UTC(b.y, b.m - 1, b.d);
  const ms = Math.max(0, db - da);
  return Math.round(ms / 86400000);
}

function monthWindow(todayIso: string): { start: string; nextMonthStart: string } {
  const p = parseISODateParts(todayIso)!;
  const y = p.y;
  const m = p.m;
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  const nextMonthStart = `${ny}-${String(nm).padStart(2, "0")}-01`;
  return { start, nextMonthStart };
}

export function registerReport(bot: Bot, deps: ReportDeps) {
  const { supabase, BOT_TIMEZONE, formatDateInTZ, getSelectedPropertyId } = deps;

  bot.command("report", async (ctx) => {
    const pid = await getSelectedPropertyId(ctx);
    if (!pid) return;
    if (!supabase) { await ctx.reply("Database not configured."); return; }

    const today = formatDateInTZ(new Date(), BOT_TIMEZONE);
    const { start: monthStart, nextMonthStart } = monthWindow(today);

    try {
      // 1) Rooms count (active)
      let totalRooms = 0;
      try {
        const { data: roomRows, error: roomsErr } = await supabase
          .from("rooms")
          .select("room_number")
          .eq("property_id", pid)
          .eq("is_active", true)
          .limit(1000);
        if (!roomsErr && Array.isArray(roomRows)) totalRooms = roomRows.length;
      } catch (_) {}

      // 2) Occupied rooms today
      let occupiedRooms = 0;
      try {
        const { data: occRows, error: occErr } = await supabase
          .from("bookings")
          .select("room_no, check_in, check_out, cancelled")
          .eq("property_id", pid)
          .eq("cancelled", false)
          .lte("check_in", today)
          .gt("check_out", today);
        if (!occErr && Array.isArray(occRows)) {
          const set = new Set<string>();
          for (const r of occRows) if (r.room_no) set.add(String(r.room_no));
          occupiedRooms = set.size;
        }
      } catch (_) {}

      // 3) This month bookings (for count, revenue, ALOS, unpaid dues)
      const { data: monthRows, error: monthErr } = await supabase
        .from("bookings")
        .select("id, check_in, check_out, total_amount, cancelled, payment_status")
        .eq("property_id", pid)
        .eq("cancelled", false)
        .gte("check_in", monthStart)
        .lt("check_in", nextMonthStart);
      if (monthErr) { await ctx.reply(`Failed to load report: ${monthErr.message}`); return; }
      const rows = Array.isArray(monthRows) ? monthRows : [];

      const bookingsThisMonth = rows.length;
      const revenueThisMonth = rows.reduce((s: number, r: any) => s + (Number(r.total_amount ?? 0) || 0), 0);
      const nightsArr = rows.map((r: any) => diffDays(r.check_in, r.check_out)).filter((n) => Number.isFinite(n) && n > 0);
      const alos = nightsArr.length ? (nightsArr.reduce((a, b) => a + b, 0) / nightsArr.length) : 0;

      // unpaid dues (best-effort: if payment_status exists and equals 'unpaid')
      let unpaid = 0;
      const hasPaymentStatus = rows.some((b: any) => Object.prototype.hasOwnProperty.call(b, "payment_status"));
      if (hasPaymentStatus) {
        unpaid = rows.reduce((sum: number, b: any) => {
          const isUnpaid = String(b.payment_status || "").toLowerCase() === "unpaid";
          const amt = Number(b.total_amount ?? 0) || 0;
          return sum + (isUnpaid ? amt : 0);
        }, 0);
      }

      // Compose message
      const lines: string[] = [];
      lines.push(`📊 Quick Report (${today})`);
      if (totalRooms > 0) {
        const occPct = Math.round((occupiedRooms / totalRooms) * 100);
        lines.push(`🏨 Occupancy today: ${occupiedRooms}/${totalRooms} (${isFinite(occPct) ? occPct : 0}%)`);
      } else {
        lines.push(`🏨 Occupancy today: ${occupiedRooms} rooms (total N/A)`);
      }
      lines.push(`🧾 Bookings this month: ${bookingsThisMonth}`);
      lines.push(`💵 Revenue this month: ${revenueThisMonth.toFixed(2)}`);
      lines.push(`🛏️ ALOS (avg nights): ${alos.toFixed(1)}`);
      if (hasPaymentStatus) lines.push(`❗ Unpaid dues (booked this month): ${unpaid.toFixed(2)}`);

      await ctx.reply(lines.join("\n"));
    } catch (e: any) {
      await ctx.reply(`Failed to generate report. ${e?.message ?? e ?? ""}`.trim());
    }
  });
}
