/// <reference lib="deno.ns" />
// Polls Gmail history incrementally and inserts new OTA emails into email_messages

import { createClient } from 'npm:@supabase/supabase-js@2.50.0'

const SUPABASE_URL = Deno.env.get('PROJECT_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Allow-list of OTA sender email addresses we care about
const ALLOW_SENDERS = new Set<string>([
  'noreply@booking.com',
  'no-reply@goibibo.com',
  'no-reply@go-mmt.com',
])

async function getTokens() {
  const { data } = await supabase.from('gmail_tokens').select('*').eq('id', 1).single()
  return data
}

async function refreshAccessToken(refresh_token: string) {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token,
    grant_type: 'refresh_token'
  })
  const resp = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body })
  if (!resp.ok) throw new Error(`refresh failed: ${resp.status}`)
  return await resp.json()
}

async function gmailApi(path: string, access_token: string, searchParams: Record<string,string> = {}) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`)
  if (searchParams) for (const [k,v] of Object.entries(searchParams)) url.searchParams.set(k, v)
  const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${access_token}` } })
  if (!resp.ok) {
    let detail = ''
    try {
      detail = await resp.text()
    } catch {}
    throw new Error(`gmail ${path} ${resp.status}${detail ? `: ${detail}` : ''}`)
  }
  return await resp.json()
}

async function getOrRefreshAccessToken() {
  const tokens = await getTokens()
  if (!tokens) throw new Error('no gmail tokens')
  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).getTime() : 0
  if (Date.now() < expiresAt - 60000 && tokens.access_token) return tokens.access_token
  if (!tokens.refresh_token) throw new Error('no refresh_token')
  const ref = await refreshAccessToken(tokens.refresh_token)
  const expiry = ref.expires_in ? new Date(Date.now() + ref.expires_in * 1000).toISOString() : null
  await supabase.from('gmail_tokens').update({ access_token: ref.access_token, expiry_date: expiry, updated_at: new Date().toISOString() }).eq('id', 1)
  return ref.access_token
}

async function ensureLabelId(access_token: string): Promise<string> {
  // Try settings label_id; otherwise look for a label named 'OTA' or fallback to INBOX
  const { data: settings } = await supabase.from('gmail_settings').select('*').eq('id', 1).maybeSingle()
  if (settings?.label_id) return settings.label_id
  const list = await gmailApi('labels', access_token)
  const ota = (list.labels || []).find((l: any) => l.name === 'OTA' || l.name === 'OTA/Booking')
  const labelId = ota?.id || 'INBOX'
  await supabase.from('gmail_settings').upsert({ id: 1, label_id: labelId, updated_at: new Date().toISOString() })
  return labelId
}

function minimalize(msg: any) {
  return {
    gmail_message_id: msg.id,
    thread_id: msg.threadId,
    label_ids: msg.labelIds || [],
    sender: (msg.payload?.headers || []).find((h: any) => h.name === 'From')?.value || null,
    recipient: (msg.payload?.headers || []).find((h: any) => h.name === 'To')?.value || null,
    subject: (msg.payload?.headers || []).find((h: any) => h.name === 'Subject')?.value || '(no subject)',
    received_at: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : null,
    snippet: msg.snippet || null,
    mime_summary: { size: msg.sizeEstimate || 0 },
    body_plain: extractPlainTextFromMessage(msg),
    headers_json: toHeadersObject(msg?.payload?.headers || []),
    raw_source_ref: null
  }
}

function toHeadersObject(headers: Array<{ name: string, value: string }>): Record<string,string> {
  const out: Record<string, string> = {}
  for (const h of headers) {
    const key = String(h.name || '').toLowerCase()
    if (!key) continue
    out[key] = h.value || ''
  }
  return out
}

function extractEmailAddress(fromHeader?: string | null): string | null {
  if (!fromHeader) return null
  // Try angle bracket form: Name <email@domain>
  const m = fromHeader.match(/<([^>]+)>/)
  const addr = (m ? m[1] : fromHeader).trim()
  // Remove surrounding quotes and name parts
  const parts = addr.split(/[\s,]/).filter(Boolean)
  const candidate = parts.find(p => p.includes('@')) || addr
  return candidate.toLowerCase()
}

function decodeBase64Url(data?: string): string {
  if (!data) return ''
  // Gmail returns base64url encoded strings
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  try {
    const bytes = atob(normalized)
    // Convert to UTF-8 string
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new TextDecoder('utf-8').decode(arr)
  } catch {
    return ''
  }
}

function stripHtml(html: string): string {
  // Lightweight HTML to text
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>(\r?\n)?/gi, '\n')
    .replace(/<\/(div|p|h\d|li)>/gi, '\n')
    .replace(/<li>/gi, ' - ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .trim()
}

function extractPlainTextFromMessage(msg: any): string | null {
  try {
    const payload = msg?.payload
    if (!payload) return null
    // Walk parts to find text/plain first
    const queue: any[] = [payload]
    let htmlCandidate: string | null = null
    while (queue.length) {
      const part = queue.shift()
      const mime = String(part?.mimeType || '').toLowerCase()
      if (mime === 'text/plain' && part?.body?.data) {
        const text = decodeBase64Url(part.body.data)
        if (text && text.trim().length > 0) return text.slice(0, 50000)
      }
      if (mime === 'text/html' && part?.body?.data && !htmlCandidate) {
        htmlCandidate = decodeBase64Url(part.body.data)
      }
      const parts = Array.isArray(part?.parts) ? part.parts : []
      for (const child of parts) queue.push(child)
    }
    if (htmlCandidate) {
      return stripHtml(htmlCandidate).slice(0, 50000)
    }
    // Fallback: decode top-level body
    if (payload?.body?.data) return decodeBase64Url(payload.body.data).slice(0, 50000)
    return null
  } catch {
    return null
  }
}

async function pollOnce() {
  const access_token = await getOrRefreshAccessToken()
  const { data: settings } = await supabase.from('gmail_settings').select('*').eq('id', 1).maybeSingle()
  const labelId = await ensureLabelId(access_token)
  let startHistoryId = settings?.start_history_id
  try {
    if (!startHistoryId) {
      const profile = await gmailApi('profile', access_token)
      startHistoryId = String(profile.historyId)
      await supabase.from('gmail_settings').upsert({ id: 1, start_history_id: startHistoryId, updated_at: new Date().toISOString() })
      console.log('[gmail-poll] initialized startHistoryId', startHistoryId, 'labelId', labelId)
      // One-time backfill of recent inbox/label messages so pipeline starts with content
      try {
        const listParams: Record<string,string> = { maxResults: '20', q: 'newer_than:2d' }
        // Prefer labelId if not INBOX; else default inbox
        if (labelId && labelId !== 'INBOX') (listParams as any).labelIds = labelId
        else (listParams as any).labelIds = 'INBOX'
        const messageList = await gmailApi('messages', access_token, listParams)
        const msgs = messageList.messages || []
        console.log('[gmail-poll] backfill candidates', msgs.length)
        let count = 0
        for (const m of msgs) {
          const full = await gmailApi(`messages/${m.id}`, access_token, { format: 'full' })
          const doc = minimalize(full)
          // Sender allow-list filter: skip anything not from our OTAs
          const senderEmail = extractEmailAddress(doc.sender)
          if (!senderEmail || !ALLOW_SENDERS.has(senderEmail)) {
            try {
              await supabase.from('gmail_seen_messages').upsert({
                gmail_message_id: doc.gmail_message_id,
                status: 'ignored',
                reason: 'sender_not_allowed',
                subject: doc.subject || null,
                received_at: doc.received_at || null,
                updated_at: new Date().toISOString(),
              })
            } catch {}
            continue
          }
      await supabase.from('email_messages').upsert({
            gmail_message_id: doc.gmail_message_id,
            thread_id: doc.thread_id,
            label_ids: doc.label_ids,
            sender: doc.sender,
            recipient: doc.recipient,
            subject: doc.subject,
            received_at: doc.received_at,
            snippet: doc.snippet,
            mime_summary: doc.mime_summary,
        body_plain: doc.body_plain,
        headers: doc.headers_json,
            raw_source_ref: doc.raw_source_ref,
            processed: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'gmail_message_id' })
          count++
          if (count <= 5) console.log('[gmail-poll] backfilled', { id: doc.gmail_message_id, subject: doc.subject })
        }
        console.log('[gmail-poll] backfill complete', count)
      } catch (bf) {
        console.warn('[gmail-poll] backfill skipped/failed', String(bf))
      }
      return { initialized: true, startHistoryId, labelId }
    }
    // Collect history pages for INBOX (messageAdded) and for target label (labelAdded)
    const collect = async (params: Record<string,string>) => {
      let pageToken: string | undefined = undefined
      const histories: any[] = []
      let maxId = 0
      do {
        const resp = await gmailApi('history', access_token, { startHistoryId, ...params, ...(pageToken ? { pageToken } : {}) })
        for (const h of resp.history || []) {
          histories.push(h)
          const hid = Number(h.id || 0)
          if (hid > maxId) maxId = hid
        }
        pageToken = resp.nextPageToken
      } while (pageToken)
      return { histories, maxId }
    }

    console.log('[gmail-poll] poll start', { startHistoryId, labelId })
    const inbox = await collect({ historyTypes: 'messageAdded' })
    const labeled = await collect({ historyTypes: 'labelAdded', labelId })
    console.log('[gmail-poll] history pages', { inboxHistories: inbox.histories.length, labeledHistories: labeled.histories.length })

    // Extract messages
    const combined = [...inbox.histories, ...labeled.histories]
    const msgMap: Record<string, any> = {}
    for (const h of combined) {
      for (const m of (h.messages || [])) { if (m?.id) msgMap[m.id] = m }
      for (const ma of (h.messagesAdded || [])) { if (ma?.message?.id) msgMap[ma.message.id] = ma.message }
      for (const la of (h.labelsAdded || [])) { if (la?.message?.id) msgMap[la.message.id] = la.message }
    }
    // Debug counts
    let cMessages = 0, cMsgAdded = 0, cLblAdded = 0
    for (const h of combined) {
      cMessages += (h.messages || []).length
      cMsgAdded += (h.messagesAdded || []).length
      cLblAdded += (h.labelsAdded || []).length
    }
    console.log('[gmail-poll] history breakdown', { messages: cMessages, messagesAdded: cMsgAdded, labelsAdded: cLblAdded })
    const messages = Object.values(msgMap)
    console.log('[gmail-poll] message ids found', messages.length)
    // Fetch minimal messages and upsert into email_messages
    const previewSubjects: string[] = []
    let logged = 0
    let processedCount = 0
    let errorCount = 0
    for (const m of messages) {
      try {
        const full = await gmailApi(`messages/${m.id}`, access_token, { format: 'full' })
        const doc = minimalize(full)
        // Sender allow-list filter: skip anything not from our OTAs
        const senderEmail = extractEmailAddress(doc.sender)
        if (!senderEmail || !ALLOW_SENDERS.has(senderEmail)) {
          if (logged < 10) console.log('[gmail-poll] skipping by sender', { id: doc.gmail_message_id, sender: doc.sender })
          try {
            await supabase.from('gmail_seen_messages').upsert({
              gmail_message_id: doc.gmail_message_id,
              status: 'ignored',
              reason: 'sender_not_allowed',
              subject: doc.subject || null,
              received_at: doc.received_at || null,
              updated_at: new Date().toISOString(),
            })
          } catch {}
          continue
        }
        // Skip if we've already seen and ignored this Gmail message
        const { data: seen } = await supabase
          .from('gmail_seen_messages')
          .select('status')
          .eq('gmail_message_id', doc.gmail_message_id)
          .maybeSingle()
        if (seen?.status === 'ignored') {
          if (logged < 10) console.log('[gmail-poll] skipping ignored gmail_message_id', doc.gmail_message_id)
          continue
        }
        await supabase.from('email_messages').upsert({
          gmail_message_id: doc.gmail_message_id,
          thread_id: doc.thread_id,
          label_ids: doc.label_ids,
          sender: doc.sender,
          recipient: doc.recipient,
          subject: doc.subject,
          received_at: doc.received_at,
          snippet: doc.snippet,
          mime_summary: doc.mime_summary,
        body_plain: doc.body_plain,
        headers: doc.headers_json,
          raw_source_ref: doc.raw_source_ref,
          processed: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'gmail_message_id' })
        processedCount++
        if (previewSubjects.length < 5) previewSubjects.push(`${doc.gmail_message_id}:${doc.subject}`)
        if (logged < 10) {
          console.log('[gmail-poll] upserted', { id: doc.gmail_message_id, subject: doc.subject, received_at: doc.received_at })
          logged++
        }
      } catch (e) {
        const err = String(e)
        // Fallback to METADATA format when token lacks full-content scopes
        if (err.includes('Metadata scope') && err.includes('format FULL')) {
          try {
            const meta = await gmailApi(`messages/${m.id}`, access_token, { format: 'metadata', metadataHeaders: 'From,To,Subject,Date' as any })
            const doc = minimalize(meta)
            const senderEmail = extractEmailAddress(doc.sender)
            if (!senderEmail || !ALLOW_SENDERS.has(senderEmail)) {
              if (logged < 10) console.log('[gmail-poll] skipping by sender(meta)', { id: doc.gmail_message_id, sender: doc.sender })
              try {
                await supabase.from('gmail_seen_messages').upsert({
                  gmail_message_id: doc.gmail_message_id,
                  status: 'ignored',
                  reason: 'sender_not_allowed',
                  subject: doc.subject || null,
                  received_at: doc.received_at || null,
                  updated_at: new Date().toISOString(),
                })
              } catch {}
              continue
            }
            await supabase.from('email_messages').upsert({
              gmail_message_id: doc.gmail_message_id,
              thread_id: doc.thread_id,
              label_ids: doc.label_ids,
              sender: doc.sender,
              recipient: doc.recipient,
              subject: doc.subject,
              received_at: doc.received_at,
              snippet: doc.snippet,
              mime_summary: doc.mime_summary,
              raw_source_ref: doc.raw_source_ref,
              processed: false,
              updated_at: new Date().toISOString()
            }, { onConflict: 'gmail_message_id' })
            processedCount++
            if (previewSubjects.length < 5) previewSubjects.push(`${doc.gmail_message_id}:${doc.subject}`)
            if (logged < 10) console.log('[gmail-poll] upserted (metadata fallback)', { id: doc.gmail_message_id, subject: doc.subject, received_at: doc.received_at })
          } catch (e2) {
            errorCount++
            console.warn('[gmail-poll] metadata fallback failed', { id: m?.id, error: String(e2) })
          }
        } else {
          errorCount++
          console.warn('[gmail-poll] message fetch/upsert failed', { id: m?.id, error: err })
        }
      }
    }
    // Fallback: if we observed history activity but resolved zero message ids, perform a small recency backfill
    if (messages.length === 0 && (inbox.histories.length + labeled.histories.length) > 0) {
      try {
        const listParams: Record<string,string> = { maxResults: '10', q: 'newer_than:1d' }
        ;(listParams as any).labelIds = (labelId && labelId !== 'INBOX') ? labelId : 'INBOX'
        const messageList = await gmailApi('messages', access_token, listParams)
        const fallbackMsgs = messageList.messages || []
        for (const m of fallbackMsgs) {
          const full = await gmailApi(`messages/${m.id}`, access_token, { format: 'full' })
          const doc = minimalize(full)
            const senderEmail = extractEmailAddress(doc.sender)
            if (!senderEmail || !ALLOW_SENDERS.has(senderEmail)) {
              try {
                await supabase.from('gmail_seen_messages').upsert({
                  gmail_message_id: doc.gmail_message_id,
                  status: 'ignored',
                  reason: 'sender_not_allowed',
                  subject: doc.subject || null,
                  received_at: doc.received_at || null,
                  updated_at: new Date().toISOString(),
                })
              } catch {}
              continue
            }
          const { data: seen } = await supabase
            .from('gmail_seen_messages')
            .select('status')
            .eq('gmail_message_id', doc.gmail_message_id)
            .maybeSingle()
          if (seen?.status === 'ignored') continue
          await supabase.from('email_messages').upsert({
            gmail_message_id: doc.gmail_message_id,
            thread_id: doc.thread_id,
            label_ids: doc.label_ids,
            sender: doc.sender,
            recipient: doc.recipient,
            subject: doc.subject,
            received_at: doc.received_at,
            snippet: doc.snippet,
            mime_summary: doc.mime_summary,
            raw_source_ref: doc.raw_source_ref,
            processed: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'gmail_message_id' })
        }
        if (fallbackMsgs.length > 0) console.log('[gmail-poll] fallback backfill inserted', fallbackMsgs.length)
      } catch (e) {
        console.warn('[gmail-poll] fallback backfill failed', String(e))
      }
    }

    // Update start_history_id to the max id we observed (or retain when none)
    const maxObserved = Math.max(inbox.maxId || 0, labeled.maxId || 0)
    if (maxObserved > 0) {
      if (processedCount > 0 && errorCount === 0) {
        await supabase.from('gmail_settings').update({ start_history_id: String(maxObserved), updated_at: new Date().toISOString() }).eq('id', 1)
      } else {
        console.log('[gmail-poll] retaining startHistoryId due to zero processed or errors', { processedCount, errorCount, startHistoryId, maxObserved })
      }
    } else {
      // Important: do NOT advance when no history is returned.
      console.log('[gmail-poll] no new history; retaining startHistoryId', startHistoryId)
    }
    console.log('[gmail-poll] processed messages', processedCount, 'errors', errorCount, 'maxHistoryId', maxObserved, 'samples', previewSubjects)
    return { processed: processedCount, errors: errorCount, maxHistoryId: maxObserved, samples: previewSubjects }
  } catch (e) {
    // Handle 404 startHistoryId too old: reset to current profile.historyId
    if (String(e).includes('404')) {
      try {
        const access_token2 = await getOrRefreshAccessToken()
        const profile = await gmailApi('profile', access_token2)
        await supabase.from('gmail_settings').update({ start_history_id: String(profile.historyId), updated_at: new Date().toISOString() }).eq('id', 1)
        console.warn('[gmail-poll] reset startHistoryId after 404 to', profile.historyId)
        return { reset: true, startHistoryId: profile.historyId }
      } catch {}
    }
    console.error('[gmail-poll] error', String(e))
    return { error: String(e) }
  }
}

Deno.serve(async (_req) => {
  const res = await pollOnce()
  return new Response(JSON.stringify(res), { headers: { 'content-type': 'application/json' } })
})


