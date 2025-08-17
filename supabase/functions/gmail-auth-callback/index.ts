// Exchanges OAuth code for tokens and stores them in gmail_tokens (id=1)
// Configure OAuth client with redirect: .../functions/v1/gmail-auth-callback

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const SUPABASE_URL = Deno.env.get('PROJECT_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function formBody(params: Record<string,string>) {
  return Object.entries(params).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
}

async function exchangeCode(code: string, redirectUri: string) {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  })
  if (!resp.ok) throw new Error(`token exchange failed: ${resp.status}`)
  return await resp.json()
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const redirectUri = `${SUPABASE_URL}/functions/v1/gmail-auth-callback`
    if (!code) return new Response('missing code', { status: 400 })
    const tokens = await exchangeCode(code, redirectUri)
    const expiry = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
    await supabase
      .from('gmail_tokens')
      .upsert({
        id: 1,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_type: tokens.token_type ?? 'Bearer',
        expiry_date: expiry,
        scope: tokens.scope ?? null,
        updated_at: new Date().toISOString()
      })
    return new Response('Gmail tokens saved. You can close this window.')
  } catch (e) {
    return new Response(`Auth error: ${String(e)}`, { status: 500 })
  }
})


