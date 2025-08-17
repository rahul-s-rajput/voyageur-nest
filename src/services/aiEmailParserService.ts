export interface ParsedBookingEmail {
  event_type: 'new' | 'modified' | 'cancelled' | 'not_booking';
  ota_platform: 'booking_com' | 'gommt' | 'other';
  booking_reference?: string;
  guest_name?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  room_type?: string | null;
  room_no?: string | null;
  check_in?: string;
  check_out?: string;
  no_of_pax?: number | null;
  adult_child?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  payment_status?: 'paid' | 'partial' | 'unpaid' | null;
  special_requests?: string | null;
  property_hint?: string | null;
  confidence: number;
  reasoning?: string;
  raw_fields?: Record<string, any>;
}

function toIsoDate(s: string): string | undefined {
  // Accept YYYY-MM-DD or DD/MM/YYYY
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const t1 = s.trim();
  let m = t1.match(ymd);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t1.match(dmy);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return undefined;
}

export class AIEmailParserService {
  /**
   * Heuristic parser (stub) to extract key fields from subject/snippet.
   * Replace with Gemini structured output later.
   */
  static async parse(raw: { subject?: string; body?: string; headers?: Record<string,string>; email_message_id?: string }): Promise<ParsedBookingEmail> {
    const mode = (import.meta.env.VITE_EMAIL_AI_MODE || 'auto').toLowerCase();
    if ((import.meta.env.VITE_EMAIL_AI_DEBUG || '').toString().toLowerCase() === 'true') {
      // eslint-disable-next-line no-console
      console.log('[AIEmailParser] parse() called', { mode, subject: (raw.subject || '').slice(0, 200) });
    }
    // Sender allow-list and provider routing (frontend safety net)
    const sender = (raw.headers?.from || raw.headers?.['from'] || '').toLowerCase();
    const isBookingCom = sender.includes('noreply@booking.com');
    const isGoMMT = sender.includes('no-reply@goibibo.com') || sender.includes('no-reply@go-mmt.com');
    if (!isBookingCom && !isGoMMT) {
      return {
        event_type: 'not_booking', ota_platform: 'other', confidence: 0.4,
        reasoning: 'sender_not_allowed', room_type: null, room_no: null,
        no_of_pax: null, adult_child: null, total_amount: null, currency: null,
        payment_status: null, special_requests: null, property_hint: null,
      } as ParsedBookingEmail;
    }
    if (isBookingCom) {
      // Notification-only path: infer minimal fields
      const subject = raw.subject || '';
      const lower = `${raw.subject || ''} ${raw.body || ''}`.toLowerCase();
      let event_type: ParsedBookingEmail['event_type'] = 'not_booking';
      if (/cancel/.test(lower)) event_type = 'cancelled';
      else if (/modif|amend|change/.test(lower)) event_type = 'modified';
      else if (/confirm|new reservation|new booking/.test(lower)) event_type = 'new';
      const m = subject.match(/(?:Ref|Reference)\s*[:#]?\s*([A-Z0-9\-]+)/i);
      return this.normalize({
        event_type,
        ota_platform: 'booking_com',
        booking_reference: m ? m[1] : null,
        confidence: 0.6,
        reasoning: 'booking.com notification-only',
      });
    }
    if (mode === 'regex') return this.normalize(await this.parseHeuristic(raw));
    if (mode === 'gemini') return this.normalize(await this.parseGeminiWithFallback(raw, false));
    // auto
    return this.normalize(await this.parseGeminiWithFallback(raw, true));
  }

  private static async parseGeminiWithFallback(raw: { subject?: string; body?: string; headers?: Record<string,string>; email_message_id?: string }, allowFallback: boolean): Promise<ParsedBookingEmail> {
    try {
      const parsed = await this.parseGemini(raw);
      if ((import.meta.env.VITE_EMAIL_AI_DEBUG || '').toString().toLowerCase() === 'true') {
        // eslint-disable-next-line no-console
        console.log('[AIEmailParser] Gemini parsed (pre-fallback check):', parsed);
      }
      if (!allowFallback) return parsed;
      if ((parsed.confidence ?? 0) >= 0.8) return parsed;
      // low confidence → fallback
      const heuristic = await this.parseHeuristic(raw);
      if ((import.meta.env.VITE_EMAIL_AI_DEBUG || '').toString().toLowerCase() === 'true') {
        // eslint-disable-next-line no-console
        console.log('[AIEmailParser] Falling back to heuristic due to low confidence', { geminiConfidence: parsed.confidence, heuristicConfidence: heuristic.confidence });
      }
      return (heuristic.confidence ?? 0) > parsed.confidence ? heuristic : parsed;
    } catch (e) {
      if ((import.meta.env.VITE_EMAIL_AI_DEBUG || '').toString().toLowerCase() === 'true') {
        // eslint-disable-next-line no-console
        console.log('[AIEmailParser] Gemini error; falling back to heuristic', e);
      }
      if (!allowFallback) throw e;
      return await this.parseHeuristic(raw);
    }
  }

  // Gemini parsing
  private static async parseGemini(raw: { subject?: string; body?: string; headers?: Record<string,string>; email_message_id?: string }): Promise<ParsedBookingEmail> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
    if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const system = [
      'You extract OTA booking emails into strict JSON. Output only JSON. No prose.',
      'Normalize room_type to one of: "Standard Room", "Deluxe Room".',
      'Normalize ota_platform to one of: booking_com, gommt, other.',
      'Infer event_type: new, modified, cancelled, or not_booking.',
      'Dates must be ISO YYYY-MM-DD. no_of_pax must equal adults + children.',
      'adult_child as "A/C" (e.g., "2/0"). Put 0 when missing.',
    ].join('\n');

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: { role: 'system', parts: [{ text: system }] },
      generationConfig: { responseMimeType: 'application/json' }
    });

    const schema = {
      type: 'object',
      properties: {
        event_type: { type: 'string' },
        ota_platform: { type: 'string' },
        booking_reference: { type: ['string','null'] },
        guest_name: { type: ['string','null'] },
        room_type: { type: ['string','null'] },
        room_no: { type: ['string','null'] },
        check_in: { type: ['string','null'] },
        check_out: { type: ['string','null'] },
        no_of_pax: { type: ['number','null'] },
        adult_child: { type: ['string','null'] },
        total_amount: { type: ['number','null'] },
        currency: { type: ['string','null'] },
        payment_status: { type: ['string','null'] },
        special_requests: { type: ['string','null'] },
        property_hint: { type: ['string','null'] },
        confidence: { type: 'number' },
        reasoning: { type: ['string','null'] },
      },
      required: ['event_type','ota_platform','confidence'],
      additionalProperties: true
    } as const;

    const content = [
      { role: 'user', parts: [{ text: `EMAIL SUBJECT:\n${raw.subject || ''}\n\nEMAIL SNIPPET:\n${raw.body || ''}\n\nReturn valid JSON only (no code fences). Schema: ${JSON.stringify(schema)}` }] }
    ];

    const debug = (import.meta.env.VITE_EMAIL_AI_DEBUG || '').toString().toLowerCase() === 'true';
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[AIEmailParser] Gemini request', {
        model: modelName,
        subjectLen: (raw.subject || '').length,
        bodyLen: (raw.body || '').length,
        subject: (raw.subject || '').slice(0, 500),
        bodySnippet: (raw.body || '').slice(0, 800)
      });
    }

    const result = await model.generateContent({ contents: content });
    const text = result.response.text().trim();
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[AIEmailParser] Gemini raw response text', text);
    }
    let data: any;
    try {
      const jsonText = AIEmailParserService.extractJsonText(text);
      data = JSON.parse(jsonText);
    } catch {
      throw new Error('Gemini returned non-JSON');
    }
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[AIEmailParser] Gemini parsed JSON', data);
    }

    // Post-normalize room type to allowed values
    const rt = (data.room_type || '').toString().toLowerCase();
    if (rt.includes('deluxe')) data.room_type = 'Deluxe Room';
    else if (rt.includes('standard')) data.room_type = 'Standard Room';
    else if (data.room_type) data.room_type = 'Standard Room';

    // Normalize pax from adult_child if needed
    if (data.adult_child && (!data.no_of_pax || data.no_of_pax <= 0)) {
      const m = String(data.adult_child).match(/(\d+)\/(\d+)/);
      if (m) data.no_of_pax = parseInt(m[1],10) + parseInt(m[2],10);
    }

    // Build ParsedBookingEmail
    const parsed: ParsedBookingEmail = {
      event_type: (data.event_type as any) || 'not_booking',
      ota_platform: (data.ota_platform as any) || 'other',
      booking_reference: data.booking_reference || undefined,
      guest_name: data.guest_name || undefined,
      room_type: data.room_type || null,
      room_no: data.room_no || null,
      check_in: data.check_in || undefined,
      check_out: data.check_out || undefined,
      no_of_pax: typeof data.no_of_pax === 'number' ? data.no_of_pax : null,
      adult_child: data.adult_child || null,
      total_amount: typeof data.total_amount === 'number' ? data.total_amount : null,
      currency: data.currency || null,
      payment_status: data.payment_status || null,
      special_requests: data.special_requests || null,
      property_hint: data.property_hint || null,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.7,
      reasoning: data.reasoning || 'gemini'
    };
    // Persist extraction for auditing/preview reuse
    try {
      const { EmailAIExtractionService } = await import('./emailAIExtractionService');
      await EmailAIExtractionService.saveExtraction({
        emailMessageId: raw.email_message_id || '00000000-0000-0000-0000-000000000000',
        model: modelName,
        output: parsed,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        status: parsed.confidence >= 0.8 ? 'needs_review' : 'needs_review'
      });
    } catch (e) {
      // non-fatal
    }
    return parsed;
  }

  private static extractJsonText(raw: string): string {
    if (!raw) return raw;
    // Strip code fences if present
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    let text = fenced ? fenced[1].trim() : raw.trim();
    // If still not starting with '{', attempt to slice from first '{' to last '}'
    if (!text.startsWith('{')) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        text = text.slice(start, end + 1);
      }
    }
    return text;
  }

  // Existing heuristic parser preserved as fallback
  private static async parseHeuristic(raw: { subject?: string; body?: string; headers?: Record<string,string> }): Promise<ParsedBookingEmail> {
    const subject = raw.subject || '';
    const body = raw.body || '';
    const text = `${subject}\n${body}`;
    const lower = text.toLowerCase();

    // Determine platform
    const ota_platform: ParsedBookingEmail['ota_platform'] = /booking\.com/.test(lower)
      ? 'booking_com'
      : /(mmt|makemytrip|go-mmt)/.test(lower) ? 'gommt' : 'other';

    // Booking relevance
    const isBooking = /(booking|reservation|ref)/i.test(text);

    // Extract dates "YYYY-MM-DD to YYYY-MM-DD" or "DD/MM/YYYY to DD/MM/YYYY"
    let check_in: string | undefined;
    let check_out: string | undefined;
    const rangeRegex = /(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\s*(?:to|\-|–)\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i;
    const range = text.match(rangeRegex);
    if (range) {
      check_in = toIsoDate(range[1]);
      check_out = toIsoDate(range[2]);
    }

    // Pax + Adults/Children extraction
    let no_of_pax: number | null = null;
    let adults: number | null = null;
    let children: number | null = null;
    const paxMatch = text.match(/(\d+)\s*pax/i);
    if (paxMatch) no_of_pax = parseInt(paxMatch[1], 10);

    // Patterns like "2 Adults, 1 Child" or "Adults: 2 Children: 1"
    const adultsLabelMatch = text.match(/adults?\s*[:\-]?\s*(\d{1,2})/i) || text.match(/(\d{1,2})\s*adults?/i);
    const childrenLabelMatch = text.match(/child(?:ren)?\s*[:\-]?\s*(\d{1,2})/i) || text.match(/(\d{1,2})\s*child(?:ren)?/i);
    if (adultsLabelMatch) adults = parseInt(adultsLabelMatch[1], 10);
    if (childrenLabelMatch) children = parseInt(childrenLabelMatch[1], 10);

    // Compact forms like "2A+1C", "2A/1C", "2/1", "2-1"
    const compactAC = text.match(/(\d{1,2})\s*(?:a|adult\w*)\s*[+\/\-]\s*(\d{1,2})\s*(?:c|child\w*)/i);
    const compactSlash = text.match(/\b(\d{1,2})\s*[+\/\-]\s*(\d{1,2})\b/);
    if (compactAC) {
      adults = adults ?? parseInt(compactAC[1], 10);
      children = children ?? parseInt(compactAC[2], 10);
    } else if (!adults && !children && compactSlash) {
      // Use only when explicit labels aren't present to avoid collisions with dates
      const a = parseInt(compactSlash[1], 10);
      const c = parseInt(compactSlash[2], 10);
      // Heuristic guard: ensure these are small counts, not day/month from dates
      if (a <= 10 && c <= 10) {
        adults = a;
        children = c;
      }
    }

    // If we have adults/children but no pax or mismatch, normalize pax to sum
    if (adults != null || children != null) {
      const a = adults ?? 0;
      const c = children ?? 0;
      const sum = a + c;
      if (!no_of_pax || no_of_pax !== sum) {
        no_of_pax = sum;
      }
    }

    // If pax present but adults/children missing, assume all adults
    if (no_of_pax != null && (adults == null && children == null)) {
      adults = no_of_pax;
      children = 0;
    }

    // Guest name: e.g., "Guest John Doe" or "Mr John Doe" or "Guest: John Doe"
    let guest_name: string | undefined;
    const guestMatch =
      text.match(/Guest\s*[:\-]?\s*([A-Za-z][A-Za-z\s\.'-]{1,60})(?=[,\.\n]|$)/i) ||
      text.match(/Guest Name\s*[:\-]\s*([A-Za-z][A-Za-z\s\.'-]{1,60})(?=[,\.\n]|$)/i) ||
      text.match(/Mr\.?\s+([A-Za-z][A-Za-z\s\.'-]{1,60})(?=[,\.\n]|$)/i) ||
      text.match(/Ms\.?\s+([A-Za-z][A-Za-z\s\.'-]{1,60})(?=[,\.\n]|$)/i);
    if (guestMatch) guest_name = guestMatch[1].trim();

    // Room type: look for tokens like "Deluxe Room" or "Standard Room"
    let room_type: string | null = null;
    const roomMatch = text.match(/\b(Deluxe|Standard)\s+Room\b/i) || text.match(/\b(Deluxe|Standard)\b/i);
    if (roomMatch) {
      // Normalize to full label
      const token = roomMatch[0].toLowerCase();
      if (/deluxe/.test(token)) room_type = 'Deluxe Room';
      else if (/standard/.test(token)) room_type = 'Standard Room';
    }

    // Property hint from subject/body tokens
    let property_hint: string | null = null;
    const locMatch = text.match(/Old Manali|Baror/i);
    if (locMatch) property_hint = locMatch[0];

    // Booking reference
    const refMatch = text.match(/Ref\s*([A-Z0-9\-]+)/i) || text.match(/Reference\s*[:#]?\s*([A-Z0-9\-]+)/i);
    const booking_reference = refMatch ? refMatch[1] : undefined;

    // Event type heuristic: look for cancelled/modified tokens
    let event_type: ParsedBookingEmail['event_type'] = 'new';
    if (/cancel|cancellation/i.test(text)) event_type = 'cancelled';
    else if (/modify|amend|change/i.test(text)) event_type = 'modified';

    // Confidence
    let confidence = isBooking ? 0.6 : 0.4;
    const reasons: string[] = [];
    if (check_in && check_out) { confidence = Math.max(confidence, 0.85); reasons.push('dates'); }
    if (guest_name) { confidence = Math.max(confidence, 0.8); reasons.push('guest'); }
    if (no_of_pax) { confidence = Math.max(confidence, 0.75); reasons.push('pax'); }

    const adult_child = (adults != null || children != null)
      ? `${adults ?? 0}/${children ?? 0}`
      : null;

    return {
      event_type,
      ota_platform,
      booking_reference,
      guest_name,
      room_type: room_type || null,
      room_no: null,
      check_in,
      check_out,
      no_of_pax,
      adult_child,
      total_amount: null,
      currency: null,
      payment_status: null,
      special_requests: null,
      property_hint,
      confidence,
      reasoning: `Heuristic parse: ${reasons.join(', ')}; pax=${no_of_pax ?? 'n/a'}; adult_child=${adult_child ?? 'n/a'}`,
      raw_fields: { subject: raw.subject, body: raw.body }
    };
  }

  // Public: normalize any AI/output object to ParsedBookingEmail shape
  static normalize(input: any): ParsedBookingEmail {
    const data = input || {};
    const lowerRoom = (data.room_type || data.roomType || '').toString().toLowerCase();
    let room_type: string | null = null;
    if (lowerRoom.includes('deluxe')) room_type = 'Deluxe Room';
    else if (lowerRoom.includes('standard')) room_type = 'Standard Room';

    const check_in = data.check_in || data.checkIn || data.check_in_date || data.checkInDate || undefined;
    const check_out = data.check_out || data.checkOut || data.check_out_date || data.checkOutDate || undefined;
    const room_no = data.room_no || data.roomNo || null;
    let no_of_pax = (typeof data.no_of_pax === 'number') ? data.no_of_pax
      : (typeof data.noOfPax === 'number') ? data.noOfPax
      : null;
    let adult_child: string | null = data.adult_child || data.adultChild || null;
    // Normalize formats like "2A/0C" -> "2/0"
    if (adult_child && /[Aa].*[Cc]/.test(adult_child)) {
      const nums = adult_child.match(/\d+/g);
      if (nums && nums.length >= 2) {
        adult_child = `${nums[0]}/${nums[1]}`;
      }
    }
    const ota_platform = (data.ota_platform || data.otaPlatform || 'other') as ParsedBookingEmail['ota_platform'];
    const event_type = (data.event_type || data.eventType || 'not_booking') as ParsedBookingEmail['event_type'];

    // Guests array support (derive name and A/C counts)
    let guest_name: string | undefined = data.guest_name || data.guestName || undefined;
    if (Array.isArray(data.guests)) {
      // Derive counts when not provided
      if (!adult_child || !no_of_pax) {
        let adults = 0; let children = 0;
        for (const g of data.guests) {
          const role = String(g?.adult_child || g?.role || g?.type || '').toLowerCase();
          if (role.startsWith('c') || role.includes('child')) children++;
          else adults++;
        }
        if (!adult_child) adult_child = `${adults}/${children}`;
        if (!no_of_pax) no_of_pax = adults + children;
      }
      // Derive primary guest name if missing
      if (!guest_name) {
        const named = data.guests.find((g: any) => g?.name && !String(g.name).toLowerCase().includes('unnamed'));
        guest_name = named?.name || data.guests[0]?.name || undefined;
      }
    }

    // If adult_child exists but pax missing, compute
    let pax = no_of_pax;
    if ((!pax || pax <= 0) && adult_child) {
      const m = String(adult_child).match(/(\d+)\/(\d+)/);
      if (m) pax = parseInt(m[1], 10) + parseInt(m[2], 10);
    }

    return {
      event_type,
      ota_platform,
      booking_reference: data.booking_reference || data.bookingReference || data.booking_ref || data.bookingRef || undefined,
      guest_name,
      room_type,
      room_no,
      check_in,
      check_out,
      no_of_pax: pax,
      adult_child,
      total_amount: (typeof data.total_amount === 'number') ? data.total_amount : (typeof data.totalAmount === 'number' ? data.totalAmount : null),
      currency: data.currency || null,
      payment_status: data.payment_status || data.paymentStatus || null,
      special_requests: data.special_requests || data.specialRequests || null,
      property_hint: data.property_hint || data.propertyHint || null,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.7,
      reasoning: data.reasoning || undefined,
      raw_fields: undefined,
    };
  }
}

export default AIEmailParserService; 