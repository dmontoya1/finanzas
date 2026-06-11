// Supabase Edge Function: applepay-webhook
// Recibe el POST del Atajo de iOS (trigger "Transacción" de Apple Wallet)
// y registra el gasto como 'pending_review' con categorización por reglas.
//
// Deploy:  supabase functions deploy applepay-webhook --no-verify-jwt
//
// El atajo envía:
//   POST https://TU-PROYECTO.supabase.co/functions/v1/applepay-webhook
//   Headers: x-webhook-secret: <households.webhook_secret>
//   Body JSON: { "amount": "12,34 €", "merchant": "MERCADONA", "card": "Visa" }

import { createClient } from "npm:@supabase/supabase-js@2";

const FALLBACK_RATE = 4600; // COP por EUR si la API de tasas falla

/** Parsea montos como "12,34 €", "€12.34", "45.000 COP", "1.234,56" */
function parseAmount(raw: string): { amount: number; currency: "EUR" | "COP" | null } {
  const currency = /€|eur/i.test(raw) ? "EUR" : /cop|\$/i.test(raw) ? "COP" : null;
  let s = raw.replace(/[^\d.,-]/g, "");
  // Si el último separador es coma -> formato europeo (1.234,56)
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  return { amount: Math.abs(parseFloat(s)), currency };
}

async function getEurCopRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/EUR");
    const data = await res.json();
    return data?.rates?.COP ?? FALLBACK_RATE;
  } catch {
    return FALLBACK_RATE;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = req.headers.get("x-webhook-secret");
  if (!secret) return new Response("Missing secret", { status: 401 });

  // Service role: la función valida el secreto por sí misma (RLS no aplica aquí)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: household } = await supabase
    .from("households")
    .select("id")
    .eq("webhook_secret", secret)
    .single();
  if (!household) return new Response("Invalid secret", { status: 401 });

  let body: { amount?: string; merchant?: string; card?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { amount, currency } = parseAmount(String(body.amount ?? ""));
  if (!amount || Number.isNaN(amount)) {
    return new Response("Invalid amount", { status: 400 });
  }

  const merchant = (body.merchant ?? "").trim();
  const fxRate = await getEurCopRate();

  // Categorización automática por reglas de comercio
  let categoryId: string | null = null;
  let status: "confirmed" | "pending_review" = "pending_review";
  if (merchant) {
    const { data: rules } = await supabase
      .from("merchant_rules")
      .select("pattern, category_id")
      .eq("household_id", household.id);
    const match = rules?.find((r) =>
      merchant.toLowerCase().includes(r.pattern.toLowerCase())
    );
    if (match) {
      categoryId = match.category_id;
      status = "confirmed";
    }
  }

  const { error } = await supabase.from("transactions").insert({
    household_id: household.id,
    type: "expense",
    status,
    amount,
    // Vives en España: si el atajo no detecta moneda, EUR es el default sensato
    currency: currency ?? "EUR",
    fx_rate: fxRate,
    category_id: categoryId,
    merchant,
    description: body.card ? `Apple Pay · ${body.card}` : "Apple Pay",
    source: "apple_pay",
    occurred_at: new Date().toISOString().slice(0, 10),
  });

  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ ok: true, categorized: status === "confirmed" });
});
