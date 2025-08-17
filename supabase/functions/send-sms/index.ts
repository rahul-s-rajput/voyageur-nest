// Deno Deploy Edge Function: send SMS notifications (stub)
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

export default async (req: Request): Promise<Response> => {
  try {
    const body = await req.json();
    console.log('send-sms payload', body);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}



