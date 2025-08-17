/// <reference lib="deno.ns" />
// Supabase Edge Function (Deno) to drain email_parse_queue and store AI extractions
// Deploy with: supabase functions deploy parse-email --no-verify-jwt
// Schedule with: supabase functions schedule create parse-email --cron "*/1 * * * *"

import { createClient } from 'npm:@supabase/supabase-js@2.50.0'

// Avoid SUPABASE_* prefixes (CLI blocks them). Use PROJECT_URL and SERVICE_ROLE_KEY instead.
const SUPABASE_URL = Deno.env.get('PROJECT_URL') || Deno.env.get('SB_URL') || Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing PROJECT_URL or SERVICE_ROLE_KEY secrets')
}
if (!GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY secret')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
async function resolvePropertyIdByHint(hint?: string | null): Promise<string | null> {
  if (!hint) return null
  const h = hint.toLowerCase()
  const { data } = await supabase
    .from('properties')
    .select('id,name,address')
  const row = (data || []).find(p =>
    (p.name || '').toLowerCase().includes(h) || (p.address || '').toLowerCase().includes(h)
  )
  return row?.id || null
}

// Fallback: try to resolve property id from arbitrary text (subject + body)
async function resolvePropertyIdFromText(text?: string | null): Promise<string | null> {
  const t = (text || '').toLowerCase()
  if (!t) return null
  const { data } = await supabase
    .from('properties')
    .select('id,name,address')
  const row = (data || []).find(p =>
    (p.name || '').toLowerCase().includes(t) || (p.address || '').toLowerCase().includes(t)
  )
  // Common property name fallbacks
  if (!row) {
    const om = (data || []).find(p => (p.name || '').toLowerCase().includes('old manali') || (p.address || '').toLowerCase().includes('old manali'))
    if (om && /old\s*manali/i.test(t)) return om.id
    const baror = (data || []).find(p => (p.name || '').toLowerCase().includes('baror') || (p.address || '').toLowerCase().includes('baror'))
    if (baror && /baror/i.test(t)) return baror.id
  }
  return row?.id || null
}

async function deliverChannelsIfEnabled(propertyId: string | null, payload: any) {
  try {
    if (!propertyId) return
    const { data: cfg } = await supabase
      .from('notification_configs')
      .select('channels, enabled')
      .eq('property_id', propertyId)
      .eq('type', 'booking_event')
      .maybeSingle()
    if (!cfg || cfg.enabled !== true) return
    const channels = cfg.channels || {}
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
    if (channels.email) {
      await fetch(`${SUPABASE_URL}/functions/v1/send-email`, { method: 'POST', headers, body: JSON.stringify(payload) })
    }
    if (channels.sms) {
      await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, { method: 'POST', headers, body: JSON.stringify(payload) })
    }
  } catch (_) {}
}

async function classifyIsBooking(subject: string, snippet: string, timeoutMs = 2000): Promise<{ booking: boolean; reason?: string }> {
  const { GoogleGenerativeAI } = await import('npm:@google/generative-ai@0.21.0')
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const system = [
    'Binary classifier for PMS booking emails.',
    'Decide if the email is booking-related for a hotel/property management system.',
    'Typical booking signals: OTA names (Booking.com, GoMMT), reservation/booking keywords, booking/reference IDs, dates, guest/room info.',
    'If uncertain or signals absent, answer false (not booking).',
    'Output JSON only: { "booking": true|false, "reason": "..." }'
  ].join('\n')
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: { role: 'system', parts: [{ text: system }] },
    generationConfig: { responseMimeType: 'application/json' }
  })
  const req = model.generateContent({
    contents: [{ role: 'user', parts: [{ text: `EMAIL SUBJECT:\n${subject || ''}\n\nEMAIL SNIPPET:\n${snippet || ''}\n\nReturn JSON only.` }] }]
  })
  try {
    const res = await Promise.race([
      req,
      new Promise((_, reject) => setTimeout(() => reject(new Error('gemini_timeout')), timeoutMs))
    ]) as any
    const text = res.response.text().trim()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      // try to extract JSON
      const m = text.match(/\{[\s\S]*\}$/)
      data = m ? JSON.parse(m[0]) : null
    }
    const booking = !!data && (typeof data.booking === 'boolean' ? data.booking : false)
    const reason = typeof data?.reason === 'string' ? data.reason : undefined
    // Heuristic fallback: if no strong signals, prefer false
    if (!booking) return { booking: false, reason: reason || 'no signals' }
    return { booking: true, reason }
  } catch (_) {
    // Conservative default: not booking when classification fails
    return { booking: false, reason: 'classification_failed' }
  }
}

async function parseWithGemini(subject: string, snippet: string, timeoutMs = 5000) {
  const { GoogleGenerativeAI } = await import('npm:@google/generative-ai@0.21.0')
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const system = [
    'Classify emails for PMS booking relevance. Output only strict JSON. No prose.',
    'Fields:',
    '- event_type: one of new | modified | cancelled | not_booking',
    '- ota_platform: one of booking_com | gommt | other',
    '- booking_reference: string or null',
    '- guest_name: string or null',
    '- room_type: "Standard Room" | "Deluxe Room" | null',
    '- room_no, check_in, check_out, no_of_pax, adult_child, total_amount, currency, payment_status, special_requests, property_hint',
    'Rules:',
    '- Mark not_booking if unrelated to reservations (e.g., greetings, generic offers, newsletters, internal notifications).',
    '- Prefer not_booking when there are no clear booking signals: no dates, no OTA markers, no booking/ref ids, no guest/room info.',
    '- Dates ISO YYYY-MM-DD. no_of_pax = adults + children. adult_child format "A/C"',
  ].join('\n')
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: { role: 'system', parts: [{ text: system }] },
    generationConfig: { responseMimeType: 'application/json' },
  })
  const schema = { type: 'object' }
  const req = model.generateContent({
    contents: [{ role: 'user', parts: [{ text: `EMAIL SUBJECT:\n${subject}\n\nEMAIL SNIPPET:\n${snippet}\n\nReturn JSON only. Schema: ${JSON.stringify(schema)}` }] }]
  })
  const res = await Promise.race([
    req,
    new Promise((_, reject) => setTimeout(() => reject(new Error('gemini_timeout')), timeoutMs))
  ]) as any
  const text = res.response.text().trim()
  const json = extractJson(text)
  const data = JSON.parse(json)
  // Heuristic guardrail: downgrade to not_booking when there are no booking signals
  try {
    const text = `${subject || ''}\n${snippet || ''}`
    const lower = text.toLowerCase()
    const hasOta = /(booking\.com|\bgo-?mmt\b|\bmakemytrip\b|airbnb|agoda|expedia)/i.test(text)
    const hasBookingKeywords = /(\bbooking\b|\breservation\b|\bconfirmation\b|\bref\b\s*[:#]?\s*[a-z0-9\-]+)/i.test(text)
    const hasDates = /(\d{4}-\d{2}-\d{2}).{0,20}(\d{4}-\d{2}-\d{2})|\bcheck[ -]?in\b|\bcheck[ -]?out\b/i.test(text)
    const parsedSignals = [
      !!data?.check_in, !!data?.check_out, !!data?.booking_reference,
      !!data?.guest_name, !!data?.no_of_pax, !!data?.room_type
    ].some(Boolean)
    const clearlyNonBooking = /(\boffer\b|\bpromo\b|newsletter|how are you|^hi\b|^hello\b|greetings|\bupdate\b|\bnews\b)/i.test(lower)
    const looksBooking = hasOta || hasBookingKeywords || hasDates || parsedSignals
    if (!looksBooking || clearlyNonBooking) {
      data.event_type = 'not_booking'
      data.ota_platform = 'other'
      data.confidence = Math.min(Number(data?.confidence ?? 0.4), 0.5)
    }
  } catch {}
  // Fallback extraction of booking_reference from subject
  if (!data.booking_reference) {
    const m = (subject || '').match(/Ref\s*([A-Z0-9\-]+)/i) || (subject || '').match(/reference\s*[:#]?\s*([A-Z0-9\-]+)/i)
    if (m) data.booking_reference = m[1]
  }
  return data
}

function extractJson(raw: string) {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  let t = m ? m[1].trim() : raw.trim()
  if (!t.startsWith('{')) {
    const s = t.indexOf('{'); const e = t.lastIndexOf('}')
    if (s !== -1 && e !== -1 && e > s) t = t.slice(s, e + 1)
  }
  return t
}

export async function drainOnce(limit = 10) {
  const { data: queue } = await supabase
    .from('email_parse_queue')
    .select('id,email_message_id,next_attempt_at')
    .eq('status', 'pending')
    .or('next_attempt_at.is.null,next_attempt_at.lte.' + new Date().toISOString())
    .order('created_at')
    .limit(limit)

  for (const item of queue ?? []) {
    const { id, email_message_id } = item as any
    await supabase.from('email_parse_queue').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', id)
    try {
      const { data: msg } = await supabase
        .from('email_messages')
        .select('id, subject, snippet, body_plain')
        .eq('id', email_message_id)
        .single()
      const subject = msg?.subject || ''
      const content = (msg?.body_plain && msg.body_plain.trim().length > 0)
        ? msg.body_plain
        : (msg?.snippet || '')
      // Sender allow-list and provider routing
      const { data: headersRow } = await supabase
        .from('email_messages')
        .select('sender')
        .eq('id', email_message_id)
        .single()
      const senderHeader = headersRow?.sender || ''
      const lowerSender = senderHeader.toLowerCase()
      const senderAllowed = /<\s*noreply@booking\.com\s*>|noreply@booking\.com|no-reply@goibibo\.com|no-reply@go-mmt\.com/i.test(senderHeader)
      if (!senderAllowed) {
        // Ignore and mark processed to avoid clutter
        await supabase.from('email_messages').update({ processed: true, updated_at: new Date().toISOString() }).eq('id', email_message_id)
        await supabase.from('email_parse_queue').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', id)
        continue
      }
      const isBookingCom = /noreply@booking\.com/i.test(senderHeader)
      // Stage 1: classify quickly (skip for known Booking.com notifications with no details)
      const cls = isBookingCom ? { booking: true, reason: 'booking_com_notification' } : await classifyIsBooking(subject, content, 2000)
      if (!cls.booking) {
        // Record in gmail_seen_messages to block future ingestion and avoid cluttering AI tables
        const { data: msgRow } = await supabase
          .from('email_messages')
          .select('gmail_message_id, subject, received_at')
          .eq('id', email_message_id)
          .single()
        if (msgRow?.gmail_message_id) {
          await supabase
            .from('gmail_seen_messages')
            .upsert({
              gmail_message_id: msgRow.gmail_message_id,
              status: 'ignored',
              reason: cls.reason || 'classifier_not_booking',
              subject: msgRow.subject || null,
              received_at: msgRow.received_at || null,
              updated_at: new Date().toISOString()
            })
        }
        await supabase.from('email_messages').update({ processed: true, updated_at: new Date().toISOString() }).eq('id', email_message_id)
        await supabase.from('email_parse_queue').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', id)
        continue
      }
      // Stage 2: detailed parse
      let parsed: any
      if (isBookingCom) {
        // Booking.com often omits details; treat as notification-only
        // Try to infer event type from subject only and extract ref if present
        let event_type: 'new'|'modified'|'cancelled'|'not_booking' = 'not_booking'
        const lower = `${subject} ${content}`.toLowerCase()
        if (/cancel/.test(lower)) event_type = 'cancelled'
        else if (/modif|amend|change/.test(lower)) event_type = 'modified'
        else if (/confirm|new reservation|new booking/.test(lower)) event_type = 'new'
        const refMatch = subject.match(/(?:Ref|Reference)\s*[:#]?\s*([A-Z0-9\-]+)/i)
        parsed = {
          event_type,
          ota_platform: 'booking_com',
          booking_reference: refMatch ? refMatch[1] : null,
          guest_name: null,
          room_type: null,
          room_no: null,
          check_in: null,
          check_out: null,
          no_of_pax: null,
          adult_child: null,
          total_amount: null,
          currency: null,
          payment_status: null,
          special_requests: null,
          property_hint: null,
          confidence: 0.6,
          reasoning: 'booking.com notification-only'
        }
      } else {
        parsed = await parseWithGemini(subject, content, 5000)
      }
      const extractionStatus: 'auto_imported' | 'needs_review' | 'ignored' =
        (parsed?.event_type === 'not_booking') ? 'ignored' : 'needs_review'
      await supabase.from('email_ai_extractions').insert({
        email_message_id,
        model: GEMINI_MODEL,
        output_json: parsed,
        confidence: parsed?.confidence ?? 0.7,
        reasoning: parsed?.reasoning || null,
        status: extractionStatus
      })
      const preview = {
        event_type: parsed?.event_type || 'new',
        ota_platform: parsed?.ota_platform || 'other',
        guest_name: parsed?.guest_name || null,
        room_type: parsed?.room_type || null,
        check_in: parsed?.check_in || parsed?.check_in_date || null,
        check_out: parsed?.check_out || parsed?.check_out_date || null,
        no_of_pax: parsed?.no_of_pax ?? null,
        adult_child: parsed?.adult_child || null,
        property_hint: parsed?.property_hint || null
      }
      await supabase
        .from('email_preview_cache')
        .upsert({ email_message_id, preview_json: preview, updated_at: new Date().toISOString() })
      if (extractionStatus === 'ignored') {
        try {
          await supabase
            .from('email_messages')
            .update({ processed: true, updated_at: new Date().toISOString() })
            .eq('id', email_message_id)
        } catch {}
      }
      // Emit a booking-related notification immediately after extraction (before approval/import)
      if (parsed?.event_type && parsed.event_type !== 'not_booking') {
        // Resolve property id using hint, else fall back to subject/body text
        let propertyId = await resolvePropertyIdByHint(parsed?.property_hint || null)
        if (!propertyId) {
          const combined = `${subject || ''} ${content || ''}`
          propertyId = await resolvePropertyIdFromText(combined)
        }
        const title = parsed.event_type === 'new' ? 'New booking email detected'
          : parsed.event_type === 'modified' ? 'Booking modification email'
          : 'Booking cancellation email'
        const message = [
          parsed?.guest_name || 'Guest',
          parsed?.check_in && parsed?.check_out ? `${parsed.check_in} → ${parsed.check_out}` : null,
          parsed?.booking_reference ? `Ref ${parsed.booking_reference}` : null
        ].filter(Boolean).join(' • ')
        await supabase.from('notifications').insert({
          property_id: propertyId,
          type: 'booking_event',
          title,
          message,
          priority: parsed.event_type === 'cancelled' ? 'high' : 'medium',
          platform: parsed?.ota_platform || 'other',
          data: { emailMessageId: email_message_id, eventType: parsed.event_type }
        })
        await deliverChannelsIfEnabled(propertyId, {
          propertyId,
          title,
          message,
          priority: parsed.event_type === 'cancelled' ? 'high' : 'medium',
          data: { emailMessageId: email_message_id, eventType: parsed.event_type }
        })
        // Try to deliver Push as well (no-op if no subs)
        try {
          const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
          await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
            method: 'POST', headers, body: JSON.stringify({ propertyId, title, message, data: { emailMessageId: email_message_id, eventType: parsed.event_type } })
          })
        } catch {}
      }
      await supabase.from('email_parse_queue').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', id)
    } catch (e) {
      // Handle timeouts/transient errors with exponential backoff
      const err = String(e)
      const isTimeout = err.includes('gemini_timeout')
      const is429 = /429|rateLimit/i.test(err)
      const is5xx = /\b5\d\d\b/.test(err)
      const transient = isTimeout || is429 || is5xx
      const { data: row } = await supabase
        .from('email_parse_queue')
        .select('attempts')
        .eq('id', id)
        .single()
      const attempts = ((row?.attempts as number | undefined) ?? 0) + 1
      const delaySec = Math.min(2 ** Math.min(attempts, 6), 300) // cap at 5 minutes
      const next = transient ? new Date(Date.now() + delaySec * 1000).toISOString() : null
      await supabase
        .from('email_parse_queue')
        .update({
          status: transient ? 'pending' : 'error',
          attempts,
          last_error: String(e),
          next_attempt_at: next,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    }
  }
}

// Edge function entry
Deno.serve(async (_req) => {
  await drainOnce(1)
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } })
})


