import { supabase } from './supabase/index';
import { StorageService } from './storage';

export interface BookingsExportParams {
  propertyId: string;
  propertyName?: string;
  /** Inclusive start date, YYYY-MM-DD */
  start: string;
  /** Inclusive end date, YYYY-MM-DD */
  end: string;
}

const titleCase = (s?: string | null) =>
  (s || '')
    .split('-')
    .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join('-');

const fmtDate = (d?: string | null) => (d ? String(d).slice(0, 10) : '');

const fmtDateTime = (d?: string | null) =>
  d ? String(d).slice(0, 19).replace('T', ' ') : '';

const nights = (ci?: string, co?: string) => {
  if (!ci || !co) return '';
  const a = new Date(ci + 'T00:00:00');
  const b = new Date(co + 'T00:00:00');
  const d = Math.round((b.getTime() - a.getTime()) / 86400000);
  return d > 0 ? d : '';
};

// Extract the object path inside the `id-documents` bucket from a stored URL,
// so we can mint a fresh long-lived signed URL at export time.
const extractIdDocPath = (url: string): string | null => {
  const markers = [
    '/object/sign/id-documents/',
    '/object/public/id-documents/',
    '/id-documents/',
  ];
  for (const m of markers) {
    const i = url.indexOf(m);
    if (i !== -1) {
      const path = url.slice(i + m.length).split('?')[0];
      try {
        return decodeURIComponent(path);
      } catch {
        return path;
      }
    }
  }
  return null;
};

// 1 year — matches the expiry used when photos are uploaded (src/lib/storage.ts).
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const freshSignedUrl = async (stored: string): Promise<string> => {
  const path = extractIdDocPath(stored);
  if (!path) return stored;
  const signed = await StorageService.getSignedUrl(path, ONE_YEAR_SECONDS);
  return signed || stored;
};

/**
 * Export all bookings whose stay overlaps [start, end] for a property to an
 * Excel file, including status, check-in/out flags, whether the digital
 * check-in form was completed, the full check-in form details, and clickable
 * links to each uploaded ID photo. Triggers a browser download.
 *
 * @returns the number of bookings exported.
 */
export async function exportBookingsToExcel({
  propertyId,
  propertyName,
  start,
  end,
}: BookingsExportParams): Promise<number> {
  // Overlap test (check-out is exclusive): check_in <= end AND check_out > start.
  const { data: bookingRows, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('property_id', propertyId)
    .lte('check_in', end)
    .gt('check_out', start)
    .order('check_in', { ascending: true });

  if (error) throw new Error(`Failed to load bookings: ${error.message}`);

  const bookings = bookingRows || [];
  const ids = bookings.map(b => b.id);

  // Bulk-load financials + check-in data to avoid N+1 round-trips.
  const finMap = new Map<string, any>();
  const ciMap = new Map<string, any>();
  if (ids.length) {
    const [finRes, ciRes] = await Promise.all([
      supabase
        .from('booking_financials')
        .select('*')
        .eq('property_id', propertyId)
        .in('booking_id', ids),
      supabase.from('checkin_data').select('*').in('booking_id', ids),
    ]);
    (finRes.data || []).forEach(r => finMap.set(r.booking_id, r));
    // If duplicates somehow exist, keep the first (earliest) one.
    (ciRes.data || []).forEach(r => {
      if (!ciMap.has(r.booking_id)) ciMap.set(r.booking_id, r);
    });
  }

  // Resolve fresh signed URLs for every ID photo, and track the max count so
  // we know how many "ID Photo N" columns to add.
  let maxPhotos = 0;
  const photoUrlsByBooking = new Map<string, string[]>();
  await Promise.all(
    bookings.map(async b => {
      const ci = ciMap.get(b.id);
      const urls: string[] = Array.isArray(ci?.id_photo_urls) ? ci.id_photo_urls : [];
      const signed = await Promise.all(urls.map((u: string) => freshSignedUrl(u)));
      photoUrlsByBooking.set(b.id, signed);
      if (signed.length > maxPhotos) maxPhotos = signed.length;
    })
  );

  const baseHeaders = [
    'Folio No', 'Guest Name', 'Status', 'Cancelled', 'Payment Status',
    'Room No', 'Check-in', 'Check-out', 'Nights', 'Pax',
    'Total Amount', 'Paid', 'Balance Due', 'Source',
    'Contact Phone', 'Contact Email', 'Booking Date',
    'Checked In?', 'Checked Out?', 'Check-in Form Completed?',
    'CI First Name', 'CI Last Name', 'CI Email', 'CI Phone', 'CI Date of Birth',
    'CI Nationality', 'CI ID Type', 'CI ID Number', 'CI Address', 'CI City',
    'CI State', 'CI Country', 'CI Zip', 'CI Emergency Name', 'CI Emergency Phone',
    'CI Emergency Relation', 'CI Purpose', 'CI Arrival', 'CI Departure',
    'CI Guests', 'CI Additional Guests', 'CI Special Requests',
    'CI ID Verification', 'CI Form Completed At',
  ];
  const photoHeaders = Array.from({ length: maxPhotos }, (_, i) => `ID Photo ${i + 1}`);
  const headers = [...baseHeaders, ...photoHeaders];

  const aoa: any[][] = [headers];
  // Photo cells get hyperlinks applied after the sheet is built.
  const photoCells: { r: number; c: number; url: string }[] = [];

  bookings.forEach((b, idx) => {
    const fin = finMap.get(b.id);
    const ci = ciMap.get(b.id);
    const status = String(b.status || '');
    const isCheckedIn = status === 'checked-in' || status === 'checked-out';
    const isCheckedOut = status === 'checked-out';
    const formCompleted = !!ci?.form_completed_at;
    const addlGuests = Array.isArray(ci?.additional_guests)
      ? ci.additional_guests.map((g: any) => g?.name).filter(Boolean).join(', ')
      : '';

    const row: any[] = [
      b.folio_number || '',
      b.guest_name || '',
      titleCase(status),
      b.cancelled ? 'Yes' : 'No',
      titleCase(b.payment_status),
      b.room_no || '',
      fmtDate(b.check_in),
      fmtDate(b.check_out),
      nights(fmtDate(b.check_in), fmtDate(b.check_out)),
      b.no_of_pax ?? '',
      Number(b.total_amount ?? 0),
      fin ? Number(fin.payments_total ?? 0) : '',
      fin ? Number(fin.balance_due ?? 0) : '',
      b.source || '',
      b.contact_phone || '',
      b.contact_email || '',
      fmtDate(b.booking_date),
      isCheckedIn ? 'Yes' : 'No',
      isCheckedOut ? 'Yes' : 'No',
      formCompleted ? 'Yes' : 'No',
      ci?.first_name || '',
      ci?.last_name || '',
      ci?.email || '',
      ci?.phone || '',
      fmtDate(ci?.date_of_birth),
      ci?.nationality || '',
      ci?.id_type || '',
      ci?.id_number || '',
      ci?.address || '',
      ci?.city || '',
      ci?.state || '',
      ci?.country || '',
      ci?.zip_code || '',
      ci?.emergency_contact_name || '',
      ci?.emergency_contact_phone || '',
      ci?.emergency_contact_relation || '',
      ci?.purpose_of_visit || '',
      fmtDate(ci?.arrival_date),
      fmtDate(ci?.departure_date),
      ci?.number_of_guests ?? '',
      addlGuests,
      ci?.special_requests || '',
      ci?.id_verification_status || '',
      fmtDateTime(ci?.form_completed_at),
    ];

    const photos = photoUrlsByBooking.get(b.id) || [];
    const rowIndex = idx + 1; // +1 to account for the header row
    for (let p = 0; p < maxPhotos; p++) {
      const url = photos[p];
      if (url) {
        row.push(`Photo ${p + 1}`);
        photoCells.push({ r: rowIndex, c: baseHeaders.length + p, url });
      } else {
        row.push('');
      }
    }
    aoa.push(row);
  });

  const XLSX = (await import('xlsx-js-style')).default;
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = headers.map(h => ({ wch: Math.min(Math.max(h.length + 2, 12), 40) }));
  (ws as any)['!freeze'] = { xSplit: 0, ySplit: 1 };
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: 0, c: headers.length - 1 },
    }),
  };

  // Header styling
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) {
      (ws[addr] as any).s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1F4E78' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
    }
  }

  // Hyperlinks on photo cells
  for (const { r, c, url } of photoCells) {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (!ws[addr]) ws[addr] = { t: 's', v: 'Photo' } as any;
    (ws[addr] as any).l = { Target: url, Tooltip: 'Open ID photo' };
    (ws[addr] as any).s = { font: { color: { rgb: '0563C1' }, underline: true } };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bookings');

  const safeName = (propertyName || 'bookings').replace(/[^\w-]+/g, '_');
  const filename = `Bookings_${safeName}_${start}_to_${end}.xlsx`;
  XLSX.writeFile(wb, filename, { bookType: 'xlsx', compression: true });

  return bookings.length;
}
