// Utilities for Telegram Bot (grammY) — pure helpers only

// Parse adult_child formatted as "A/C"
export function parseAdultChild(ac: string | null | undefined): { adults: number; children: number } {
  if (!ac || typeof ac !== "string") return { adults: 1, children: 0 };
  const m = ac.match(/^(\d+)\/(\d+)$/);
  if (!m) return { adults: 1, children: 0 };
  return { adults: Number(m[1] || 1), children: Number(m[2] || 0) };
}

export function composeAdultChild(adults: number, children: number): string {
  return `${Math.max(0, adults)}/${Math.max(0, children)}`;
}

// Returns YYYY-MM-DD in provided time zone (default matches existing bot default)
export function formatDateInTZ(date = new Date(), timeZone = "Asia/Kolkata"): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt
    .formatToParts(date)
    .reduce((a, p) => (((a as any)[p.type] = p.value), a), {} as Record<string, string>);
  return `${(parts as any).year}-${(parts as any).month}-${(parts as any).day}`;
}

// Helper to generate calendar inline keyboard for date selection
export function generateCalendarKeyboard(year: number, month: number, prefix: string): any {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const keyboard: any[] = [];
  
  // Header with month/year and navigation
  keyboard.push([{
    text: `${monthNames[month - 1]} ${year}`,
    callback_data: `${prefix}:header:${year}:${month}`
  }]);
  
  keyboard.push([
    { text: '◀️', callback_data: `${prefix}:prev:${year}:${month}` },
    { text: 'Today', callback_data: `${prefix}:today` },
    { text: '▶️', callback_data: `${prefix}:next:${year}:${month}` }
  ]);
  
  // Days of week header
  keyboard.push([
    { text: 'S', callback_data: `${prefix}:day_header` },
    { text: 'M', callback_data: `${prefix}:day_header` },
    { text: 'T', callback_data: `${prefix}:day_header` },
    { text: 'W', callback_data: `${prefix}:day_header` },
    { text: 'T', callback_data: `${prefix}:day_header` },
    { text: 'F', callback_data: `${prefix}:day_header` },
    { text: 'S', callback_data: `${prefix}:day_header` }
  ]);
  
  // Calendar days
  let week: any[] = [];
  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    week.push({ text: ' ', callback_data: `${prefix}:empty` });
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    week.push({ text: String(day), callback_data: `${prefix}:select:${dateStr}` });
    
    if (week.length === 7) {
      keyboard.push([...week]);
      week = [];
    }
  }
  
  // Fill remaining week if needed
  while (week.length > 0 && week.length < 7) {
    week.push({ text: ' ', callback_data: `${prefix}:empty` });
  }
  if (week.length === 7) {
    keyboard.push(week);
  }
  
  return keyboard;
}

export function genToken(len = 12): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Build a human-friendly summary for a booking
export function formatBookingSummary(
  booking: any,
  includeActions = true
): { text: string; keyboard?: any[][] } {
  const ac = parseAdultChild(booking.adult_child);
  const pax = Number(booking.no_of_pax ?? ac.adults + ac.children);
  const summary = [
    `📋 Booking ${booking.id}`,
    `👤 Guest: ${booking.guest_name}`,
    `🏠 Room: ${booking.room_no}`,
    `📅 ${booking.check_in} → ${booking.check_out}`,
    `👨‍👩‍👧 Guests: ${pax} (${ac.adults}/${ac.children})`,
    `📊 Status: ${booking.cancelled ? "❌ Cancelled" : booking.status}`,
  ].join("\n");

  const keyboard = includeActions
    ? [
        [{ text: "Cancel", callback_data: `bk:cancel:${booking.id}` }],
        [{ text: "Modify", callback_data: `bk:modify:${booking.id}` }],
        [{ text: "Done", callback_data: `bk:done:${booking.id}` }],
      ]
    : undefined;

  return { text: summary, keyboard };
}
