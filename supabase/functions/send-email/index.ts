// Deno Deploy Edge Function: send email notifications (stub)
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Replace with real email provider integration (e.g., Resend, SendGrid)

export default async (req: Request): Promise<Response> => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Vary': 'Origin'
        }
      });
    }
    const body = await req.json();
    // Log payload for now; integrate provider here
    console.log('send-email payload', body);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
}



