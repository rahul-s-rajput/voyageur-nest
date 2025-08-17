/// <reference lib="deno.ns" />
// Supabase Edge Function (Deno) to deliver Web Push via VAPID to stored subscriptions
// Deploy: supabase functions deploy send-push --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2.50.0'
import webpush from 'npm:web-push@3.6.7'

// Env
const SUPABASE_URL = Deno.env.get('PROJECT_URL') || Deno.env.get('SB_URL') || Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing PROJECT_URL or SERVICE_ROLE_KEY')
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error('Missing VAPID keys')

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

type PushPayload = {
  propertyId?: string | null
  title: string
  message: string
  data?: any
  tag?: string
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  let body: PushPayload
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { headers: { 'content-type': 'application/json' }, status: 400 })
  }

  const filters: any = {}
  if (body.propertyId) filters.property_id = body.propertyId

  const { data: subs, error } = await supabase
    .from('notification_subscriptions')
    .select('endpoint, keys')
    .match(filters as any)

  if (error) return new Response(JSON.stringify({ error: String(error) }), { headers: { 'content-type': 'application/json' }, status: 500 })

  const payload = JSON.stringify({ title: body.title, message: body.message, data: body.data, tag: body.tag })
  let sent = 0, failed = 0
  const tasks = (subs || []).map(async (row: any) => {
    try {
      await webpush.sendNotification({ endpoint: row.endpoint, keys: row.keys }, payload)
      sent++
    } catch (e) {
      failed++
      // Optionally remove gone subscriptions (410)
      const msg = String(e)
      if (/410|gone/i.test(msg)) {
        try { await supabase.from('notification_subscriptions').delete().eq('endpoint', row.endpoint) } catch {}
      }
    }
  })
  await Promise.allSettled(tasks)

  return new Response(JSON.stringify({ ok: true, sent, failed }), { headers: { 'content-type': 'application/json' } })
}

// Deno serve
// deno-lint-ignore no-explicit-any
(globalThis as any).Deno?.serve?.(handler)



