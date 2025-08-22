import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Bot } from "https://deno.land/x/grammy@v1.24.1/mod.ts";

export type TodayDeps = {
  supabase: any | null;
  BOT_TIMEZONE: string;
  formatDateInTZ: (d: Date, tz: string) => string;
  getSelectedPropertyId: (ctx: any) => Promise<string | null>;
};

export function registerTodayOps(bot: Bot, deps: TodayDeps) {
  const { supabase, BOT_TIMEZONE, formatDateInTZ, getSelectedPropertyId } = deps;

  bot.command("today", async (ctx) => {
    const pid = await getSelectedPropertyId(ctx);
    if (!pid) return;
    if (!supabase) { await ctx.reply("Database not configured."); return; }

    const today = formatDateInTZ(new Date(), BOT_TIMEZONE);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, room_no, guest_name, check_in, check_out, total_amount, payment_status")
        .eq("property_id", pid)
        .or(`check_in.eq.${today},check_out.eq.${today}`);
      if (error) { await ctx.reply(`Failed to load today's operations: ${error.message}`); return; }

      const rows = data || [];
      const checkIns = rows.filter((b: any) => b.check_in === today).length;
      const checkOuts = rows.filter((b: any) => b.check_out === today).length;

      // Amount due: only if a recognizable payment status field exists
      let amountDueText = "N/A";
      const hasPaymentStatus = rows.some((b: any) => Object.prototype.hasOwnProperty.call(b, "payment_status"));
      if (hasPaymentStatus) {
        const due = rows.reduce((sum: number, b: any) => {
          const isToday = b.check_in === today || b.check_out === today;
          const unpaid = (b.payment_status === "unpaid");
          const amt = Number(b.total_amount ?? 0) || 0;
          return sum + (isToday && unpaid ? amt : 0);
        }, 0);
        amountDueText = String(due.toFixed(2));
      }

      const lines = [
        `📆 Today ${today}`,
        `✅ Check-ins: ${checkIns}`,
        `🚪 Check-outs: ${checkOuts}`,
        `💰 Amount due: ${amountDueText}`,
      ];

      // Compact per-room lists (show up to 6 each)
      const MAX_LINES = 6;
      const fmtLine = (b: any): string => {
        let base = `• ${b.room_no ?? "—"}`;
        if (b.guest_name) base += ` — ${b.guest_name}`;
        if (hasPaymentStatus && b.payment_status === "unpaid") {
          const amt = Number(b.total_amount ?? 0) || 0;
          if (amt > 0) base += ` (due ${amt.toFixed(2)})`;
        }
        return base;
      };

      const ins = rows.filter((b: any) => b.check_in === today);
      if (ins.length) {
        lines.push("", "🛎️ In:");
        const insLines = ins.slice(0, MAX_LINES).map(fmtLine);
        lines.push(...insLines);
        if (ins.length > MAX_LINES) lines.push(`… +${ins.length - MAX_LINES} more`);
      }

      const outs = rows.filter((b: any) => b.check_out === today);
      if (outs.length) {
        lines.push("", "🏁 Out:");
        const outLines = outs.slice(0, MAX_LINES).map(fmtLine);
        lines.push(...outLines);
        if (outs.length > MAX_LINES) lines.push(`… +${outs.length - MAX_LINES} more`);
      }

      await ctx.reply(lines.join("\n"));
    } catch (e: any) {
      await ctx.reply(`Failed to fetch today's operations. ${e?.message ?? e ?? ""}`.trim());
    }
  });
}
