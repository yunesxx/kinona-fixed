// Supabase Edge Function: send-email
// النشر:
//   supabase functions deploy send-email --no-verify-jwt
// السر (لازم تضيفه قبل النشر):
//   supabase secrets set RESEND_KEY=re_xxx FROM_EMAIL=noreply@yourdomain.com
//
// الاستدعاء من الـ frontend:
//   const { data: { session } } = await sb.auth.getSession();
//   await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': `Bearer ${session.access_token}`
//     },
//     body: JSON.stringify({ to, subject, html })
//   });

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_KEY = Deno.env.get("RESEND_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@kinona.app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// أبسط حد ممكن للـ rate limit (per-user): 5 إيميل/ساعة في الذاكرة
const rateLimits = new Map<string, { count: number; reset: number }>();
function checkRate(userId: string): boolean {
  const now = Date.now();
  const r = rateLimits.get(userId);
  if (!r || r.reset < now) {
    rateLimits.set(userId, { count: 1, reset: now + 3600_000 });
    return true;
  }
  if (r.count >= 5) return false;
  r.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // وثّق المستخدم — لا إرسال مجهول
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

  if (!checkRate(user.id)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: corsHeaders });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "bad_json" }), { status: 400, headers: corsHeaders }); }

  const { to, subject, html, text } = body || {};
  if (!to || !subject || (!html && !text)) {
    return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: corsHeaders });
  }

  // ابعت عبر Resend
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, text }),
  });

  const out = await r.text();
  return new Response(out, { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
